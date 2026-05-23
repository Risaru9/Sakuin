import type { AiFinancialContext } from "./ai-financial-context.js";
import type { AiChatHistoryMessage } from "./ai.types.js";

type MoneyExpression = {
  raw: string;
  value: number;
  index: number;
};

export type PurchaseDecisionStatus =
  | "SAFE_TO_BUY"
  | "LIMITED"
  | "HOLD"
  | "UNKNOWN";

export type PurchaseDecisionRiskLevel =
  | "Rendah"
  | "Sedang"
  | "Tinggi"
  | "Belum bisa dinilai";

export type PurchaseDecisionAnalysis = {
  detected: boolean;
  itemName: string | null;
  purchaseAmount: number | null;
  status: PurchaseDecisionStatus;
  riskLevel: PurchaseDecisionRiskLevel;
  availableToSpendBeforePurchase: number;
  availableToSpendAfterPurchase: number | null;
  suggestedDailyLimit: number | null;
  safeToSpendStatus: AiFinancialContext["safeToSpend"]["status"];
  spendingPaceStatus: AiFinancialContext["safeToSpend"]["spendingPaceStatus"];
  topRiskCategoryName: string | null;
  reason: string;
  action: string;
  warnings: string[];
};

const PURCHASE_KEYWORDS = [
  "beli",
  "membeli",
  "pembelian",
  "belanja",
  "jajan",
  "checkout",
  "co",
  "ambil",
  "bayar",
  "membayar",
  "sepatu",
  "baju",
  "celana",
  "tas",
  "jaket",
  "kaos",
  "makanan",
  "minuman",
  "kopi",
  "hp",
  "handphone",
  "android",
  "iphone",
  "laptop",
  "motor",
  "barang"
];

const DECISION_CONTEXT_KEYWORDS = [
  "aman",
  "aman nggak",
  "aman gak",
  "aman kah",
  "apakah aman",
  "boleh",
  "sebaiknya",
  "worth it",
  "masuk akal",
  "gimana",
  "bagaimana",
  "risiko",
  "risk",
  "hari ini",
  "sekarang",
  "bulan ini",
  "masih bisa",
  "masih aman",
  "sisa aman"
];

const LONG_TERM_PLANNING_KEYWORDS = [
  "tenor",
  "cicilan",
  "angsuran",
  "kredit",
  "deadline",
  "target",
  "goal",
  "menabung",
  "tabungan",
  "dalam 6 bulan",
  "dalam 8 bulan",
  "dalam 12 bulan",
  "dalam 24 bulan",
  "dalam 32 bulan"
];

