import type { Category } from "../categories/category.types";
import type { TransactionType } from "./transaction.types";

export type QuickTransactionDraft = {
  id: string;
  sourceText: string;
  type: TransactionType;
  amount: string;
  categoryId: string;
  categoryName: string;
  date: string;
  note: string;
  confidence: "high" | "medium" | "low";
  warning?: string;
  saveAsNewCategory: boolean;
  customCategoryName: string;
};

export type QuickTransactionSkippedItem = {
  sourceText: string;
  reason: string;
};

export type QuickTransactionParseResult = {
  drafts: QuickTransactionDraft[];
  skippedItems: QuickTransactionSkippedItem[];
};

type DirectionResult = {
  type: TransactionType;
  confidence: "high" | "medium" | "low";
  incomeScore: number;
  expenseScore: number;
  reason?: string;
};

type CategoryMatch = {
  category: Category;
  confidence: "high" | "medium";
  score: number;
};

const MAX_DRAFT_ITEMS = 20;

const familyAndPeopleTerms = [
  "kakak",
  "adik",
  "ibu",
  "ayah",
  "bapak",
  "mama",
  "papa",
  "orang tua",
  "teman",
  "saudara",
  "keluarga",
  "pacar",
  "istri",
  "suami",
  "om",
  "tante",
  "nenek",
  "kakek"
];

const incomeKeywords = [
  "income",
  "pemasukan",
  "pendapatan",
  "masuk",
  "gaji",
  "salary",
  "freelance",
  "bonus",
  "komisi",
  "upah",
  "bayaran",
  "dibayar",
  "dapat uang",
  "dapet uang",
  "menerima uang",
  "terima uang",
  "uang masuk",
  "uang saku",
  "uang dari",
  "dari orang tua",
  "kiriman",
  "kiriman orang tua",
  "dikasih",
  "diberi",
  "ditransfer",
  "transfer dari",
  "dapat transfer",
  "dapet transfer",
  "refund",
  "cashback",
  "jual",
  "terjual",
  "laku"
];

const expenseKeywords = [
  "expense",
  "pengeluaran",
  "keluar",
  "beli",
  "membeli",
  "bayar",
  "belanja",
  "jajan",
  "makan",
  "minum",
  "kopi",
  "bensin",
  "parkir",
  "sewa",
  "langganan",
  "cicilan",
  "top up",
  "transfer ke",
  "kirim ke",
  "kasih uang ke",
  "ngasih uang ke",
  "bayar utang",
  "bayar hutang"
];

const categoryKeywordRules: Array<{
  type: TransactionType;
  categoryTargets: string[];
  keywords: string[];
}> = [
  {
    type: "EXPENSE",
    categoryTargets: ["makan", "food", "kuliner", "jajan"],
    keywords: [
      "makan",
      "nasi",
      "ayam",
      "bakso",
      "mie",
      "kopi",
      "minum",
      "jajan",
      "sarapan",
      "lunch",
      "dinner",
      "resto",
      "warung",
      "cafe",
      "kafe"
    ]
  },
  {
    type: "EXPENSE",
    categoryTargets: ["transport", "kendaraan", "bensin", "ojek"],
    keywords: [
      "bensin",
      "transport",
      "ojek",
      "grab",
      "gojek",
      "parkir",
      "tol",
      "angkot",
      "bus",
      "kereta"
    ]
  },
  {
    type: "EXPENSE",
    categoryTargets: ["belanja", "shopping"],
    keywords: [
      "belanja",
      "shopee",
      "tokopedia",
      "lazada",
      "tiktok shop",
      "baju",
      "sepatu",
      "sunscreen",
      "sun screen",
      "moist",
      "moisturizer",
      "pelembab",
      "skincare",
      "skin care",
      "sabun",
      "parfum"
    ]
  },
  {
    type: "INCOME",
    categoryTargets: ["gaji", "salary", "upah"],
    keywords: ["gaji", "salary", "upah"]
  },
  {
    type: "INCOME",
    categoryTargets: ["freelance", "project", "proyek", "komisi", "bayaran"],
    keywords: ["freelance", "project", "proyek", "komisi", "bayaran"]
  },
  {
    type: "INCOME",
    categoryTargets: ["bonus"],
    keywords: ["bonus"]
  },
  {
    type: "INCOME",
    categoryTargets: [
      "orang tua",
      "ortu",
      "ayah",
      "ibu",
      "kakak",
      "adik",
      "keluarga",
      "uang saku",
      "kiriman"
    ],
    keywords: [
      "uang dari orang tua",
      "uang dari ayah",
      "uang dari ibu",
      "uang dari kakak",
      "uang dari adik",
      "kiriman orang tua",
      "kiriman ayah",
      "kiriman ibu",
      "kiriman kakak",
      "dikasih orang tua",
      "dikasih ayah",
      "dikasih ibu",
      "dikasih kakak",
      "dikasih uang",
      "uang saku"
    ]
  }
];

