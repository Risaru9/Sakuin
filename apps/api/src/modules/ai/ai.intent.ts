import type { AiIntentClassification } from "./ai.types.js";

const TRANSACTION_DRAFT_KEYWORDS = [
  "catat",
  "catetin",
  "input",
  "masukkan",
  "tambah transaksi",
  "tambah pengeluaran",
  "tambah pemasukan",
  "simpan transaksi",
  "record transaksi",
  "habis beli",
  "barusan beli",
  "baru beli",
  "dikasih",
  "di kasih",
  "dapat uang",
  "dapet uang",
  "terima uang"
];

const SPENDING_ANALYSIS_KEYWORDS = [
  "pengeluaran",
  "expense",
  "belanja",
  "boros",
  "habis",
  "keluar",
  "kategori pengeluaran",
  "spending",
  "jajan",
  "makan",
  "minum"
];

const INCOME_ANALYSIS_KEYWORDS = [
  "pemasukan",
  "income",
  "pendapatan",
  "gaji",
  "uang masuk",
  "bonus",
  "honor",
  "bayaran"
];

const PERIOD_COMPARISON_KEYWORDS = [
  "bandingkan",
  "dibanding",
  "perbandingan",
  "compare",
  "lebih besar",
  "lebih kecil",
  "naik",
  "turun",
  "selisih"
];

const PERIOD_CONTEXT_KEYWORDS = [
  "bulan ini",
  "bulan lalu",
  "minggu ini",
  "minggu lalu",
  "hari ini",
  "kemarin",
  "periode ini",
  "periode lalu",
  "tahun ini",
  "tahun lalu"
];

const SAVING_ADVICE_KEYWORDS = [
  "saran",
  "hemat",
  "menghemat",
  "menekan",
  "mengurangi",
  "kurangi",
  "kontrol",
  "prioritas",
  "budget",
  "anggaran",
  "batas",
  "limit",
  "low risk",
  "risiko rendah",
  "lebih aman",
  "aman"
];

const GOAL_ANALYSIS_KEYWORDS = [
  "goal",
  "goals",
  "target",
  "tabungan",
  "menabung",
  "deadline",
  "jangka waktu",
  "realistis",
  "tidak realistis",
  "masuk akal",
  "mungkin",
  "worth it",
  "layak",
  "tercapai",
  "membeli",
  "beli",
  "rencana beli",
  "harga",
  "seharga"
];

const FINANCIAL_SUMMARY_KEYWORDS = [
  "kondisi keuangan",
  "ringkasan keuangan",
  "summary keuangan",
  "keuangan saya",
  "saldo",
  "cashflow",
  "arus kas",
  "balance",
  "safe balance",
  "keuangan bulan ini"
];

const FINANCIAL_CONTEXT_KEYWORDS = [
  ...FINANCIAL_SUMMARY_KEYWORDS,
  ...SPENDING_ANALYSIS_KEYWORDS,
  ...INCOME_ANALYSIS_KEYWORDS,
  ...SAVING_ADVICE_KEYWORDS,
  ...GOAL_ANALYSIS_KEYWORDS,
  "uang",
  "duit",
  "sakuin",
  "transaksi",
  "kategori",
  "tagihan",
  "kebutuhan",
  "risk"
];

const PURCHASE_KEYWORDS = [
  "beli",
  "membeli",
  "pembelian",
  "harga",
  "seharga",
  "iphone",
  "android",
  "handphone",
  "hp",
  "ponsel",
  "motor",
  "mobil",
  "laptop",
  "barang",
  "device",
  "produk"
];

const PURCHASE_PLANNING_CONTEXT_KEYWORDS = [
  "gaji",
  "pendapatan",
  "pemasukan",
  "uang",
  "target",
  "deadline",
  "bulan",
  "tahun",
  "realistis",
  "masuk akal",
  "risiko",
  "risk",
  "low risk",
  "aman",
  "saran",
  "hemat",
  "budget",
  "anggaran",
  "tabungan",
  "menabung"
];

function normalizeMessage(message: string) {
  return message.trim().toLowerCase();
}

function includesAnyKeyword(message: string, keywords: string[]) {
  return keywords.some((keyword) => message.includes(keyword));
}

