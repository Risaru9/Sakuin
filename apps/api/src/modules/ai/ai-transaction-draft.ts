import { prisma } from "../../db/prisma.js";
import type { AiTransactionDraft } from "./ai.types.js";

type TransactionType = "INCOME" | "EXPENSE";

type DraftCategory = {
  id: string;
  name: string;
  type: TransactionType;
  isDefault: boolean;
  userId: string | null;
};

type MoneyCandidate = {
  raw: string;
  value: number;
  index: number;
};

type BuildTransactionDraftInput = {
  userId: string;
  message: string;
};

const INCOME_KEYWORDS = [
  "dikasih",
  "di kasih",
  "diberi",
  "di beri",
  "dapat uang",
  "dapet uang",
  "terima uang",
  "menerima uang",
  "gaji",
  "bonus",
  "honor",
  "fee",
  "pemasukan",
  "uang masuk",
  "income",
  "masuk"
];

const EXPENSE_KEYWORDS = [
  "catat",
  "beli",
  "membeli",
  "bayar",
  "makan",
  "minum",
  "jajan",
  "belanja",
  "bensin",
  "transport",
  "ojek",
  "grab",
  "gojek",
  "kos",
  "kontrakan",
  "listrik",
  "air",
  "internet",
  "pulsa",
  "paket data",
  "tagihan",
  "utang",
  "cicilan",
  "pengeluaran",
  "expense",
  "keluar"
];

const CATEGORY_ALIASES: Record<string, string[]> = {
  makanan: [
    "makan",
    "makanan",
    "ayam",
    "geprek",
    "nasi",
    "mie",
    "bakso",
    "seblak",
    "kopi",
    "coffee",
    "minum",
    "jajan"
  ],
  transportasi: [
    "transport",
    "transportasi",
    "bensin",
    "bbm",
    "ojek",
    "gojek",
    "grab",
    "parkir",
    "tol"
  ],
  belanja: ["belanja", "shopping", "alfamart", "indomaret", "market"],
  tagihan: ["tagihan", "listrik", "air", "internet", "wifi", "pulsa", "paket data"],
  kos: ["kos", "kost", "kontrakan", "sewa"],
  gaji: ["gaji", "salary", "upah"],
  bonus: ["bonus", "thr", "insentif"],
  hadiah: ["dikasih", "di kasih", "hadiah", "gift", "diberi", "di beri"],
  pemasukan: ["pemasukan", "income", "uang masuk", "terima uang", "dapat uang", "dapet uang"]
};

const DATE_KEYWORDS = [
  "hari ini",
  "tadi",
  "tadi pagi",
  "tadi siang",
  "tadi sore",
  "tadi malam",
  "kemarin",
  "kemaren"
];