const stopWords = new Set([
  "dan",
  "atau",
  "yang",
  "di",
  "ke",
  "dari",
  "buat",
  "untuk",
  "sama",
  "oleh",
  "uang",
  "duit",
  "rp",
  "idr",
  "ribu",
  "rb",
  "juta",
  "jt",
  "income",
  "expense",
  "pemasukan",
  "pengeluaran",
  "pendapatan",
  "masuk",
  "keluar",
  "transaksi",
  "cepat"
]);

const tokenAliases: Record<string, string> = {
  duit: "uang",
  cuan: "uang",
  dapet: "dapat",
  dpt: "dapat",
  dikasihin: "dikasih",
  dikasi: "dikasih",
  diksh: "dikasih",
  ngasih: "kasih",
  ngasi: "kasih",
  ngsh: "kasih",
  ortu: "orang tua",
  nyokap: "ibu",
  mama: "ibu",
  mamah: "ibu",
  umi: "ibu",
  bunda: "ibu",
  bokap: "ayah",
  papa: "ayah",
  papah: "ayah",
  abi: "ayah",
  bapak: "ayah",
  ayahku: "ayah",
  ibuku: "ibu",
  kakakku: "kakak",
  adikku: "adik",
  temen: "teman",
  tmn: "teman",
  freelancean: "freelance",
  projek: "proyek",
  project: "proyek",
  makanan: "makan",
  minuman: "minum",
  transportasi: "transport",
  moisturizer: "moist",
  pelembab: "moist"
};

function applyPhraseNormalization(value: string) {
  return value
    .replace(/\bdi\s+kasih\b/g, "dikasih")
    .replace(/\bdi\s+kasihin\b/g, "dikasih")
    .replace(/\bdi\s+beri\b/g, "diberi")
    .replace(/\bdi\s+berikan\b/g, "diberi")
    .replace(/\bdi\s+transfer\b/g, "ditransfer")
    .replace(/\bdi\s+tf\b/g, "ditransfer")
    .replace(/\btransferan\b/g, "transfer")
    .replace(/\btf\b/g, "transfer")
    .replace(/\bskin\s+care\b/g, "skincare")
    .replace(/\bsun\s+screen\b/g, "sunscreen")
    .replace(/\borang\s+tua\b/g, "orang tua");
}

function normalizeText(value: string) {
  const normalized = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return applyPhraseNormalization(normalized)
    .split(" ")
    .map((token) => tokenAliases[token] ?? token)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCategoryName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function splitInputIntoItems(input: string) {
  return input
    .split(/\n|,|;/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, MAX_DRAFT_ITEMS);
}

function getTokens(value: string) {
  return normalizeText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);
}

function getImportantTokens(value: string) {
  return getTokens(value)
    .flatMap((token) => {
      const alias = tokenAliases[token] ?? token;

      return alias.includes(" ") ? alias.split(" ") : [alias];
    })
    .filter((token) => token.length >= 3 && !stopWords.has(token));
}

