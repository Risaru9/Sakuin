import type { AiIntentClassification } from "./ai.types.js";

const TRANSACTION_DRAFT_KEYWORDS = [
  "catat",
  "catetin",
  "catatkan",
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
  "beli",
  "membeli",
  "bayar",
  "membayar",
  "jajan",
  "makan",
  "minum",
  "kopi",
  "bensin",
  "bbm",
  "parkir",
  "token listrik",
  "listrik",
  "pulsa",
  "paket data",
  "kos",
  "kost",
  "dikasih",
  "di kasih",
  "diberi",
  "di beri",
  "dapat uang",
  "dapet uang",
  "dapat transfer",
  "dapet transfer",
  "terima uang",
  "menerima uang",
  "terima transfer",
  "menerima transfer",
  "transfer dari",
  "uang dari",
  "kiriman dari",
  "dikirim",
  "ditransfer",
  "di transfer",
  "refund",
  "cashback",
  "reimburse",
  "reimbursement",
  "pengembalian dana",
  "gaji",
  "bonus",
  "thr",
  "honor",
  "honorarium",
  "fee freelance",
  "freelance"
];

const TRANSACTION_DRAFT_BLOCKING_CONTEXT_KEYWORDS = [
  "realistis",
  "tidak realistis",
  "masuk akal",
  "worth it",
  "layak",
  "low risk",
  "risiko",
  "risk",
  "aman nggak",
  "aman gak",
  "apakah aman",
  "apakah mungkin",
  "mungkin",
  "saran anda",
  "apa saran",
  "pendapat anda",
  "menurut anda",
  "ingin membeli",
  "ingin beli",
  "rencana beli",
  "rencana membeli",
  "target beli",
  "target membeli",
  "tenor",
  "deadline",
  "jangka waktu",
  "dalam 6 bulan",
  "dalam 8 bulan",
  "dalam 12 bulan",
  "dalam 24 bulan",
  "dalam 32 bulan",
  "boleh",
  "boleh beli",
  "boleh belanja",
  "boleh jajan",
  "kalau saya",
  "kalau aku",
  "kalau beli",
  "kalau belanja",
  "kalau jajan",
  "masih aman",
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

const SAFE_TO_SPEND_KEYWORDS = [
  "masih aman belanja",
  "aman belanja",
  "masih aman jajan",
  "aman jajan",
  "boleh belanja",
  "boleh jajan",
  "boleh beli",
  "sisa aman",
  "sisa uang aman",
  "sisa aman bulan ini",
  "batas harian aman",
  "limit harian aman",
  "safe to spend",
  "aman dipakai",
  "aman untuk dipakai",
  "tahan pengeluaran",
  "harus tahan pengeluaran",
  "sisa bulan ini harus hemat",
  "hari ini masih aman"
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

const FINANCIAL_CHECKUP_KEYWORDS = [
  "checkup keuangan",
  "cek keuangan",
  "cek kondisi keuangan",
  "cek kesehatan keuangan",
  "kesehatan keuangan",
  "financial checkup",
  "keuangan saya sehat",
  "keuangan saya sehat nggak",
  "keuangan saya sehat gak",
  "keuangan saya aman atau berisiko",
  "keuangan saya berisiko",
  "kondisi bulan ini sehat",
  "kondisi keuangan sehat",
  "status keuangan saya",
  "evaluasi keuangan",
  "review keuangan"
];

const FINANCIAL_CONTEXT_KEYWORDS = [
  ...FINANCIAL_SUMMARY_KEYWORDS,
  ...FINANCIAL_CHECKUP_KEYWORDS,
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
  "menabung",
  "boleh",
  "sebaiknya",
  "sekarang",
  "hari ini",
  "bulan ini",
  "gimana",
  "bagaimana",
  "aman nggak",
  "aman gak",
  "masih aman",
  "sisa aman",
];

function normalizeMessage(message: string) {
  return message.trim().toLowerCase().replace(/\s+/g, " ");
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

function hasTransactionDraftBlockingContext(message: string) {
  return includesAnyKeyword(message, TRANSACTION_DRAFT_BLOCKING_CONTEXT_KEYWORDS);
}

function isTransactionDraftMessage(message: string) {
  const hasTransactionDraftKeyword = includesAnyKeyword(
    message,
    TRANSACTION_DRAFT_KEYWORDS
  );

  if (!hasTransactionDraftKeyword) {
    return false;
  }

  if (!containsMoneyLikeValue(message) && !message.includes("transaksi")) {
    return false;
  }

  if (hasTransactionDraftBlockingContext(message)) {
    return false;
  }

  return true;
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

function isSafeToSpendMessage(message: string) {
  return includesAnyKeyword(message, SAFE_TO_SPEND_KEYWORDS);
}

function isFinancialCheckupMessage(message: string) {
  return includesAnyKeyword(message, FINANCIAL_CHECKUP_KEYWORDS);
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

    if (isSafeToSpendMessage(normalizedMessage)) {
    return createClassification(
      "SAVING_ADVICE",
      "safe_to_spend_detected",
      "high"
    );
  }

    if (isFinancialCheckupMessage(normalizedMessage)) {
    return createClassification(
      "FINANCIAL_SUMMARY",
      "financial_checkup_detected",
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