function normalizeText(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

function includesAnyKeyword(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseMoneyNumber(rawNumber: string, unit: string | undefined) {
  const normalizedNumber = Number(rawNumber.replace(/\./g, "").replace(",", "."));

  if (Number.isNaN(normalizedNumber)) {
    return null;
  }

  const normalizedUnit = unit?.toLowerCase();

  if (normalizedUnit === "miliar") {
    return normalizedNumber * 1_000_000_000;
  }

  if (
    normalizedUnit === "juta" ||
    normalizedUnit === "jt" ||
    normalizedUnit === "m"
  ) {
    return normalizedNumber * 1_000_000;
  }

  if (
    normalizedUnit === "ribu" ||
    normalizedUnit === "rb" ||
    normalizedUnit === "k"
  ) {
    return normalizedNumber * 1_000;
  }

  return normalizedNumber;
}

function extractMoneyCandidates(message: string): MoneyCandidate[] {
  const pattern =
    /\b(rp\s*)?(\d+(?:[.,]\d{1,3})*)\s*(miliar|juta|jt|ribu|rb|k|m)?\b/gi;

  const candidates: MoneyCandidate[] = [];

  for (const match of message.matchAll(pattern)) {
    const raw = match[0];
    const hasRp = Boolean(match[1]);
    const numberPart = match[2];
    const unit = match[3];
    const index = match.index ?? 0;

    const before = message.slice(Math.max(0, index - 12), index);
    const after = message.slice(index + raw.length, index + raw.length + 12);

    if (/tanggal\s*$/i.test(before)) {
      continue;
    }

    if (/^\s*(bulan|bln|tahun|thn)/i.test(after)) {
      continue;
    }

    const value = parseMoneyNumber(numberPart, unit);

    if (value === null) {
      continue;
    }

    if (!hasRp && !unit && value < 1000) {
      continue;
    }

    candidates.push({
      raw,
      value,
      index
    });
  }

  return candidates.sort((a, b) => b.value - a.value);
}

function inferTransactionType(message: string, category?: DraftCategory | null) {
  if (category) {
    return category.type;
  }

  if (includesAnyKeyword(message, INCOME_KEYWORDS)) {
    return "INCOME";
  }

  if (includesAnyKeyword(message, EXPENSE_KEYWORDS)) {
    return "EXPENSE";
  }

  return "EXPENSE";
}

function parseDate(message: string) {
  const now = new Date();

  if (message.includes("kemarin") || message.includes("kemaren")) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    return toDateOnly(yesterday);
  }

  const explicitDateMatch = message.match(/\btanggal\s+(\d{1,2})\b/i);

  if (explicitDateMatch) {
    const day = Number(explicitDateMatch[1]);

    if (day >= 1 && day <= 31) {
      const explicitDate = new Date(
        Date.UTC(now.getFullYear(), now.getMonth(), day, 12)
      );

      return toDateOnly(explicitDate);
    }
  }

  return toDateOnly(now);
}

function getCategoryAliasScore(message: string, category: DraftCategory) {
  const normalizedCategoryName = normalizeText(category.name);
  const aliasCandidates = [
    normalizedCategoryName,
    ...(CATEGORY_ALIASES[normalizedCategoryName] ?? [])
  ];

  let score = 0;

  for (const alias of aliasCandidates) {
    if (message.includes(alias)) {
      score += alias === normalizedCategoryName ? 3 : 2;
    }
  }

  return score;
}

function findBestCategory(input: {
  message: string;
  type: TransactionType;
  categories: DraftCategory[];
}) {
  const candidates = input.categories
    .filter((category) => category.type === input.type)
    .map((category) => ({
      category,
      score: getCategoryAliasScore(input.message, category)
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }

      const aIsUserCategory = a.category.userId !== null;
      const bIsUserCategory = b.category.userId !== null;

      if (aIsUserCategory !== bIsUserCategory) {
        return aIsUserCategory ? -1 : 1;
      }

      if (a.category.isDefault !== b.category.isDefault) {
        return a.category.isDefault ? 1 : -1;
      }

      return a.category.name.localeCompare(b.category.name, "id");
    });

  if (candidates[0]) {
    return candidates[0].category;
  }

  return (
    input.categories.find(
      (category) => category.type === input.type && category.userId !== null
    ) ??
    input.categories.find(
      (category) => category.type === input.type && category.isDefault
    ) ??
    input.categories.find((category) => category.type === input.type) ??
    null
  );
}

function removeNoiseFromNote(input: {
  message: string;
  amountRaw?: string;
  category?: DraftCategory | null;
}) {
  let note = normalizeText(input.message);

  const removablePhrases = [
    "tambah transaksi",
    "tambah pengeluaran",
    "tambah pemasukan",
    "masukkan",
    "catetin",
    "catat",
    "input",
    "pengeluaran",
    "pemasukan",
    "transaksi",
    ...DATE_KEYWORDS
  ].sort((a, b) => b.length - a.length);

  for (const phrase of removablePhrases) {
    note = note.replaceAll(phrase, " ");
  }

  if (input.amountRaw) {
    note = note.replace(input.amountRaw.toLowerCase(), " ");
  }

  note = note.replace(/\btanggal\s+\d{1,2}\b/gi, " ");

  if (input.category) {
    const categoryName = normalizeText(input.category.name);

    note = note.replaceAll(categoryName, " ");
  }

  note = note
    .replace(/\brp\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!note) {
    return null;
  }

  return note.slice(0, 160);
}

async function getDraftCategories(userId: string): Promise<DraftCategory[]> {
  const categories = await prisma.category.findMany({
    where: {
      OR: [
        {
          userId
        },
        {
          isDefault: true
        }
      ]
    },
    select: {
      id: true,
      name: true,
      type: true,
      isDefault: true,
      userId: true
    },
    orderBy: [
      {
        name: "asc"
      }
    ]
  });

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    type: category.type,
    isDefault: category.isDefault,
    userId: category.userId
  }));
}

function buildMissingFields(input: {
  amount: number | null;
  category: DraftCategory | null;
}) {
  const missingFields: string[] = [];

  if (!input.amount || input.amount <= 0) {
    missingFields.push("amount");
  }

  if (!input.category) {
    missingFields.push("categoryId");
  }

  return missingFields;
}

function buildWarnings(input: {
  amount: number | null;
  category: DraftCategory | null;
  note: string | null;
}) {
  const warnings: string[] = [];

  if (!input.amount || input.amount <= 0) {
    warnings.push("Nominal belum terdeteksi.");
  }

  if (!input.category) {
    warnings.push("Kategori belum cocok, perlu dipilih manual.");
  }

  if (!input.note) {
    warnings.push("Catatan belum jelas.");
  }

  return warnings;
}

function getConfidence(input: {
  amount: number | null;
  category: DraftCategory | null;
  note: string | null;
}) {
  if (input.amount && input.category && input.note) {
    return "high";
  }

  if (input.amount && input.category) {
    return "medium";
  }

  return "low";
}

export async function buildRuleBasedTransactionDraft(
  input: BuildTransactionDraftInput
): Promise<AiTransactionDraft> {
  const normalizedMessage = normalizeText(input.message);
  const categories = await getDraftCategories(input.userId);
  const moneyCandidates = extractMoneyCandidates(normalizedMessage);
  const selectedMoney = moneyCandidates[0] ?? null;

  const preliminaryType = inferTransactionType(normalizedMessage);
  const preliminaryCategory = findBestCategory({
    message: normalizedMessage,
    type: preliminaryType,
    categories
  });

  const finalType = inferTransactionType(normalizedMessage, preliminaryCategory);
  const finalCategory =
    preliminaryCategory?.type === finalType
      ? preliminaryCategory
      : findBestCategory({
          message: normalizedMessage,
          type: finalType,
          categories
        });

  const note = removeNoiseFromNote({
    message: normalizedMessage,
    amountRaw: selectedMoney?.raw,
    category: finalCategory
  });

  const amount = selectedMoney?.value ?? null;
  const missingFields = buildMissingFields({
    amount,
    category: finalCategory
  });

  const warnings = buildWarnings({
    amount,
    category: finalCategory,
    note
  });

  return {
    type: finalType,
    amount: amount ? String(Math.round(amount)) : "",
    categoryId: finalCategory?.id ?? null,
    categoryName: finalCategory?.name ?? null,
    note,
    date: parseDate(normalizedMessage),
    confidence: getConfidence({
      amount,
      category: finalCategory,
      note
    }),
    missingFields,
    warnings
  };
}