function hasPhrase(sourceText: string, phrases: string[]) {
  const normalizedSourceText = normalizeText(sourceText);

  return phrases.some((phrase) =>
    normalizedSourceText.includes(normalizeText(phrase))
  );
}

function countKeywordMatches(sourceText: string, keywords: string[]) {
  const normalizedSourceText = normalizeText(sourceText);

  return keywords.reduce((total, keyword) => {
    const normalizedKeyword = normalizeText(keyword);

    if (!normalizedKeyword) {
      return total;
    }

    return normalizedSourceText.includes(normalizedKeyword) ? total + 1 : total;
  }, 0);
}

function getPeoplePattern() {
  return familyAndPeopleTerms
    .map((term) => normalizeText(term).replace(/\s+/g, "\\s+"))
    .join("|");
}

function getDirectionResult(sourceText: string): DirectionResult {
  const normalizedSourceText = normalizeText(sourceText);
  const peoplePattern = getPeoplePattern();

  let incomeScore = countKeywordMatches(sourceText, incomeKeywords);
  let expenseScore = countKeywordMatches(sourceText, expenseKeywords);

  const incomingPatterns = [
    /\b(dikasih|diberi|ditransfer)\b/,
    /\b(dapat|terima|menerima)\s+(uang|transfer|bayaran|gaji|bonus|komisi|refund|cashback)\b/,
    /\b(uang|transfer|kiriman)\s+dari\b/,
    /\b(dari)\s+(kakak|adik|ibu|ayah|orang tua|teman|saudara|keluarga|pacar|istri|suami)\b/,
    /\b(gaji|bonus|komisi|bayaran|freelance|upah|salary|refund|cashback)\b/,
    /\b(jual|menjual|terjual|laku)\b/
  ];

  const outgoingPatterns = [
    /\b(kasih|beri|transfer|kirim|bayar)\s+(uang|transfer)?\s*(ke|kepada|buat|untuk)\b/,
    /\b(ke|kepada|buat|untuk)\s+(kakak|adik|ibu|ayah|orang tua|teman|saudara|keluarga|pacar|istri|suami)\b/,
    /\b(beli|membeli|belanja|jajan|bayar|sewa|langganan|cicilan)\b/,
    /\b(bayar)\s+(utang|hutang)\b/
  ];

  if (incomingPatterns.some((pattern) => pattern.test(normalizedSourceText))) {
    incomeScore += 4;
  }

  if (outgoingPatterns.some((pattern) => pattern.test(normalizedSourceText))) {
    expenseScore += 4;
  }

  const personGivesMoneyToUserPattern = new RegExp(
    `\\b(${peoplePattern})\\s+(kasih|beri|transfer|kirim)\\s+(uang|transfer)?\\b`
  );

  if (personGivesMoneyToUserPattern.test(normalizedSourceText)) {
    incomeScore += 4;
  }

  const userGivesMoneyToPersonPattern = new RegExp(
    `\\b(kasih|beri|transfer|kirim|bayar)\\s+(uang|transfer)?\\s*(ke|kepada|buat|untuk)\\s+(${peoplePattern})\\b`
  );

  if (userGivesMoneyToPersonPattern.test(normalizedSourceText)) {
    expenseScore += 5;
  }

  const loanFromPattern = new RegExp(
    `\\b(pinjam|hutang|utang)\\s+(uang)?\\s*dari\\s+(${peoplePattern})\\b`
  );

  if (loanFromPattern.test(normalizedSourceText)) {
    incomeScore += 2;
  }

  const payDebtToPattern = new RegExp(
    `\\b(bayar|lunasi)\\s+(hutang|utang)\\s+(ke|kepada|buat|untuk)?\\s*(${peoplePattern})?\\b`
  );

  if (payDebtToPattern.test(normalizedSourceText)) {
    expenseScore += 5;
  }

  if (incomeScore >= expenseScore + 3) {
    return {
      type: "INCOME",
      confidence: incomeScore >= 5 ? "high" : "medium",
      incomeScore,
      expenseScore,
      reason: "Sinyal uang masuk lebih kuat."
    };
  }

  if (expenseScore >= incomeScore + 3) {
    return {
      type: "EXPENSE",
      confidence: expenseScore >= 5 ? "high" : "medium",
      incomeScore,
      expenseScore,
      reason: "Sinyal uang keluar lebih kuat."
    };
  }

  if (incomeScore > expenseScore) {
    return {
      type: "INCOME",
      confidence: "medium",
      incomeScore,
      expenseScore,
      reason: "Sinyal uang masuk sedikit lebih kuat."
    };
  }

  if (expenseScore > incomeScore) {
    return {
      type: "EXPENSE",
      confidence: "medium",
      incomeScore,
      expenseScore,
      reason: "Sinyal uang keluar sedikit lebih kuat."
    };
  }

  return {
    type: "EXPENSE",
    confidence: "low",
    incomeScore,
    expenseScore,
    reason: "Tidak ada sinyal kuat, sistem memakai Expense sebagai default."
  };
}

