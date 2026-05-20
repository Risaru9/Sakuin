import type { AiIntentClassification } from "./ai.types.js";

const FINANCIAL_KEYWORDS = [
  "uang",
  "keuangan",
  "saldo",
  "transaksi",
  "pemasukan",
  "pengeluaran",
  "pendapatan",
  "income",
  "expense",
  "belanja",
  "jajan",
  "boros",
  "hemat",
  "budget",
  "anggaran",
  "kategori",
  "makan",
  "makanan",
  "transport",
  "bensin",
  "gaji",
  "tabungan",
  "goal",
  "target",
  "safe balance",
  "batas aman",
  "rekening",
  "dompet",
  "bayar",
  "dibayar",
  "dikasih",
  "diberi",
  "transfer",
  "qris",
  "cash",
  "tunai"
];

const OUT_OF_SCOPE_KEYWORDS = [
  "cerpen",
  "puisi",
  "sejarah",
  "politik",
  "presiden",
  "cuaca",
  "film",
  "anime",
  "game",
  "kode",
  "coding",
  "react",
  "javascript",
  "typescript",
  "python",
  "skripsi",
  "matematika",
  "fisika",
  "kimia",
  "translate",
  "terjemahkan"
];

const TRANSACTION_VERBS = [
  "catat",
  "tambahkan",
  "tambah",
  "input",
  "masukkan",
  "masukin",
  "simpan"
];

const PERIOD_COMPARISON_KEYWORDS = [
  "banding",
  "bandingkan",
  "dibanding",
  "compare",
  "bulan lalu",
  "minggu lalu",
  "periode lalu",
  "sebelumnya",
  "naik",
  "turun",
  "lebih besar",
  "lebih kecil"
];

const SPENDING_KEYWORDS = [
  "pengeluaran",
  "expense",
  "keluar",
  "boros",
  "belanja",
  "jajan",
  "habis",
  "habisin",
  "kategori terbesar",
  "paling banyak",
  "makanan",
  "makan",
  "transport",
  "bensin"
];

const INCOME_KEYWORDS = [
  "pemasukan",
  "income",
  "pendapatan",
  "gaji",
  "uang masuk",
  "dikasih",
  "diberi",
  "bonus"
];

const SAVING_KEYWORDS = [
  "saran",
  "hemat",
  "kurangi",
  "mengurangi",
  "tips",
  "budget",
  "anggaran",
  "batas",
  "limit",
  "aman"
];

const GOAL_KEYWORDS = [
  "goal",
  "goals",
  "target",
  "tabungan",
  "dana darurat",
  "progres",
  "progress"
];

const SUMMARY_KEYWORDS = [
  "ringkasan",
  "rekap",
  "summary",
  "kondisi",
  "keuangan",
  "saldo",
  "bulan ini",
  "minggu ini",
  "hari ini",
  "aman"
];

function normalizeMessage(message: string) {
  return message
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAnyKeyword(message: string, keywords: string[]) {
  return keywords.some((keyword) => message.includes(keyword));
}

function containsAmountLikeText(message: string) {
  return (
    /\b\d+([.,]\d+)?\b/.test(message) ||
    /\b\d+\s?(rb|ribu|jt|juta)\b/.test(message)
  );
}

function isOutOfScope(message: string) {
  return includesAnyKeyword(message, OUT_OF_SCOPE_KEYWORDS);
}

function isFinancialMessage(message: string) {
  return includesAnyKeyword(message, FINANCIAL_KEYWORDS);
}

export function classifyAiIntent(message: string): AiIntentClassification {
  const normalizedMessage = normalizeMessage(message);

  if (!normalizedMessage) {
    return {
      intent: "OUT_OF_SCOPE",
      confidence: "high",
      reason: "empty_message"
    };
  }

  const hasFinancialContext = isFinancialMessage(normalizedMessage);

  if (isOutOfScope(normalizedMessage) && !hasFinancialContext) {
    return {
      intent: "OUT_OF_SCOPE",
      confidence: "high",
      reason: "non_financial_topic"
    };
  }

  if (!hasFinancialContext) {
    return {
      intent: "OUT_OF_SCOPE",
      confidence: "medium",
      reason: "missing_financial_context"
    };
  }

  if (
    includesAnyKeyword(normalizedMessage, TRANSACTION_VERBS) &&
    containsAmountLikeText(normalizedMessage)
  ) {
    return {
      intent: "TRANSACTION_DRAFT",
      confidence: "high",
      reason: "transaction_verb_and_amount_detected"
    };
  }

  if (includesAnyKeyword(normalizedMessage, PERIOD_COMPARISON_KEYWORDS)) {
    return {
      intent: "PERIOD_COMPARISON",
      confidence: "high",
      reason: "period_comparison_detected"
    };
  }

  if (includesAnyKeyword(normalizedMessage, SAVING_KEYWORDS)) {
    return {
      intent: "SAVING_ADVICE",
      confidence: "high",
      reason: "saving_advice_detected"
    };
  }

  if (includesAnyKeyword(normalizedMessage, GOAL_KEYWORDS)) {
    return {
      intent: "GOAL_ANALYSIS",
      confidence: "high",
      reason: "goal_analysis_detected"
    };
  }

  if (includesAnyKeyword(normalizedMessage, SPENDING_KEYWORDS)) {
    return {
      intent: "SPENDING_ANALYSIS",
      confidence: "high",
      reason: "spending_analysis_detected"
    };
  }

  if (includesAnyKeyword(normalizedMessage, INCOME_KEYWORDS)) {
    return {
      intent: "INCOME_ANALYSIS",
      confidence: "high",
      reason: "income_analysis_detected"
    };
  }

  if (includesAnyKeyword(normalizedMessage, SUMMARY_KEYWORDS)) {
    return {
      intent: "FINANCIAL_SUMMARY",
      confidence: "medium",
      reason: "financial_summary_detected"
    };
  }

  return {
    intent: "FINANCIAL_SUMMARY",
    confidence: "low",
    reason: "financial_context_detected"
  };
}

export function isAiIntentAllowed(message: string) {
  return classifyAiIntent(message).intent !== "OUT_OF_SCOPE";
}