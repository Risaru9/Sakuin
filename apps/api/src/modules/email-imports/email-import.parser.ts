import { createHash } from "node:crypto";
import type { TransactionType } from "@prisma/client";
import type { ImportEmailInput, ParsedEmailTransaction } from "./email-import.types.js";

type ProviderRule = {
  id: string;
  label: string;
  patterns: RegExp[];
  trustedSenders: RegExp[];
};

function trustedDomain(domain: string) {
  const escapedDomain = domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `@(?:[a-z0-9-]+\\.)*${escapedDomain}(?![a-z0-9.-])`,
    "i"
  );
}

const providerRules: ProviderRule[] = [
  {
    id: "BCA",
    label: "BCA",
    patterns: [/\bbca\b/i, /klikbca/i, /mybca/i],
    trustedSenders: [trustedDomain("bca.co.id"), trustedDomain("klikbca.com")]
  },
  {
    id: "BRI",
    label: "BRI",
    patterns: [/\bbri\b/i, /brimo/i, /\bbank rakyat indonesia\b/i],
    trustedSenders: [trustedDomain("bri.co.id")]
  },
  {
    id: "BNI",
    label: "BNI",
    patterns: [/\bbni\b/i, /wondr\s+by\s+bni/i, /\bbank negara indonesia\b/i],
    trustedSenders: [trustedDomain("bni.co.id")]
  },
  {
    id: "Mandiri",
    label: "Mandiri",
    patterns: [/\bmandiri\b/i, /livin/i],
    trustedSenders: [
      trustedDomain("bankmandiri.co.id"),
      trustedDomain("mandiri.co.id")
    ]
  },
  {
    id: "BSI",
    label: "BSI",
    patterns: [/\bbsi\b/i, /byond/i, /\bbank syariah indonesia\b/i],
    trustedSenders: [trustedDomain("bankbsi.co.id")]
  },
  {
    id: "CIMB_NIAGA",
    label: "CIMB Niaga",
    patterns: [/cimb\s*niaga/i, /octo\s*(?:mobile|clicks)/i],
    trustedSenders: [trustedDomain("cimbniaga.co.id")]
  },
  {
    id: "PERMATA",
    label: "Permata",
    patterns: [/permata(?:bank|mobile)?/i],
    trustedSenders: [trustedDomain("permatabank.com")]
  },
  {
    id: "BTN",
    label: "BTN",
    patterns: [/\bbtn\b/i, /bal[eé]\s+by\s+btn/i, /\bbank tabungan negara\b/i],
    trustedSenders: [trustedDomain("btn.co.id")]
  },
  {
    id: "DANAMON",
    label: "Danamon",
    patterns: [/danamon/i, /d-bank\s*pro/i],
    trustedSenders: [trustedDomain("danamon.co.id")]
  },
  {
    id: "OCBC",
    label: "OCBC",
    patterns: [/\bocbc\b/i, /ocbc\s*nisp/i],
    trustedSenders: [
      trustedDomain("ocbc.id"),
      trustedDomain("ocbcnisp.com")
    ]
  },
  {
    id: "JAGO",
    label: "Bank Jago",
    patterns: [/\bbank jago\b/i, /\bjago\b/i],
    trustedSenders: [trustedDomain("jago.com")]
  },
  {
    id: "SeaBank",
    label: "SeaBank",
    patterns: [/seabank/i],
    trustedSenders: [trustedDomain("seabank.co.id")]
  },
  {
    id: "MAYBANK",
    label: "Maybank",
    patterns: [/maybank/i, /m2u/i],
    trustedSenders: [trustedDomain("maybank.co.id")]
  }
];

const trustedFinancialSenderPatterns = providerRules.flatMap(
  (rule) => rule.trustedSenders
);

const nonFinancialSenderPatterns = [
  /linkedin/i,
  /linkedIn/i,
  /facebook/i,
  /instagram/i,
  /tiktok/i,
  /\bt\.co\b/i,
  /x\.com/i,
  /twitter/i,
  /github/i,
  /vercel/i,
  /google alerts/i,
  /newsletter/i,
  /medium/i,
  /quora/i,
  /mailchimp/i,
  /substack/i,
  /eventbrite/i,
  /canva/i
];