function parseAmountToken(
  token: string,
  sourceText: string,
  tokenEndIndex: number
) {
  let normalizedToken = token
    .toLowerCase()
    .replace(/rp/g, "")
    .replace(/idr/g, "")
    .replace(/\s/g, "")
    .trim();

  if (!normalizedToken) {
    return null;
  }

  if (normalizedToken.includes(".") && normalizedToken.includes(",")) {
    normalizedToken = normalizedToken.replace(/\./g, "").replace(",", ".");
  } else if (normalizedToken.includes(",")) {
    const looksLikeDecimal = /,\d{1,2}$/.test(normalizedToken);

    normalizedToken = looksLikeDecimal
      ? normalizedToken.replace(",", ".")
      : normalizedToken.replace(/,/g, "");
  } else {
    normalizedToken = normalizedToken.replace(/\./g, "");
  }

  const numberValue = Number(normalizedToken);

  if (!Number.isFinite(numberValue) || Number.isNaN(numberValue)) {
    return null;
  }

  const suffixText = sourceText
    .slice(tokenEndIndex, tokenEndIndex + 12)
    .toLowerCase();

  if (/^\s*(ribu|rb|k)\b/.test(suffixText)) {
    return numberValue * 1_000;
  }

  if (/^\s*(juta|jt)\b/.test(suffixText)) {
    return numberValue * 1_000_000;
  }

  return numberValue;
}

function extractAmount(sourceText: string) {
  const amountMatches = [...sourceText.matchAll(/(?:rp\s*)?\d[\d.,]*/gi)];

  if (amountMatches.length === 0) {
    return null;
  }

  const amountMatch = amountMatches[amountMatches.length - 1];
  const amountToken = amountMatch[0];
  const amountIndex = amountMatch.index ?? 0;
  const tokenEndIndex = amountIndex + amountToken.length;
  const amount = parseAmountToken(amountToken, sourceText, tokenEndIndex);

  if (!amount || amount <= 0) {
    return null;
  }

  return {
    amount,
    amountIndex,
    tokenEndIndex
  };
}

function cleanNote(
  sourceText: string,
  amountIndex: number,
  tokenEndIndex: number
) {
  const beforeAmount = sourceText.slice(0, amountIndex);
  const afterAmount = sourceText.slice(tokenEndIndex);
  const rawNote = `${beforeAmount} ${afterAmount}`;

  const cleanedNote = rawNote
    .replace(
      /\b(income|expense|pemasukan|pengeluaran|pendapatan|masuk|keluar)\b/gi,
      ""
    )
    .replace(/\b(ribu|rb|juta|jt|rupiah|rp|idr)\b/gi, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s\-:]+|[\s\-:]+$/g, "")
    .trim();

  return cleanedNote || "Transaksi cepat";
}

