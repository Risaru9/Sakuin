import { createHash } from "node:crypto";
import type { TransactionType } from "@prisma/client";
import type { ImportEmailInput, ParsedEmailTransaction } from "./email-import.types.js";

type ProviderRule = {
  id: string;
  label: string;
  patterns: RegExp[];
};

const providerRules: ProviderRule[] = [
  { id: "BCA", label: "BCA", patterns: [/\bbca\b/i, /klikbca/i, /mybca/i] },
  { id: "BRI", label: "BRI", patterns: [/\bbri\b/i, /brimo/i] },
  { id: "Mandiri", label: "Mandiri", patterns: [/\bmandiri\b/i, /livin/i] },
  { id: "SeaBank", label: "SeaBank", patterns: [/seabank/i] },
  { id: "DANA", label: "DANA", patterns: [/\bdana\b/i] },
  { id: "GoPay", label: "GoPay", patterns: [/gopay/i, /gojek/i] },
  { id: "OVO", label: "OVO", patterns: [/\bovo\b/i] },
  { id: "ShopeePay", label: "ShopeePay", patterns: [/shopeepay/i, /shopee/i] }
];

const expensePatterns = [
  /pembayaran/i,
  /transaksi(?:\s+\w+)?\s+berhasil/i,
  /\bdebit\b/i,
  /\bqris\b/i,
  /pembelian/i,
  /belanja/i,
  /bayar/i,
  /top\s*up/i,
  /transfer\s+(?:ke|keluar)/i
];

const incomePatterns = [
  /dana\s+masuk/i,
  /uang\s+masuk/i,
  /transfer\s+masuk/i,
  /\bkredit\b/i,
  /menerima/i,
  /refund/i,
  /cashback/i,
  /berhasil\s+diterima/i
];

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function getSearchText(input: ImportEmailInput) {
  return normalizeWhitespace(
    [input.from, input.subject, input.body].filter(Boolean).join("\n")
  );
}

function detectProvider(text: string) {
  const matchedRule = providerRules.find((rule) =>
    rule.patterns.some((pattern) => pattern.test(text))
  );

  return matchedRule?.label ?? "Tidak Dikenal";
}

function parseAmount(text: string) {
  const match = text.match(/(?:rp|idr)\s*([0-9][0-9.\s]*(?:,\d{1,2})?)/i);
  if (!match?.[1]) {
    return null;
  }

  const normalized = match[1]
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return String(Math.round(amount));
}

function detectType(text: string): TransactionType | null {
  const hasIncome = incomePatterns.some((pattern) => pattern.test(text));
  const hasExpense = expensePatterns.some((pattern) => pattern.test(text));

  if (hasIncome && !hasExpense) {
    return "INCOME";
  }

  if (hasExpense && !hasIncome) {
    return "EXPENSE";
  }

  if (/refund|cashback/i.test(text)) {
    return "INCOME";
  }

  if (/qris|pembayaran|bayar|debit|belanja|top\s*up/i.test(text)) {
    return "EXPENSE";
  }

  return null;
}