function containsMoneyLikeValue(message: string) {
  return /\b(rp\s*)?\d+([.,]\d+)?\s*(juta|jt|ribu|rb|k|miliar|m)?\b/i.test(
    message
  );
}

function createClassification(
  intent: AiIntentClassification["intent"],
  reason: string,
  confidence: AiIntentClassification["confidence"] = "high"
): AiIntentClassification {
  return {
    intent,
    confidence,
    reason
  };
}

function isTransactionDraftMessage(message: string) {
  const hasTransactionDraftKeyword = includesAnyKeyword(
    message,
    TRANSACTION_DRAFT_KEYWORDS
  );

  if (!hasTransactionDraftKeyword) {
    return false;
  }

  return containsMoneyLikeValue(message) || message.includes("transaksi");
}

function isPurchasePlanningMessage(message: string) {
  const hasPurchaseKeyword = includesAnyKeyword(message, PURCHASE_KEYWORDS);
  const hasPlanningContext = includesAnyKeyword(
    message,
    PURCHASE_PLANNING_CONTEXT_KEYWORDS
  );

  return (
    hasPurchaseKeyword &&
    (hasPlanningContext || containsMoneyLikeValue(message))
  );
}

function isFinancialMessage(message: string) {
  return (
    includesAnyKeyword(message, FINANCIAL_CONTEXT_KEYWORDS) ||
    isPurchasePlanningMessage(message)
  );
}

function isPeriodComparisonMessage(message: string) {
  return (
    includesAnyKeyword(message, PERIOD_COMPARISON_KEYWORDS) &&
    includesAnyKeyword(message, PERIOD_CONTEXT_KEYWORDS)
  );
}

function isGoalAnalysisMessage(message: string) {
  return (
    includesAnyKeyword(message, GOAL_ANALYSIS_KEYWORDS) ||
    isPurchasePlanningMessage(message)
  );
}

function isSavingAdviceMessage(message: string) {
  return (
    includesAnyKeyword(message, SAVING_ADVICE_KEYWORDS) &&
    isFinancialMessage(message)
  );
}

export function classifyAiIntent(message: string): AiIntentClassification {
  const normalizedMessage = normalizeMessage(message);

  if (!normalizedMessage) {
    return createClassification("OUT_OF_SCOPE", "empty_message", "high");
  }

  if (isTransactionDraftMessage(normalizedMessage)) {
    return createClassification(
      "TRANSACTION_DRAFT",
      "transaction_draft_detected",
      "high"
    );
  }

  if (isPeriodComparisonMessage(normalizedMessage)) {
    return createClassification(
      "PERIOD_COMPARISON",
      "period_comparison_detected",
      "high"
    );
  }

  if (isGoalAnalysisMessage(normalizedMessage)) {
    return createClassification(
      "GOAL_ANALYSIS",
      "goal_or_purchase_feasibility_detected",
      "high"
    );
  }

  if (isSavingAdviceMessage(normalizedMessage)) {
    return createClassification(
      "SAVING_ADVICE",
      "saving_advice_detected",
      "high"
    );
  }

  if (includesAnyKeyword(normalizedMessage, SPENDING_ANALYSIS_KEYWORDS)) {
    return createClassification(
      "SPENDING_ANALYSIS",
      "spending_analysis_detected",
      "high"
    );
  }

  if (includesAnyKeyword(normalizedMessage, INCOME_ANALYSIS_KEYWORDS)) {
    return createClassification(
      "INCOME_ANALYSIS",
      "income_analysis_detected",
      "high"
    );
  }

  if (includesAnyKeyword(normalizedMessage, FINANCIAL_SUMMARY_KEYWORDS)) {
    return createClassification(
      "FINANCIAL_SUMMARY",
      "general_financial_context_detected",
      "medium"
    );
  }

  if (isFinancialMessage(normalizedMessage)) {
    return createClassification(
      "FINANCIAL_SUMMARY",
      "general_financial_context_detected",
      "medium"
    );
  }

  return createClassification(
    "OUT_OF_SCOPE",
    "no_financial_context_detected",
    "high"
  );
}

export function isAiIntentAllowed(message: string) {
  return classifyAiIntent(message).intent !== "OUT_OF_SCOPE";
}