function titleCase(value: string) {
  return normalizeCategoryName(value).replace(/\b\w/g, (letter) =>
    letter.toUpperCase()
  );
}

function createSuggestedCategoryName(note: string, type: TransactionType) {
  const normalizedNote = normalizeText(note);

  const cleanedNote =
    type === "INCOME"
      ? normalizeCategoryName(
          normalizedNote.replace(
            /\b(dapat|terima|menerima|dikasih|diberi|ditransfer|kiriman|transfer)\b/gi,
            ""
          )
        )
      : normalizeCategoryName(
          normalizedNote.replace(/\b(beli|membeli|bayar|untuk|di|ke|dan)\b/gi, "")
        );

  const tokens = getImportantTokens(cleanedNote).slice(0, 4);

  if (tokens.length === 0) {
    return "";
  }

  return titleCase(tokens.join(" "));
}

function isOtherCategory(category: Category) {
  const normalizedName = normalizeText(category.name);

  return normalizedName.includes("lain") || normalizedName.includes("other");
}

function findOtherCategory(categories: Category[], type: TransactionType) {
  return categories.find(
    (category) => category.type === type && isOtherCategory(category)
  );
}

function getCategoryMatchScore(category: Category, sourceText: string) {
  const normalizedSourceText = normalizeText(sourceText);
  const normalizedCategoryName = normalizeText(category.name);

  if (
    normalizedCategoryName.length >= 3 &&
    normalizedSourceText.includes(normalizedCategoryName)
  ) {
    return 100;
  }

  const categoryTokens = getImportantTokens(category.name);
  const sourceTokens = new Set(getImportantTokens(sourceText));

  if (categoryTokens.length === 0) {
    return 0;
  }

  const matchedTokens = categoryTokens.filter((token) => sourceTokens.has(token));

  if (matchedTokens.length === 0) {
    return 0;
  }

  const matchRatio = matchedTokens.length / categoryTokens.length;

  if (categoryTokens.length === 1 && matchedTokens.length === 1) {
    return 80;
  }

  return Math.round(matchRatio * 90);
}

function findBestCategoryMatch(
  categories: Category[],
  sourceText: string,
  type?: TransactionType
): CategoryMatch | null {
  const candidates = categories
    .filter((category) => !isOtherCategory(category))
    .filter((category) => (type ? category.type === type : true))
    .map((category) => ({
      category,
      score: getCategoryMatchScore(category, sourceText)
    }))
    .filter((candidate) => candidate.score >= 70)
    .sort((first, second) => second.score - first.score);

  const bestCandidate = candidates[0];

  if (!bestCandidate) {
    return null;
  }

  return {
    category: bestCandidate.category,
    score: bestCandidate.score,
    confidence: bestCandidate.score >= 85 ? "high" : "medium"
  };
}

function findCategoryByKeyword(
  categories: Category[],
  type: TransactionType,
  sourceText: string
) {
  const normalizedSourceText = normalizeText(sourceText);

  const matchedRule = categoryKeywordRules.find((rule) => {
    if (rule.type !== type) {
      return false;
    }

    return rule.keywords.some((keyword) =>
      normalizedSourceText.includes(normalizeText(keyword))
    );
  });

  if (!matchedRule) {
    return null;
  }

  return categories.find((category) => {
    if (category.type !== type || isOtherCategory(category)) {
      return false;
    }

    const normalizedCategoryName = normalizeText(category.name);

    return matchedRule.categoryTargets.some((target) =>
      normalizedCategoryName.includes(normalizeText(target))
    );
  });
}

function detectType(categories: Category[], sourceText: string): DirectionResult {
  const directionResult = getDirectionResult(sourceText);

  if (directionResult.confidence !== "low") {
    return directionResult;
  }

  const categoryMatch = findBestCategoryMatch(categories, sourceText);

  if (categoryMatch) {
    return {
      type: categoryMatch.category.type,
      confidence: categoryMatch.confidence,
      incomeScore:
        categoryMatch.category.type === "INCOME" ? directionResult.incomeScore + 2 : directionResult.incomeScore,
      expenseScore:
        categoryMatch.category.type === "EXPENSE" ? directionResult.expenseScore + 2 : directionResult.expenseScore,
      reason: "Tipe mengikuti kategori custom yang cocok."
    };
  }

  return directionResult;
}