function parseMerchant(text: string) {
  const patterns = [
    /(?:merchant|toko|penerima|kepada|ke|di)\s*:?\s*([A-Za-z0-9 .,'&/_-]{3,60})/i,
    /(?:pembayaran|transaksi)\s+(?:di|ke)\s+([A-Za-z0-9 .,'&/_-]{3,60})/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = match?.[1] ? normalizeWhitespace(match[1]) : null;
    if (value && !/^rp\b/i.test(value)) {
      return value.replace(/\s+(tanggal|pada|sebesar|nominal).*$/i, "").trim();
    }
  }

  return null;
}

function parseMethod(text: string) {
  if (/qris/i.test(text)) return "QRIS";
  if (/transfer/i.test(text)) return "Transfer";
  if (/debit/i.test(text)) return "Debit";
  if (/top\s*up/i.test(text)) return "Top Up";
  if (/cashback/i.test(text)) return "Cashback";
  if (/refund/i.test(text)) return "Refund";
  return null;
}

function parseReference(text: string) {
  const match = text.match(/(?:ref(?:erensi)?|rrn|id transaksi|no\.?\s*transaksi)\s*:?\s*([A-Za-z0-9-]{4,40})/i);
  return match?.[1] ?? null;
}

function parseDate(text: string, fallback?: Date) {
  const isoLike = text.match(/(20\d{2})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (isoLike) {
    const [, year, month, day, hour = "0", minute = "0"] = isoLike;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  }

  const indo = text.match(/(\d{1,2})\s+(jan|feb|mar|apr|mei|jun|jul|agu|agustus|sep|okt|nov|des)[a-z]*\s+(20\d{2})(?:\s+(\d{1,2})[:.](\d{2}))?/i);
  if (indo) {
    const monthMap: Record<string, number> = {
      jan: 0,
      feb: 1,
      mar: 2,
      apr: 3,
      mei: 4,
      jun: 5,
      jul: 6,
      agu: 7,
      agustus: 7,
      sep: 8,
      okt: 9,
      nov: 10,
      des: 11
    };
    const [, day, monthLabel, year, hour = "0", minute = "0"] = indo;
    return new Date(
      Number(year),
      monthMap[monthLabel.toLowerCase()] ?? 0,
      Number(day),
      Number(hour),
      Number(minute)
    );
  }

  return fallback ?? null;
}

function calculateConfidence(parsed: Omit<ParsedEmailTransaction, "confidence" | "warnings">) {
  let score = 0;
  if (parsed.financialProvider !== "Tidak Dikenal") score += 0.2;
  if (parsed.amount) score += 0.25;
  if (parsed.type) score += 0.2;
  if (parsed.occurredAt) score += 0.15;
  if (parsed.merchant) score += 0.1;
  if (parsed.reference) score += 0.05;
  if (parsed.method) score += 0.05;
  return Math.min(Number(score.toFixed(2)), 1);
}

export function parseEmailTransaction(input: ImportEmailInput): ParsedEmailTransaction {
  const text = getSearchText(input);
  const parsed = {
    financialProvider: detectProvider(text),
    type: detectType(text),
    amount: parseAmount(text),
    merchant: parseMerchant(text),
    method: parseMethod(text),
    reference: parseReference(text),
    occurredAt: parseDate(text, input.receivedAt ?? undefined)
  };
  const warnings: string[] = [];
  if (!parsed.amount) warnings.push("Nominal tidak terdeteksi.");
  if (!parsed.type) warnings.push("Jenis pemasukan/pengeluaran belum jelas.");
  if (parsed.financialProvider === "Tidak Dikenal") warnings.push("Bank/e-wallet belum dikenali.");
  if (!parsed.occurredAt) warnings.push("Tanggal transaksi tidak terdeteksi.");

  return {
    ...parsed,
    confidence: calculateConfidence(parsed),
    warnings
  };
}

export function createHashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function createEmailFingerprint(userId: string, input: ImportEmailInput) {
  return createHashValue(
    [
      userId,
      input.messageId ?? "",
      input.emailAddress ?? "",
      input.from ?? "",
      input.subject ?? "",
      normalizeWhitespace(input.body).slice(0, 500)
    ].join("|")
  );
}

export function createTransactionFingerprint(userId: string, parsed: ParsedEmailTransaction) {
  const timeBucket = parsed.occurredAt
    ? Math.floor(parsed.occurredAt.getTime() / (5 * 60 * 1000))
    : "unknown-time";

  return createHashValue(
    [
      userId,
      parsed.type ?? "unknown-type",
      parsed.amount ?? "unknown-amount",
      parsed.merchant?.toLowerCase() ?? "unknown-merchant",
      timeBucket
    ].join("|")
  );
}