const ITEM_STOP_WORDS = new Set([
  "rp",
  "harga",
  "seharga",
  "senilai",
  "sebesar",
  "yang",
  "ini",
  "itu",
  "hari",
  "bulan",
  "sekarang",
  "aman",
  "nggak",
  "gak",
  "kah",
  "boleh",
  "worth",
  "it",
  "gimana",
  "bagaimana"
]);

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function includesAnyKeyword(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function parseMoneyValue(rawNumber: string, unit: string | undefined) {
  const normalizedNumber = Number(rawNumber.replace(",", "."));

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

function extractMoneyExpressions(text: string): MoneyExpression[] {
  const moneyPattern =
    /\b(rp\s*)?(\d+(?:[.,]\d+)?)\s*(miliar|juta|jt|ribu|rb|k|m)?\b/gi;

  const results: MoneyExpression[] = [];

  for (const match of text.matchAll(moneyPattern)) {
    const hasRp = Boolean(match[1]);
    const rawNumber = match[2];
    const unit = match[3];
    const raw = match[0];
    const index = match.index ?? 0;
    const value = parseMoneyValue(rawNumber, unit);

    if (value === null) {
      continue;
    }

    const after = text.slice(index + raw.length, index + raw.length + 12);

    if (!unit && !hasRp && value < 10_000) {
      continue;
    }

    if (/^\s*(bulan|bln|tahun|thn)/i.test(after)) {
      continue;
    }

    results.push({
      raw,
      value,
      index
    });
  }

  return results;
}

function hasLongTermPlanningSignal(text: string) {
  return (
    includesAnyKeyword(text, LONG_TERM_PLANNING_KEYWORDS) ||
    /\bdalam\s+\d{1,3}\s*(bulan|bln|tahun|thn)\b/i.test(text) ||
    /\b\d{1,3}\s*(bulan|bln|tahun|thn)\b/i.test(text)
  );
}

function getWindowAround(text: string, expression: MoneyExpression) {
  const start = Math.max(0, expression.index - 55);
  const end = Math.min(text.length, expression.index + expression.raw.length + 55);

  return text.slice(start, end);
}

function inferPurchaseAmount(text: string, expressions: MoneyExpression[]) {
  const nearPurchaseKeyword = expressions.find((expression) =>
    includesAnyKeyword(getWindowAround(text, expression), PURCHASE_KEYWORDS)
  );

  if (nearPurchaseKeyword) {
    return nearPurchaseKeyword.value;
  }

  const sortedByValue = [...expressions].sort((a, b) => b.value - a.value);

  return sortedByValue[0]?.value ?? null;
}

function cleanItemName(value: string) {
  return value
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !ITEM_STOP_WORDS.has(part))
    .join(" ")
    .trim();
}

function detectItemName(text: string, expressions: MoneyExpression[]) {
  const firstExpression = expressions[0];

  if (!firstExpression) {
    return null;
  }

  const beforeMoney = text.slice(0, firstExpression.index).trim();
  const directMatch = beforeMoney.match(
    /\b(?:beli|membeli|belanja|jajan|checkout|co|ambil|bayar|membayar)\s+(.+)$/i
  );

  if (directMatch?.[1]) {
    const cleaned = cleanItemName(directMatch[1]);

    if (cleaned) {
      return cleaned;
    }
  }

  const keyword = PURCHASE_KEYWORDS.find((item) => text.includes(item));

  if (!keyword) {
    return null;
  }

  if (keyword === "beli" || keyword === "membeli" || keyword === "pembelian") {
    return null;
  }

  return keyword;
}

function getStatusLabel(status: PurchaseDecisionStatus) {
  if (status === "SAFE_TO_BUY") {
    return "Relatif aman";
  }

  if (status === "LIMITED") {
    return "Boleh terbatas";
  }

  if (status === "HOLD") {
    return "Tahan dulu";
  }

  return "Belum bisa dinilai";
}

function getRiskLevel(input: {
  status: PurchaseDecisionStatus;
  purchaseAmount: number | null;
  availableToSpendBeforePurchase: number;
  suggestedDailyLimit: number | null;
}) {
  if (input.status === "UNKNOWN" || input.purchaseAmount === null) {
    return "Belum bisa dinilai" satisfies PurchaseDecisionRiskLevel;
  }

  if (input.status === "HOLD") {
    return "Tinggi" satisfies PurchaseDecisionRiskLevel;
  }

  if (
    input.status === "LIMITED" ||
    (input.suggestedDailyLimit !== null &&
      input.purchaseAmount > input.suggestedDailyLimit)
  ) {
    return "Sedang" satisfies PurchaseDecisionRiskLevel;
  }

  return "Rendah" satisfies PurchaseDecisionRiskLevel;
}

function determinePurchaseStatus(input: {
  purchaseAmount: number | null;
  safeToSpend: AiFinancialContext["safeToSpend"];
}) {
  const { purchaseAmount, safeToSpend } = input;

  if (purchaseAmount === null) {
    return "UNKNOWN" satisfies PurchaseDecisionStatus;
  }

  if (safeToSpend.status === "UNKNOWN") {
    return "UNKNOWN" satisfies PurchaseDecisionStatus;
  }

  if (safeToSpend.status === "HOLD") {
    return "HOLD" satisfies PurchaseDecisionStatus;
  }

  if (purchaseAmount > safeToSpend.availableToSpend) {
    return "HOLD" satisfies PurchaseDecisionStatus;
  }

  if (safeToSpend.status === "WATCH") {
    return "LIMITED" satisfies PurchaseDecisionStatus;
  }

  if (
    safeToSpend.suggestedDailyLimit !== null &&
    purchaseAmount > safeToSpend.suggestedDailyLimit
  ) {
    return "LIMITED" satisfies PurchaseDecisionStatus;
  }

  if (safeToSpend.spendingPaceStatus === "FAST") {
    return "LIMITED" satisfies PurchaseDecisionStatus;
  }

  return "SAFE_TO_BUY" satisfies PurchaseDecisionStatus;
}

function buildReason(input: {
  status: PurchaseDecisionStatus;
  purchaseAmount: number | null;
  safeToSpend: AiFinancialContext["safeToSpend"];
  itemName: string | null;
}) {
  const itemText = input.itemName ? ` ${input.itemName}` : "";

  if (input.status === "UNKNOWN") {
    return "Data transaksi atau nominal pembelian belum cukup untuk menilai dampaknya secara akurat.";
  }

  if (input.status === "HOLD") {
    if (
      input.purchaseAmount !== null &&
      input.purchaseAmount > input.safeToSpend.availableToSpend
    ) {
      return `Nominal pembelian${itemText} lebih besar dari sisa aman bulan ini, sehingga pembelian ini berisiko mengganggu cashflow.`;
    }

    return "Safe-to-spend sedang berada pada status Tahan, sehingga pengeluaran non-prioritas sebaiknya ditunda.";
  }

  if (input.status === "LIMITED") {
    if (
      input.safeToSpend.suggestedDailyLimit !== null &&
      input.purchaseAmount !== null &&
      input.purchaseAmount > input.safeToSpend.suggestedDailyLimit
    ) {
      return `Pembelian${itemText} masih berada dalam sisa aman bulan ini, tetapi nominalnya lebih besar dari limit harian aman.`;
    }

    return "Pembelian masih mungkin dilakukan, tetapi kondisi safe-to-spend perlu dipantau agar pengeluaran tidak terlalu cepat.";
  }

  return "Nominal pembelian masih berada dalam ruang aman dan tidak melebihi limit harian aman yang dihitung sistem.";
}

function buildAction(input: {
  status: PurchaseDecisionStatus;
  purchaseAmount: number | null;
  safeToSpend: AiFinancialContext["safeToSpend"];
  itemName: string | null;
}) {
  const itemText = input.itemName ? ` ${input.itemName}` : "";

  if (input.status === "UNKNOWN") {
    return "Catat pemasukan dan pengeluaran utama terlebih dahulu, lalu coba nilai pembelian ini lagi.";
  }

  if (input.status === "HOLD") {
    return `Tunda pembelian${itemText} atau turunkan nominalnya sampai berada di bawah sisa aman bulan ini.`;
  }

  if (input.status === "LIMITED") {
    if (input.safeToSpend.suggestedDailyLimit !== null) {
      return `Boleh dipertimbangkan, tetapi idealnya batasi pembelian mendekati limit harian aman atau tunda sebagian pengeluaran lain.`;
    }

    return "Boleh dipertimbangkan, tetapi jangan menambah pengeluaran non-prioritas lain hari ini.";
  }

  return "Pembelian ini relatif aman, tetapi tetap catat transaksinya jika benar-benar dilakukan.";
}

function buildWarnings(input: {
  status: PurchaseDecisionStatus;
  purchaseAmount: number | null;
  safeToSpend: AiFinancialContext["safeToSpend"];
}) {
  const warnings: string[] = [];

  if (input.purchaseAmount === null) {
    warnings.push("Nominal pembelian belum terdeteksi.");
  }

  if (
    input.purchaseAmount !== null &&
    input.purchaseAmount > input.safeToSpend.availableToSpend
  ) {
    warnings.push("Nominal pembelian lebih besar dari sisa aman bulan ini.");
  }

  if (
    input.purchaseAmount !== null &&
    input.safeToSpend.suggestedDailyLimit !== null &&
    input.purchaseAmount > input.safeToSpend.suggestedDailyLimit
  ) {
    warnings.push("Nominal pembelian melebihi limit harian aman.");
  }

  if (input.safeToSpend.status === "HOLD") {
    warnings.push("Safe-to-spend sedang menyarankan tahan pengeluaran.");
  }

  if (input.safeToSpend.spendingPaceStatus === "FAST") {
    warnings.push("Ritme pengeluaran bulan ini terlalu cepat.");
  }

  if (input.safeToSpend.topRiskCategoryName) {
    warnings.push(
      `Kategori ${input.safeToSpend.topRiskCategoryName} sedang menjadi fokus risiko.`
    );
  }

  return warnings;
}

function getHistoryText(history: AiChatHistoryMessage[]) {
  return history
    .slice(-8)
    .map((message) => message.content)
    .join("\n");
}

export function analyzePurchaseDecision(
  userMessage: string,
  context: AiFinancialContext,
  history: AiChatHistoryMessage[] = []
): PurchaseDecisionAnalysis {
  const currentText = normalizeText(userMessage);
  const historyText = normalizeText(getHistoryText(history));
  const combinedText = `${historyText}\n${currentText}`.trim();

  const expressions = extractMoneyExpressions(currentText);
  const hasPurchaseKeyword = includesAnyKeyword(currentText, PURCHASE_KEYWORDS);
  const hasDecisionContext = includesAnyKeyword(
    currentText,
    DECISION_CONTEXT_KEYWORDS
  );

  const detected =
    expressions.length > 0 &&
    hasPurchaseKeyword &&
    hasDecisionContext &&
    !hasLongTermPlanningSignal(currentText);

  if (!detected) {
    return {
      detected: false,
      itemName: null,
      purchaseAmount: null,
      status: "UNKNOWN",
      riskLevel: "Belum bisa dinilai",
      availableToSpendBeforePurchase: context.safeToSpend.availableToSpend,
      availableToSpendAfterPurchase: null,
      suggestedDailyLimit: context.safeToSpend.suggestedDailyLimit,
      safeToSpendStatus: context.safeToSpend.status,
      spendingPaceStatus: context.safeToSpend.spendingPaceStatus,
      topRiskCategoryName: context.safeToSpend.topRiskCategoryName,
      reason: "Tidak ada keputusan pembelian langsung yang perlu dianalisis.",
      action: "Tidak ada aksi pembelian yang perlu dinilai.",
      warnings: []
    };
  }

  const purchaseAmount = inferPurchaseAmount(combinedText, expressions);
  const itemName = detectItemName(currentText, expressions);
  const status = determinePurchaseStatus({
    purchaseAmount,
    safeToSpend: context.safeToSpend
  });
  const availableToSpendBeforePurchase = context.safeToSpend.availableToSpend;
  const availableToSpendAfterPurchase =
    purchaseAmount === null
      ? null
      : Math.max(0, availableToSpendBeforePurchase - purchaseAmount);

  const riskLevel = getRiskLevel({
    status,
    purchaseAmount,
    availableToSpendBeforePurchase,
    suggestedDailyLimit: context.safeToSpend.suggestedDailyLimit
  });

  return {
    detected: true,
    itemName,
    purchaseAmount,
    status,
    riskLevel,
    availableToSpendBeforePurchase,
    availableToSpendAfterPurchase,
    suggestedDailyLimit: context.safeToSpend.suggestedDailyLimit,
    safeToSpendStatus: context.safeToSpend.status,
    spendingPaceStatus: context.safeToSpend.spendingPaceStatus,
    topRiskCategoryName: context.safeToSpend.topRiskCategoryName,
    reason: buildReason({
      status,
      purchaseAmount,
      safeToSpend: context.safeToSpend,
      itemName
    }),
    action: buildAction({
      status,
      purchaseAmount,
      safeToSpend: context.safeToSpend,
      itemName
    }),
    warnings: buildWarnings({
      status,
      purchaseAmount,
      safeToSpend: context.safeToSpend
    })
  };
}

export function buildPurchaseDecisionPromptContext(
  decision: PurchaseDecisionAnalysis
) {
  if (!decision.detected) {
    return "Tidak ada keputusan pembelian langsung yang perlu dianalisis.";
  }

  return [
    `Item pembelian: ${decision.itemName ?? "Tidak disebutkan"}`,
    `Nominal pembelian: ${
      decision.purchaseAmount === null
        ? "Tidak terdeteksi"
        : decision.purchaseAmount.toLocaleString("id-ID")
    }`,
    `Keputusan deterministik: ${getStatusLabel(decision.status)}`,
    `Risk level pembelian: ${decision.riskLevel}`,
    `Sisa aman sebelum pembelian: ${decision.availableToSpendBeforePurchase.toLocaleString(
      "id-ID"
    )}`,
    `Sisa aman setelah pembelian: ${
      decision.availableToSpendAfterPurchase === null
        ? "Belum bisa dihitung"
        : decision.availableToSpendAfterPurchase.toLocaleString("id-ID")
    }`,
    `Limit harian aman: ${
      decision.suggestedDailyLimit === null
        ? "Belum bisa dihitung"
        : decision.suggestedDailyLimit.toLocaleString("id-ID")
    }`,
    `Status safe-to-spend: ${decision.safeToSpendStatus}`,
    `Status pace pengeluaran: ${decision.spendingPaceStatus}`,
    `Kategori risiko utama: ${decision.topRiskCategoryName ?? "Belum ada"}`,
    `Alasan keputusan: ${decision.reason}`,
    `Aksi pembelian: ${decision.action}`,
    `Warning pembelian: ${
      decision.warnings.length > 0
        ? decision.warnings.join("; ")
        : "Tidak ada warning pembelian"
    }`
  ].join("\n");
}