function resolveCategory(
  categories: Category[],
  type: TransactionType,
  sourceText: string
) {
  const directMatch = findBestCategoryMatch(categories, sourceText, type);

  if (directMatch) {
    return {
      category: directMatch.category,
      confidence: directMatch.confidence,
      warning: undefined
    };
  }

  const keywordMatch = findCategoryByKeyword(categories, type, sourceText);

  if (keywordMatch) {
    return {
      category: keywordMatch,
      confidence: "medium" as const,
      warning: undefined
    };
  }

  const otherCategory = findOtherCategory(categories, type);

  if (otherCategory) {
    return {
      category: otherCategory,
      confidence: "low" as const,
      warning:
        "Kategori belum cocok. Draft dimasukkan ke kategori Lain dan bisa kamu ubah atau simpan sebagai kategori baru."
    };
  }

  const firstCategory = categories.find((category) => category.type === type);

  if (firstCategory) {
    return {
      category: firstCategory,
      confidence: "low" as const,
      warning:
        "Kategori Lain tidak ditemukan, jadi draft memakai kategori pertama. Mohon cek sebelum simpan."
    };
  }

  return {
    category: null,
    confidence: "low" as const,
    warning: "Tidak ada kategori yang tersedia untuk tipe transaksi ini."
  };
}

function toAmountInputValue(amount: number) {
  if (Number.isInteger(amount)) {
    return String(amount);
  }

  return amount.toFixed(2).replace(/\.?0+$/, "");
}

function resolveDraftConfidence(
  directionConfidence: DirectionResult["confidence"],
  categoryConfidence: "high" | "medium" | "low"
): QuickTransactionDraft["confidence"] {
  if (directionConfidence === "high" && categoryConfidence === "high") {
    return "high";
  }

  if (directionConfidence === "low" || categoryConfidence === "low") {
    return "low";
  }

  return "medium";
}

export function parseQuickTransactionInput({
  input,
  categories,
  defaultDate
}: {
  input: string;
  categories: Category[];
  defaultDate: string;
}): QuickTransactionParseResult {
  const sourceItems = splitInputIntoItems(input);
  const drafts: QuickTransactionDraft[] = [];
  const skippedItems: QuickTransactionSkippedItem[] = [];

  sourceItems.forEach((sourceText, index) => {
    const amountResult = extractAmount(sourceText);

    if (!amountResult) {
      skippedItems.push({
        sourceText,
        reason: "Nominal tidak ditemukan atau tidak valid."
      });
      return;
    }

    const directionResult = detectType(categories, sourceText);
    const type = directionResult.type;
    const categoryResult = resolveCategory(categories, type, sourceText);

    if (!categoryResult.category) {
      skippedItems.push({
        sourceText,
        reason: categoryResult.warning
      });
      return;
    }

    const note = cleanNote(
      sourceText,
      amountResult.amountIndex,
      amountResult.tokenEndIndex
    );

    const confidence = resolveDraftConfidence(
      directionResult.confidence,
      categoryResult.confidence
    );

    const warning =
      confidence === "low"
        ? categoryResult.warning ?? directionResult.reason
        : categoryResult.warning;

    drafts.push({
      id: `${Date.now()}-${index}`,
      sourceText,
      type,
      amount: toAmountInputValue(amountResult.amount),
      categoryId: categoryResult.category.id,
      categoryName: categoryResult.category.name,
      date: defaultDate,
      note,
      confidence,
      warning,
      saveAsNewCategory: false,
      customCategoryName:
        confidence === "low" ? createSuggestedCategoryName(note, type) : ""
    });
  });

  return {
    drafts,
    skippedItems
  };
}