const nonTransactionContentPatterns = [
  /bangun\s+portofolio/i,
  /portofolio\s+bisnis/i,
  /premium\s+tersedia/i,
  /lowongan/i,
  /karier/i,
  /newsletter/i,
  /webinar/i,
  /promo(?:si)?/i,
  /diskon/i,
  /voucher/i
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

function getSenderText(input: ImportEmailInput) {
  return normalizeWhitespace([input.from, input.subject].filter(Boolean).join(" "));
}

function getFromText(input: ImportEmailInput) {
  return normalizeWhitespace(input.from ?? "");
}

function detectProvider(text: string, fromText: string) {
  const trustedRule = providerRules.find((rule) =>
    rule.trustedSenders.some((pattern) => pattern.test(fromText))
  );

  if (trustedRule) {
    return {
      label: trustedRule.label,
      isTrustedFinancialSender: true
    };
  }

  const matchedRule = providerRules.find((rule) =>
    rule.patterns.some((pattern) => pattern.test(text))
  );

  return {
    label: matchedRule?.label ?? "Tidak Dikenal",
    isTrustedFinancialSender: false
  };
}

function isNonFinancialSender(input: ImportEmailInput) {
  const senderText = getSenderText(input);
  return nonFinancialSenderPatterns.some((pattern) => pattern.test(senderText));
}

export function isTrustedFinancialSender(input: ImportEmailInput) {
  const fromText = getFromText(input);
  return trustedFinancialSenderPatterns.some((pattern) => pattern.test(fromText));
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
      const cleaned = value
        .replace(/\s+(tanggal|pada|sebesar|nominal|berhasil|ref|rrn).*$/i, "")
        .trim();

      if (
        cleaned.length >= 3 &&
        !/@/.test(cleaned) &&
        !/\.(com|id|net|org)\b/i.test(cleaned) &&
        !/^(gmail|email|notifikasi|notification|invoice|linkedin)$/i.test(cleaned)
      ) {
        return cleaned;
      }
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

function parseDate(text: string) {
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

  return null;
}

function isFutureDate(date: Date | null) {
  if (!date) {
    return false;
  }

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  return date.getTime() > todayEnd.getTime();
}

function hasStrongFinancialSignal(text: string) {
  const amount = /(?:rp|idr)\s*[0-9]/i.test(text);
  const transactionKeyword =
    /(?:qris|pembayaran|transaksi|transfer\s+(?:masuk|keluar|ke)|debit|kredit|top\s*up|refund|cashback|belanja|pembelian|dana\s+masuk|uang\s+masuk)/i.test(text);
  const successKeyword = /(?:berhasil|sukses|diterima|selesai|completed|success)/i.test(text);
  const marketingKeyword = nonTransactionContentPatterns.some((pattern) =>
    pattern.test(text)
  );

  return amount && transactionKeyword && successKeyword && !marketingKeyword;
}

function calculateConfidence(parsed: Omit<ParsedEmailTransaction, "confidence" | "warnings">) {
  let score = 0;
  if (parsed.financialProvider !== "Tidak Dikenal") score += 0.2;
  if (parsed.amount) score += 0.25;
  if (parsed.type) score += 0.2;
  if (parsed.occurredAt && parsed.hasExplicitTransactionDate) score += 0.15;
  if (parsed.merchant) score += 0.1;
  if (parsed.reference) score += 0.1;
  if (parsed.method) score += 0.05;
  if (parsed.isTrustedFinancialSender) score += 0.1;
  if (parsed.isLikelyFinancialEmail) score += 0.1;
  return Math.min(Number(score.toFixed(2)), 1);
}

export function parseEmailTransaction(input: ImportEmailInput): ParsedEmailTransaction {
  const text = getSearchText(input);
  const fromText = getFromText(input);
  const explicitDate = parseDate(text);
  const provider = detectProvider(text, fromText);
  const parsed = {
    financialProvider: provider.label,
    type: detectType(text),
    amount: parseAmount(text),
    merchant: parseMerchant(text),
    method: parseMethod(text),
    reference: parseReference(text),
    occurredAt: explicitDate,
    hasExplicitTransactionDate: Boolean(explicitDate),
    isTrustedFinancialSender: provider.isTrustedFinancialSender,
    isLikelyFinancialEmail:
      hasStrongFinancialSignal(text) && !isNonFinancialSender(input)
  };
  const warnings: string[] = [];
  if (!parsed.amount) warnings.push("Nominal tidak terdeteksi.");
  if (!parsed.type) warnings.push("Jenis pemasukan/pengeluaran belum jelas.");
  if (parsed.financialProvider === "Tidak Dikenal") warnings.push("Bank belum dikenali.");
  if (!parsed.occurredAt) warnings.push("Tanggal transaksi tidak terdeteksi.");
  if (parsed.occurredAt && isFutureDate(parsed.occurredAt)) warnings.push("Tanggal transaksi berada di masa depan.");
  if (!parsed.isLikelyFinancialEmail) warnings.push("Email tidak memiliki sinyal transaksi finansial yang cukup kuat.");
  if (!parsed.isTrustedFinancialSender) warnings.push("Pengirim email belum termasuk sumber resmi bank.");

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
      parsed.financialProvider.toLowerCase(),
      parsed.type ?? "unknown-type",
      parsed.amount ?? "unknown-amount",
      parsed.reference?.toLowerCase() ?? "unknown-reference",
      parsed.merchant?.toLowerCase() ?? "unknown-merchant",
      timeBucket
    ].join("|")
  );
}
