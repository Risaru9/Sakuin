import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import { sendGenericPushNotification } from "../reminders/reminder.service.js";
import {
  createGeminiTextProvider,
  type AiTextProvider
} from "./ai.provider.js";
import { classifyAiIntent } from "./ai.intent.js";
import { selectAiModelPlan } from "./ai-model-router.js";
import { buildRuleBasedTransactionDrafts } from "./ai-transaction-draft.js";
import {
  analyzeFinancialScenario,
  buildFinancialScenarioPromptContext,
  type FinancialScenarioAnalysis
} from "./ai-financial-scenario.js";
import {
  analyzePurchaseDecision,
  buildPurchaseDecisionPromptContext,
  type PurchaseDecisionAnalysis
} from "./ai-purchase-decision.js";
import {
  getAiFinancialContext,
  type AiFinancialContext
} from "./ai-financial-context.js";
import {
  buildFinancialCheckup,
  type FinancialCheckupResult
} from "../finance/financial-checkup.js";
import type {
  AiChatCard,
  AiChatHistoryMessage,
  AiChatResponse,
  AiChatServiceInput,
  AiIntent,
  AiTransactionDraft
} from "./ai.types.js";

const OUT_OF_SCOPE_REPLY =
  "Maaf, Asisten Sakuin hanya bisa membantu pertanyaan seputar keuangan pribadi di Sakuin, seperti transaksi, pemasukan, pengeluaran, goals, budget, dan ringkasan keuangan.";

const DEFAULT_SUGGESTIONS = [
  "Buat ringkasan kondisi keuangan saya",
  "Pengeluaran bulan ini gimana?",
  "Saya boros di kategori apa?",
  "Apakah saya masih aman jajan hari ini?",
  "Bagaimana cara menghemat minggu ini?",
  "Target tabungan saya masih realistis?",
  "Apa tindakan keuangan terbaik hari ini?",
  "Bantu saya memahami pola pengeluaran saya"
];

const TRANSACTION_DRAFT_SUGGESTIONS = [
  "Catat makan ayam geprek 15000",
  "Catat bensin 30000 kemarin",
  "Catat dikasih kakak 100000",
  "Lihat pengeluaran bulan ini"
];

const MAX_RESPONSE_SUGGESTIONS = 4;
const AI_CATEGORY_DOMINANCE_WARNING_SHARE = 40;
const AI_MATERIAL_EXPENSE_THRESHOLD = 100_000;
const AI_MATERIAL_EXPENSE_RATIO_THRESHOLD = 20;
const AI_REPEATED_CATEGORY_TRANSACTION_THRESHOLD = 8;
const AI_MIN_TRANSACTIONS_FOR_CATEGORY_RISK = 5;
const MAX_AI_REPLY_CHARS = 6000;

const CONTEXTUAL_FOLLOW_UP_KEYWORDS = [
  "kalau",
  "kalo",
  "bagaimana jika",
  "gimana jika",
  "jika",
  "berarti",
  "itu",
  "tersebut",
  "opsi",
  "alternatif",
  "lebih realistis",
  "lebih aman",
  "low risk",
  "risiko",
  "risk",
  "bulan",
  "tahun",
  "deadline",
  "target",
  "harga",
  "seharga",
  "beli",
  "membeli",
  "android",
  "iphone",
  "handphone",
  "hp",
  "motor",
  "mobil",
  "laptop"
];

const CONTINUATION_FOLLOW_UP_KEYWORDS = [
  "lanjut",
  "lanjutannya",
  "lanjutkan",
  "terus",
  "teruskan",
  "sambung",
  "sambungkan",
  "detailnya",
  "jelaskan lagi",
  "penjelasan lanjut",
  "apa lanjutannya",
  "bagian lanjutannya",
  "next",
  "continue"
];

type AiChatServiceOptions = {
  provider?: AiTextProvider;
};

type FinancialHealthStatus =
  | "Aman"
  | "Cukup aman"
  | "Waspada ringan"
  | "Berisiko"
  | "Belum bisa dinilai";

type FinancialHealthSnapshot = {
  status: FinancialHealthStatus;
  expenseToIncomeRatio: number | null;
  netCashflow: number;
  safeBalanceLimit: number;
  availableUntilSafeLimit: number;
  suggestedDailyLimit: number | null;
  reason: string;
  advice: string;
  riskSignals: string[];
};

type SpendingPatternStatus =
  | "Terkendali"
  | "Perlu dikontrol"
  | "Meningkat tajam"
  | "Belum cukup data";

type SpendingPatternInsight = {
  status: SpendingPatternStatus;
  topCategoryName: string | null;
  topCategoryAmount: number;
  topCategoryTransactionCount: number;
  topCategoryExpenseShare: number;
  topCategoryIncomeShare: number;
  topCategoryPreviousAmount: number;
  topCategoryChangePercent: number | null;
  expenseChangePercent: number | null;
  mainDriver: string;
  advice: string;
  riskSignals: string[];
};

type ConsultantActionPriority =
  | "Aman"
  | "Pantau"
  | "Kurangi"
  | "Tahan"
  | "Belum bisa dinilai";

type ConsultantActionPlan = {
  priority: ConsultantActionPriority;
  mainAction: string;
  reason: string;
  nextStep: string;
  focusCategoryName: string | null;
  guardrail: string;
  riskSignals: string[];
};

function logAiProviderEvent(
  event: "ai.provider_used" | "ai.provider_fallback",
  metadata: Record<string, unknown>
) {
  console.log(
    JSON.stringify({
      level: "info",
      event,
      ...metadata,
      timestamp: new Date().toISOString()
    })
  );
}

function sanitizeChatHistory(history: AiChatHistoryMessage[] = []) {
  return history
    .filter((message) => {
      const content = message.content.trim();

      return (
        content.length > 0 &&
        (message.role === "user" || message.role === "assistant")
      );
    })
    .slice(-12)
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 1500)
    }));
}

function buildConversationHistoryText(history: AiChatHistoryMessage[] = []) {
  const sanitizedHistory = sanitizeChatHistory(history);

  if (sanitizedHistory.length === 0) {
    return "Tidak ada konteks percakapan sebelumnya.";
  }

  return sanitizedHistory
    .map((message, index) => {
      const speaker = message.role === "user" ? "USER" : "ASSISTANT";

      return `${index + 1}. ${speaker}: ${message.content}`;
    })
    .join("\n");
}

function looksLikeContextualFinancialFollowUp(message: string) {
  const normalizedMessage = message.toLowerCase();

  return (
    CONTEXTUAL_FOLLOW_UP_KEYWORDS.some((keyword) =>
      normalizedMessage.includes(keyword)
    ) || /\d/.test(normalizedMessage)
  );
}

function looksLikeContinuationFollowUp(message: string) {
  const normalizedMessage = message.toLowerCase().trim();

  if (!normalizedMessage || normalizedMessage.length > 120) {
    return false;
  }

  return CONTINUATION_FOLLOW_UP_KEYWORDS.some((keyword) =>
    normalizedMessage.includes(keyword)
  );
}

function inferRecentFinancialIntentFromHistory(
  history: AiChatHistoryMessage[] = []
): AiIntent | null {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const historyMessage = history[index];

    if (historyMessage.role !== "user") {
      continue;
    }

    const content = historyMessage.content.trim();

    if (!content) {
      continue;
    }

    const classification = classifyAiIntent(content);

    if (
      classification.intent !== "OUT_OF_SCOPE" &&
      classification.intent !== "TRANSACTION_DRAFT"
    ) {
      return classification.intent;
    }
  }

  return null;
}

function classifyAiChatMessage(
  message: string,
  history: AiChatHistoryMessage[] = []
) {
  const directClassification = classifyAiIntent(message);

  if (directClassification.intent !== "OUT_OF_SCOPE") {
    return directClassification;
  }

  if (history.length === 0) {
    return directClassification;
  }

  const isContextualFollowUp = looksLikeContextualFinancialFollowUp(message);
  const isContinuationFollowUp = looksLikeContinuationFollowUp(message);

  if (!isContextualFollowUp && !isContinuationFollowUp) {
    return directClassification;
  }

  const recentFinancialIntent = inferRecentFinancialIntentFromHistory(history);

  if (isContinuationFollowUp && recentFinancialIntent) {
    return {
      intent: recentFinancialIntent,
      confidence: "medium" as const,
      reason: "contextual_continuation_follow_up"
    };
  }

  const recentContext = buildConversationHistoryText(history);

  const contextualClassification = classifyAiIntent(
    `${recentContext}\nFOLLOW UP USER MESSAGE:\n${message}`
  );

  if (contextualClassification.intent !== "OUT_OF_SCOPE") {
    return {
      ...contextualClassification,
      reason: `contextual_${contextualClassification.reason}`
    };
  }

  if (recentFinancialIntent) {
    return {
      intent: recentFinancialIntent,
      confidence: "medium" as const,
      reason: "contextual_recent_financial_intent"
    };
  }

  return directClassification;
}

function toNumber(value: string | number | null | undefined) {
  const numberValue = Number(value ?? 0);

  if (Number.isNaN(numberValue)) {
    return 0;
  }

  return numberValue;
}

function formatRupiah(value: string | number | null | undefined) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(toNumber(value));
}

function formatPercent(value: number | null) {
  if (value === null) {
    return "Belum bisa dibandingkan";
  }

  if (value > 0) {
    return `+${value}%`;
  }

  return `${value}%`;
}

function formatRatio(value: number | null) {
  if (value === null) {
    return "Belum bisa dinilai";
  }

  return `${value}%`;
}

function formatChangePercent(value: number | null) {
  if (value === null) {
    return "Baru / belum ada pembanding";
  }

  return formatPercent(value);
}

function roundOneDecimal(value: number) {
  return Number(value.toFixed(1));
}

function calculateExpenseRatio(input: {
  income: number;
  expense: number;
}) {
  if (input.income <= 0) {
    return null;
  }

  return roundOneDecimal((input.expense / input.income) * 100);
}

function isMaterialExpenseCategoryConcern(input: {
  transactionCount: number;
  totalExpense: number;
  expenseToIncomeRatio: number | null;
  categoryExpenseShare: number;
  categoryIncomeShare: number;
  categoryTransactionCount: number;
}) {
  if (input.categoryExpenseShare < AI_CATEGORY_DOMINANCE_WARNING_SHARE) {
    return false;
  }

  if (input.totalExpense < AI_MATERIAL_EXPENSE_THRESHOLD) {
    return false;
  }

  const hasMeaningfulExpenseRatio =
    input.expenseToIncomeRatio !== null &&
    input.expenseToIncomeRatio >= AI_MATERIAL_EXPENSE_RATIO_THRESHOLD;

  const hasEnoughTransactions =
    input.transactionCount >= AI_MIN_TRANSACTIONS_FOR_CATEGORY_RISK;

  const categoryUsesLargeIncomeShare = input.categoryIncomeShare >= 30;

  const categoryIsRepeatedOften =
    input.categoryTransactionCount >= AI_REPEATED_CATEGORY_TRANSACTION_THRESHOLD;

  return (
    hasMeaningfulExpenseRatio ||
    hasEnoughTransactions ||
    categoryUsesLargeIncomeShare ||
    categoryIsRepeatedOften
  );
}

function isMaterialIncrease(input: {
  amount: number;
  changePercent: number | null;
  threshold: number;
}) {
  return (
    input.amount >= AI_MATERIAL_EXPENSE_THRESHOLD &&
    input.changePercent !== null &&
    input.changePercent >= input.threshold
  );
}

function calculateNumericChangePercent(currentValue: number, previousValue: number) {
  if (previousValue === 0) {
    if (currentValue === 0) {
      return 0;
    }

    return null;
  }

  return roundOneDecimal(((currentValue - previousValue) / previousValue) * 100);
}

function getTopExpenseCategory(context: AiFinancialContext) {
  return context.currentMonth.topExpenseCategories[0] ?? null;
}

function hasCurrentMonthTransactions(context: AiFinancialContext) {
  return context.currentMonth.transactionCount > 0;
}

function buildCards(items: AiChatCard[]) {
  return items;
}

function getRemainingDaysInCurrentPeriod(context: AiFinancialContext) {
  const generatedAt = new Date(context.generatedAt);
  const periodEnd = new Date(context.currentMonth.endDate);
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const remainingDays = Math.ceil(
    (periodEnd.getTime() - generatedAt.getTime()) / millisecondsPerDay
  );

  return Math.max(1, remainingDays);
}

function findPreviousCategoryAmount(
  context: AiFinancialContext,
  categoryName: string
) {
  const previousCategory = context.previousMonth.topExpenseCategories.find(
    (category) => category.name.toLowerCase() === categoryName.toLowerCase()
  );

  return previousCategory ? toNumber(previousCategory.amount) : 0;
}

function buildFinancialHealthSnapshot(
  context: AiFinancialContext
): FinancialHealthSnapshot {
  const income = toNumber(context.currentMonth.totalIncome);
  const expense = toNumber(context.currentMonth.totalExpense);
  const netCashflow = toNumber(context.currentMonth.netCashflow);
  const safeBalanceLimit = toNumber(context.safeBalanceLimit);
  const transactionCount = context.currentMonth.transactionCount;

  const expenseToIncomeRatio =
    income > 0 ? roundOneDecimal((expense / income) * 100) : null;
  const availableUntilSafeLimit = Math.max(0, netCashflow - safeBalanceLimit);
  const suggestedDailyLimit =
    availableUntilSafeLimit > 0
      ? Math.floor(
          availableUntilSafeLimit / getRemainingDaysInCurrentPeriod(context)
        )
      : null;

  const riskSignals: string[] = [];

  if (transactionCount === 0) {
    return {
      status: "Belum bisa dinilai",
      expenseToIncomeRatio,
      netCashflow,
      safeBalanceLimit,
      availableUntilSafeLimit,
      suggestedDailyLimit,
      reason:
        "Belum ada transaksi bulan ini, jadi kesehatan finansial belum bisa dinilai secara akurat.",
      advice:
        "Mulai catat pemasukan dan pengeluaran beberapa hari agar analisisnya lebih relevan.",
      riskSignals: []
    };
  }

  if (income <= 0 && expense > 0) {
    riskSignals.push("Belum ada pemasukan tercatat bulan ini.");
  }

  if (netCashflow < 0) {
    riskSignals.push("Pengeluaran bulan ini lebih besar daripada pemasukan.");
  }

  if (expenseToIncomeRatio !== null && expenseToIncomeRatio >= 70) {
    riskSignals.push("Rasio pengeluaran terhadap pemasukan sudah tinggi.");
  }

  if (safeBalanceLimit > 0 && netCashflow < safeBalanceLimit) {
    riskSignals.push("Arus kas bersih bulan ini masih di bawah batas aman.");
  }

  if (income <= 0 && expense > 0) {
    return {
      status: "Berisiko",
      expenseToIncomeRatio,
      netCashflow,
      safeBalanceLimit,
      availableUntilSafeLimit,
      suggestedDailyLimit,
      reason:
        "Ada pengeluaran tercatat, tetapi belum ada pemasukan bulan ini. Kondisi ini perlu dipantau agar saldo tidak terus berkurang.",
      advice:
        "Catat pemasukan jika memang sudah ada, lalu tahan dulu pengeluaran non-prioritas sampai arus kas lebih jelas.",
      riskSignals
    };
  }

  if (netCashflow < 0) {
    return {
      status: "Berisiko",
      expenseToIncomeRatio,
      netCashflow,
      safeBalanceLimit,
      availableUntilSafeLimit,
      suggestedDailyLimit,
      reason:
        "Pengeluaran bulan ini sudah melebihi pemasukan, sehingga arus kas bersih negatif.",
      advice:
        "Prioritaskan pengeluaran wajib dan hentikan dulu pengeluaran non-prioritas sampai pemasukan berikutnya.",
      riskSignals
    };
  }

  if (expenseToIncomeRatio !== null && expenseToIncomeRatio >= 90) {
    return {
      status: "Berisiko",
      expenseToIncomeRatio,
      netCashflow,
      safeBalanceLimit,
      availableUntilSafeLimit,
      suggestedDailyLimit,
      reason:
        "Pengeluaran sudah mendekati seluruh pemasukan bulan ini, sehingga ruang aman sangat tipis.",
      advice:
        "Kurangi kategori terbesar dan pertahankan dana cadangan agar tidak turun di bawah batas aman.",
      riskSignals
    };
  }

  if (safeBalanceLimit > 0 && netCashflow < safeBalanceLimit) {
    return {
      status: "Waspada ringan",
      expenseToIncomeRatio,
      netCashflow,
      safeBalanceLimit,
      availableUntilSafeLimit,
      suggestedDailyLimit,
      reason:
        "Arus kas masih positif, tetapi posisinya belum melewati batas aman yang kamu tetapkan.",
      advice:
        "Tahan pengeluaran non-prioritas dan coba arahkan sisa uang ke saldo aman terlebih dahulu.",
      riskSignals
    };
  }

  if (expenseToIncomeRatio !== null && expenseToIncomeRatio >= 70) {
    return {
      status: "Waspada ringan",
      expenseToIncomeRatio,
      netCashflow,
      safeBalanceLimit,
      availableUntilSafeLimit,
      suggestedDailyLimit,
      reason:
        "Arus kas masih positif, tetapi porsi pengeluaran terhadap pemasukan cukup tinggi.",
      advice:
        suggestedDailyLimit
          ? `Coba batasi pengeluaran harian sekitar ${formatRupiah(
              suggestedDailyLimit
            )} agar sisa bulan ini tetap terkendali.`
          : "Fokus kurangi kategori pengeluaran terbesar agar cashflow tetap sehat.",
      riskSignals
    };
  }

  if (expenseToIncomeRatio !== null && expenseToIncomeRatio <= 50) {
    return {
      status: "Aman",
      expenseToIncomeRatio,
      netCashflow,
      safeBalanceLimit,
      availableUntilSafeLimit,
      suggestedDailyLimit,
      reason:
        "Pengeluaran masih relatif rendah dibanding pemasukan dan arus kas bulan ini positif.",
      advice:
        "Pertahankan pola ini dan arahkan sebagian surplus ke goal atau dana aman.",
      riskSignals
    };
  }

  return {
    status: "Cukup aman",
    expenseToIncomeRatio,
    netCashflow,
    safeBalanceLimit,
    availableUntilSafeLimit,
    suggestedDailyLimit,
    reason:
      "Arus kas bulan ini masih positif dan pengeluaran belum masuk kategori berisiko tinggi.",
    advice:
      "Tetap pantau kategori pengeluaran terbesar agar kondisi tetap stabil sampai akhir bulan.",
    riskSignals
  };
}

function buildSpendingPatternInsight(
  context: AiFinancialContext
): SpendingPatternInsight {
  const totalExpense = toNumber(context.currentMonth.totalExpense);
  const totalIncome = toNumber(context.currentMonth.totalIncome);
  const topCategory = getTopExpenseCategory(context);

  if (totalExpense <= 0 || !topCategory) {
    return {
      status: "Belum cukup data",
      topCategoryName: null,
      topCategoryAmount: 0,
      topCategoryTransactionCount: 0,
      topCategoryExpenseShare: 0,
      topCategoryIncomeShare: 0,
      topCategoryPreviousAmount: 0,
      topCategoryChangePercent: null,
      expenseChangePercent: context.monthComparison.expenseChangePercent,
      mainDriver:
        "Belum ada data pengeluaran yang cukup untuk membaca pola boros bulan ini.",
      advice:
        "Catat beberapa transaksi pengeluaran terlebih dahulu agar pola pengeluaran bisa dianalisis.",
      riskSignals: []
    };
  }

  const topCategoryAmount = toNumber(topCategory.amount);
  const topCategoryPreviousAmount = findPreviousCategoryAmount(
    context,
    topCategory.name
  );
  const topCategoryChangePercent = calculateNumericChangePercent(
    topCategoryAmount,
    topCategoryPreviousAmount
  );
  const expenseChangePercent = context.monthComparison.expenseChangePercent;
  const riskSignals: string[] = [];

  const expenseToIncomeRatio = calculateExpenseRatio({
    income: totalIncome,
    expense: totalExpense
  });

  const isTopCategoryMaterialConcern = isMaterialExpenseCategoryConcern({
    transactionCount: context.currentMonth.transactionCount,
    totalExpense,
    expenseToIncomeRatio,
    categoryExpenseShare: topCategory.percentageOfExpense,
    categoryIncomeShare: totalIncome > 0 ? topCategory.percentageOfIncome : 0,
    categoryTransactionCount: topCategory.transactionCount
  });

  const isTopCategoryLargeIncomeShare =
    topCategory.percentageOfIncome >= 30 &&
    topCategoryAmount >= AI_MATERIAL_EXPENSE_THRESHOLD;

  const isTopCategoryRepeatedOften =
    topCategory.transactionCount >= AI_REPEATED_CATEGORY_TRANSACTION_THRESHOLD &&
    totalExpense >= AI_MATERIAL_EXPENSE_THRESHOLD;

  const totalExpenseIncreasedMaterially = isMaterialIncrease({
    amount: totalExpense,
    changePercent: expenseChangePercent,
    threshold: 40
  });

  const topCategoryIncreasedMaterially = isMaterialIncrease({
    amount: topCategoryAmount,
    changePercent: topCategoryChangePercent,
    threshold: 50
  });

  if (isTopCategoryMaterialConcern) {
    riskSignals.push(
      "Satu kategori mengambil porsi besar dari total pengeluaran bulan ini."
    );
  }

  if (isTopCategoryLargeIncomeShare) {
    riskSignals.push(
      "Kategori terbesar sudah memakai porsi besar dari pemasukan bulan ini."
    );
  }

  if (totalExpenseIncreasedMaterially) {
    riskSignals.push("Total pengeluaran naik cukup besar dibanding bulan lalu.");
  }

  if (
    topCategoryChangePercent === null &&
    topCategoryAmount >= AI_MATERIAL_EXPENSE_THRESHOLD &&
    topCategoryPreviousAmount === 0
  ) {
    riskSignals.push(
      "Kategori terbesar belum terlihat pada pembanding bulan lalu."
    );
  }

  if (topCategoryIncreasedMaterially) {
    riskSignals.push("Kategori terbesar naik cukup besar dibanding bulan lalu.");
  }

  if (isTopCategoryRepeatedOften) {
    riskSignals.push(
      "Kategori terbesar muncul cukup sering, jadi kemungkinan dipengaruhi transaksi kecil yang berulang."
    );
  }

  if (totalExpenseIncreasedMaterially || topCategoryIncreasedMaterially) {
    return {
      status: "Meningkat tajam",
      topCategoryName: topCategory.name,
      topCategoryAmount,
      topCategoryTransactionCount: topCategory.transactionCount,
      topCategoryExpenseShare: topCategory.percentageOfExpense,
      topCategoryIncomeShare: totalIncome > 0 ? topCategory.percentageOfIncome : 0,
      topCategoryPreviousAmount,
      topCategoryChangePercent,
      expenseChangePercent,
      mainDriver: `Pengeluaran bulan ini terlihat meningkat, dengan kategori ${topCategory.name} sebagai kontributor utama.`,
      advice:
        "Fokus turunkan kategori terbesar terlebih dahulu karena dampaknya paling terasa terhadap total pengeluaran.",
      riskSignals
    };
  }

  if (
    isTopCategoryMaterialConcern ||
    isTopCategoryLargeIncomeShare ||
    isTopCategoryRepeatedOften
  ) {
    return {
      status: "Perlu dikontrol",
      topCategoryName: topCategory.name,
      topCategoryAmount,
      topCategoryTransactionCount: topCategory.transactionCount,
      topCategoryExpenseShare: topCategory.percentageOfExpense,
      topCategoryIncomeShare: totalIncome > 0 ? topCategory.percentageOfIncome : 0,
      topCategoryPreviousAmount,
      topCategoryChangePercent,
      expenseChangePercent,
      mainDriver: `Kategori ${topCategory.name} adalah prioritas kontrol karena porsinya paling besar bulan ini.`,
      advice:
        "Pasang batas mingguan untuk kategori ini dan pantau transaksi kecil yang sering berulang.",
      riskSignals
    };
  }

  return {
    status: "Terkendali",
    topCategoryName: topCategory.name,
    topCategoryAmount,
    topCategoryTransactionCount: topCategory.transactionCount,
    topCategoryExpenseShare: topCategory.percentageOfExpense,
    topCategoryIncomeShare: totalIncome > 0 ? topCategory.percentageOfIncome : 0,
    topCategoryPreviousAmount,
    topCategoryChangePercent,
    expenseChangePercent,
    mainDriver:
      topCategory.percentageOfExpense >= AI_CATEGORY_DOMINANCE_WARNING_SHARE
        ? `Kategori terbesar bulan ini adalah ${topCategory.name}, tetapi nominal dan rasionya belum terlihat sebagai risiko besar.`
        : `Kategori terbesar bulan ini adalah ${topCategory.name}, tetapi porsinya belum terlihat terlalu dominan.`,
    advice:
      "Pertahankan pola saat ini dan tetap catat transaksi rutin agar pola pengeluaran terbaca lebih akurat.",
    riskSignals
  };
}

function buildFinancialHealthCards(
  snapshot: FinancialHealthSnapshot
): AiChatCard[] {
  const cards: AiChatCard[] = [
    {
      label: "Status Finansial",
      value: snapshot.status
    },
    {
      label: "Rasio Pengeluaran",
      value: formatRatio(snapshot.expenseToIncomeRatio)
    },
    {
      label: "Arus Kas Bersih",
      value: formatRupiah(snapshot.netCashflow)
    }
  ];

  if (snapshot.safeBalanceLimit > 0) {
    cards.push({
      label: "Batas Aman",
      value: formatRupiah(snapshot.safeBalanceLimit)
    });
  }

  if (snapshot.suggestedDailyLimit !== null) {
    cards.push({
      label: "Batas Harian Aman",
      value: formatRupiah(snapshot.suggestedDailyLimit)
    });
  }

  return cards;
}

function buildSpendingPatternCards(
  insight: SpendingPatternInsight
): AiChatCard[] {
  const cards: AiChatCard[] = [
    {
      label: "Pola Pengeluaran",
      value: insight.status
    },
    {
      label: "Prioritas Kontrol",
      value: insight.topCategoryName ?? "Belum ada"
    },
    {
      label: "Porsi Expense",
      value:
        insight.topCategoryName === null
          ? "Belum cukup data"
          : `${insight.topCategoryExpenseShare}%`
    }
  ];

  if (insight.topCategoryName) {
    cards.push({
      label: "Nominal Prioritas",
      value: formatRupiah(insight.topCategoryAmount)
    });

    cards.push({
      label: "Frekuensi",
      value: `${insight.topCategoryTransactionCount} transaksi`
    });

    cards.push({
      label: "Tren Kategori",
      value: formatChangePercent(insight.topCategoryChangePercent)
    });
  }

  if (insight.expenseChangePercent !== null) {
    cards.push({
      label: "Tren Total Expense",
      value: formatChangePercent(insight.expenseChangePercent)
    });
  }

  return cards;
}

function formatSafeToSpendStatus(
  status: AiFinancialContext["safeToSpend"]["status"]
) {
  if (status === "SAFE") {
    return "Aman";
  }

  if (status === "WATCH") {
    return "Waspada";
  }

  if (status === "HOLD") {
    return "Tahan";
  }

  return "Belum bisa dinilai";
}

function formatSpendingPaceStatus(
  status: AiFinancialContext["safeToSpend"]["spendingPaceStatus"]
) {
  if (status === "ON_TRACK") {
    return "Sesuai ritme";
  }

  if (status === "WATCH") {
    return "Perlu dipantau";
  }

  if (status === "FAST") {
    return "Terlalu cepat";
  }

  return "Belum bisa dinilai";
}

function buildSafeToSpendCards(context: AiFinancialContext): AiChatCard[] {
  const safeToSpend = context.safeToSpend;

  const cards: AiChatCard[] = [
    {
      label: "Status Aman Pakai",
      value: formatSafeToSpendStatus(safeToSpend.status)
    },
    {
      label: "Sisa Aman Pakai",
      value: formatRupiah(safeToSpend.availableToSpend)
    },
    {
      label: "Ritme Pengeluaran",
      value: formatSpendingPaceStatus(safeToSpend.spendingPaceStatus)
    }
  ];

  if (safeToSpend.suggestedDailyLimit !== null) {
    cards.push({
      label: "Limit Harian Aman",
      value: formatRupiah(safeToSpend.suggestedDailyLimit)
    });
  }

  if (safeToSpend.topRiskCategoryName) {
    cards.push({
      label: "Kategori Risiko",
      value: safeToSpend.topRiskCategoryName
    });
  }

  return cards;
}

function buildSafeToSpendPromptContext(context: AiFinancialContext) {
  const safeToSpend = context.safeToSpend;

  return [
    `Status safe-to-spend: ${formatSafeToSpendStatus(safeToSpend.status)}`,
    `Status ritme pengeluaran: ${formatSpendingPaceStatus(
      safeToSpend.spendingPaceStatus
    )}`,
    `Sisa aman untuk dipakai bulan ini: ${formatRupiah(
      safeToSpend.availableToSpend
    )}`,
    `Batas harian aman: ${
      safeToSpend.suggestedDailyLimit === null
        ? "Belum bisa dihitung"
        : formatRupiah(safeToSpend.suggestedDailyLimit)
    }`,
    `Sisa hari periode berjalan: ${safeToSpend.remainingDays}`,
    `Rasio pengeluaran terhadap pemasukan: ${formatRatio(
      safeToSpend.expenseToIncomeRatio
    )}`,
    `Progress bulan berjalan: ${safeToSpend.monthProgressPercent}%`,
    `Pace pengeluaran terhadap pemasukan: ${
      safeToSpend.expensePacePercent === null
        ? "Belum bisa dinilai"
        : `${safeToSpend.expensePacePercent}%`
    }`,
    `Proyeksi pengeluaran akhir bulan: ${formatRupiah(
      safeToSpend.projectedMonthEndExpense
    )}`,
    `Proyeksi cashflow akhir bulan: ${formatRupiah(
      safeToSpend.projectedNetCashflow
    )}`,
    `Kategori risiko utama: ${
      safeToSpend.topRiskCategoryName ?? "Belum ada"
    }`,
    `Nominal kategori risiko utama: ${formatRupiah(
      safeToSpend.topRiskCategoryAmount
    )}`,
    `Alasan safe-to-spend: ${safeToSpend.reason}`,
    `Aksi safe-to-spend: ${safeToSpend.action}`,
    `Warning safe-to-spend: ${
      safeToSpend.warnings.length > 0
        ? safeToSpend.warnings.join("; ")
        : "Tidak ada warning besar"
    }`
  ].join("\n");
}

function buildSafeToSpendReplySegment(context: AiFinancialContext) {
  const safeToSpend = context.safeToSpend;

  if (safeToSpend.status === "UNKNOWN") {
    return "Safe-to-spend belum bisa dihitung akurat karena data transaksi bulan ini belum cukup.";
  }

  const dailyLimitText =
    safeToSpend.suggestedDailyLimit === null
      ? "Batas harian aman belum bisa dihitung."
      : `Batas harian aman sekitar ${formatRupiah(
          safeToSpend.suggestedDailyLimit
        )}.`;

  return `Status aman pakai: ${formatSafeToSpendStatus(
    safeToSpend.status
  )}. Sisa aman bulan ini ${formatRupiah(
    safeToSpend.availableToSpend
  )}. ${dailyLimitText}`;
}

function formatHabitStatus(
  status: NonNullable<AiFinancialContext["habit"]>["habitStatus"]
) {
  if (status === "NO_DATA") {
    return "Belum ada data";
  }

  if (status === "LIGHT") {
    return "Data masih ringan";
  }

  if (status === "STALE") {
    return "Perlu diperbarui";
  }

  return "Aktif";
}

function buildHabitPromptContext(context: AiFinancialContext) {
  const habit = context.habit;

  if (!habit) {
    return "Habit snapshot belum tersedia.";
  }

  return [
    `Status habit pencatatan: ${formatHabitStatus(habit.habitStatus)}`,
    `Hari dengan transaksi bulan ini: ${habit.currentMonthTransactionDays} dari ${habit.currentMonthDaysElapsed} hari berjalan`,
    `Kelengkapan hari pencatatan bulan ini: ${habit.currentMonthCompletenessPercent}%`,
    `Status review harian: ${habit.completionStatus}`,
    `Aksi habit yang disarankan: ${habit.recommendedAction}`,
    `Transaksi hari ini: ${habit.transactionsToday}`,
    `Transaksi expense hari ini: ${habit.expenseTransactionsToday}`,
    `Transaksi income hari ini: ${habit.todayIncomeCount}`,
    `Streak pencatatan saat ini: ${habit.currentStreakDays} hari`,
    `Hari aktif minggu ini: ${habit.weeklyActiveDays}`,
    `Tanggal transaksi terakhir: ${
      habit.lastTransactionDate ?? "Belum ada"
    }`,
    `Jarak dari transaksi terakhir: ${
      habit.daysSinceLastTransaction === null
        ? "Belum ada transaksi"
        : `${habit.daysSinceLastTransaction} hari`
    }`,
    `Transaksi 7 hari terakhir: ${habit.last7DaysTransactionCount}`,
    `Expense 7 hari terakhir: ${formatRupiah(habit.last7DaysExpense)}`,
    `Kategori expense terbesar 7 hari terakhir: ${
      habit.last7DaysTopExpenseCategory
        ? `${habit.last7DaysTopExpenseCategory.name} (${formatRupiah(
            habit.last7DaysTopExpenseCategory.amount
          )}, ${habit.last7DaysTopExpenseCategory.transactionCount} transaksi)`
        : "Belum ada"
    }`,
    `Pesan habit: ${habit.habitMessage}`,
    `Pesan habit harian: ${habit.habitMessageDetail.title} ${habit.habitMessageDetail.description}`
  ].join("\n");
}

function formatFinancialCheckupStatus(status: FinancialCheckupResult["status"]) {
  if (status === "GOOD") {
    return "Baik";
  }

  if (status === "WATCH") {
    return "Waspada";
  }

  if (status === "RISK") {
    return "Berisiko";
  }

  return "Belum lengkap";
}

function formatFinancialCheckupPriority(
  priority: FinancialCheckupResult["priority"]
) {
  if (priority === "MAINTAIN") {
    return "Pertahankan";
  }

  if (priority === "MONITOR") {
    return "Pantau";
  }

  if (priority === "REDUCE") {
    return "Kurangi";
  }

  if (priority === "HOLD") {
    return "Tahan";
  }

  return "Lengkapi data";
}

function buildFinancialCheckupCards(
  checkup: FinancialCheckupResult
): AiChatCard[] {
  const cards: AiChatCard[] = [
    {
      label: "Status Checkup",
      value: formatFinancialCheckupStatus(checkup.status)
    },
    {
      label: "Prioritas Checkup",
      value: formatFinancialCheckupPriority(checkup.priority)
    },
    {
      label: "Fokus Checkup",
      value: checkup.focusCategoryName ?? "Belum ada"
    },
    {
      label: "Cashflow",
      value: formatRupiah(checkup.metrics.netCashflow)
    },
    {
      label: "Rasio Expense",
      value: formatRatio(checkup.metrics.expenseToIncomeRatio)
    },
    {
      label: "Sisa Aman",
      value: formatRupiah(checkup.metrics.availableToSpend)
    }
  ];

  if (checkup.metrics.suggestedDailyLimit !== null) {
    cards.push({
      label: "Limit Harian Aman",
      value: formatRupiah(checkup.metrics.suggestedDailyLimit)
    });
  }

  return cards;
}

function buildFinancialCheckupPromptContext(context: AiFinancialContext) {
  const checkup = buildFinancialCheckup(context);

  return [
    `Status checkup: ${formatFinancialCheckupStatus(checkup.status)}`,
    `Prioritas checkup: ${formatFinancialCheckupPriority(checkup.priority)}`,
    `Judul checkup: ${checkup.title}`,
    `Headline checkup: ${checkup.headline}`,
    `Fokus kategori: ${checkup.focusCategoryName ?? "Belum ada"}`,
    `Nominal fokus kategori: ${formatRupiah(checkup.focusCategoryAmount)}`,
    `Alasan checkup: ${checkup.reason}`,
    `Aksi checkup: ${checkup.action}`,
    `Total pemasukan bulan ini: ${formatRupiah(checkup.metrics.totalIncome)}`,
    `Total pengeluaran bulan ini: ${formatRupiah(checkup.metrics.totalExpense)}`,
    `Cashflow bulan ini: ${formatRupiah(checkup.metrics.netCashflow)}`,
    `Rasio expense terhadap income: ${formatRatio(
      checkup.metrics.expenseToIncomeRatio
    )}`,
    `Perubahan expense dibanding bulan lalu: ${formatChangePercent(
      checkup.metrics.expenseChangePercent
    )}`,
    `Status safe-to-spend: ${formatSafeToSpendStatus(
      checkup.metrics.safeToSpendStatus
    )}`,
    `Ritme pengeluaran: ${formatSpendingPaceStatus(
      checkup.metrics.spendingPaceStatus
    )}`,
    `Sisa aman bulan ini: ${formatRupiah(checkup.metrics.availableToSpend)}`,
    `Limit harian aman: ${
      checkup.metrics.suggestedDailyLimit === null
        ? "Belum bisa dihitung"
        : formatRupiah(checkup.metrics.suggestedDailyLimit)
    }`,
    `Proyeksi cashflow akhir bulan: ${formatRupiah(
      checkup.metrics.projectedNetCashflow
    )}`,
    `Warning checkup: ${
      checkup.warnings.length > 0
        ? checkup.warnings.join("; ")
        : "Tidak ada warning besar"
    }`
  ].join("\n");
}

function buildFinancialCheckupReplySegment(checkup: FinancialCheckupResult) {
  return `Checkup keuangan: ${formatFinancialCheckupStatus(
    checkup.status
  )}. Fokus: ${
    checkup.focusCategoryName ?? "belum ada kategori khusus"
  }. ${checkup.headline} Aksi utama: ${checkup.action}`;
}

function buildFinancialHealthPromptContext(snapshot: FinancialHealthSnapshot) {
  return [
    `Status kesehatan finansial: ${snapshot.status}`,
    `Rasio pengeluaran terhadap pemasukan: ${formatRatio(
      snapshot.expenseToIncomeRatio
    )}`,
    `Arus kas bersih bulan ini: ${formatRupiah(snapshot.netCashflow)}`,
    `Safe balance limit: ${formatRupiah(snapshot.safeBalanceLimit)}`,
    `Sisa ruang aman terhadap safe balance: ${formatRupiah(
      snapshot.availableUntilSafeLimit
    )}`,
    `Batas pengeluaran harian aman: ${
      snapshot.suggestedDailyLimit === null
        ? "Belum bisa dihitung"
        : formatRupiah(snapshot.suggestedDailyLimit)
    }`,
    `Alasan status: ${snapshot.reason}`,
    `Saran utama: ${snapshot.advice}`,
    `Sinyal risiko: ${
      snapshot.riskSignals.length > 0
        ? snapshot.riskSignals.join("; ")
        : "Tidak ada sinyal risiko besar"
    }`
  ].join("\n");
}

function buildSpendingPatternPromptContext(insight: SpendingPatternInsight) {
  return [
    `Status pola pengeluaran: ${insight.status}`,
    `Kategori prioritas kontrol: ${insight.topCategoryName ?? "Belum ada"}`,
    `Nominal kategori prioritas: ${formatRupiah(insight.topCategoryAmount)}`,
    `Frekuensi kategori prioritas: ${insight.topCategoryTransactionCount} transaksi`,
    `Porsi kategori terhadap total pengeluaran: ${insight.topCategoryExpenseShare}%`,
    `Porsi kategori terhadap pemasukan: ${insight.topCategoryIncomeShare}%`,
    `Nominal kategori yang sama bulan lalu: ${formatRupiah(
      insight.topCategoryPreviousAmount
    )}`,
    `Perubahan kategori prioritas dari bulan lalu: ${formatChangePercent(
      insight.topCategoryChangePercent
    )}`,
    `Perubahan total pengeluaran dari bulan lalu: ${formatChangePercent(
      insight.expenseChangePercent
    )}`,
    `Penyebab utama: ${insight.mainDriver}`,
    `Saran utama: ${insight.advice}`,
    `Sinyal risiko: ${
      insight.riskSignals.length > 0
        ? insight.riskSignals.join("; ")
        : "Tidak ada sinyal risiko besar"
    }`
  ].join("\n");
}

function buildConsultantActionPlan(input: {
  healthSnapshot: FinancialHealthSnapshot;
  spendingInsight: SpendingPatternInsight;
}): ConsultantActionPlan {
  const { healthSnapshot, spendingInsight } = input;
  const focusCategoryName = spendingInsight.topCategoryName;

  if (
    healthSnapshot.status === "Belum bisa dinilai" &&
    spendingInsight.status === "Belum cukup data"
  ) {
    return {
      priority: "Belum bisa dinilai",
      mainAction: "Catat pemasukan dan pengeluaran beberapa hari dulu",
      reason:
        "Data transaksi belum cukup untuk menentukan tindakan finansial yang benar-benar relevan.",
      nextStep:
        "Mulai dari mencatat transaksi harian utama agar pola pemasukan dan pengeluaran bisa terbaca.",
      focusCategoryName: null,
      guardrail:
        "Jangan ambil keputusan besar dari data yang belum lengkap. Kumpulkan data dulu agar analisis lebih akurat.",
      riskSignals: []
    };
  }

  if (healthSnapshot.status === "Berisiko") {
    return {
      priority: "Tahan",
      mainAction: "Tahan pengeluaran non-prioritas terlebih dahulu",
      reason:
        "Kondisi finansial sedang berisiko, sehingga tindakan paling aman adalah menjaga cashflow sebelum menambah pengeluaran baru.",
      nextStep: focusCategoryName
        ? `Fokus tahan atau kurangi kategori ${focusCategoryName} terlebih dahulu karena kategori itu paling terlihat memengaruhi pengeluaran.`
        : "Prioritaskan kebutuhan wajib dan hentikan dulu pengeluaran yang bisa ditunda.",
      focusCategoryName,
      guardrail:
        "Jangan menambah cicilan, pembelian besar, atau komitmen finansial baru sampai cashflow kembali stabil.",
      riskSignals: [
        ...healthSnapshot.riskSignals,
        ...spendingInsight.riskSignals
      ].slice(0, 4)
    };
  }

  if (spendingInsight.status === "Meningkat tajam") {
    return {
      priority: "Kurangi",
      mainAction: focusCategoryName
        ? `Kurangi kategori ${focusCategoryName} terlebih dahulu`
        : "Kurangi kategori pengeluaran yang naik paling besar",
      reason:
        "Ada sinyal kenaikan pengeluaran yang cukup tajam, sehingga prioritasnya adalah menekan sumber kenaikan terbesar.",
      nextStep: focusCategoryName
        ? `Tetapkan batas mingguan untuk ${focusCategoryName} dan cek transaksi kecil yang berulang.`
        : "Tetapkan batas mingguan untuk kategori pengeluaran terbesar.",
      focusCategoryName,
      guardrail:
        "Jangan memangkas semua kategori sekaligus. Fokus ke satu kategori terbesar agar tindakan lebih realistis.",
      riskSignals: [
        ...healthSnapshot.riskSignals,
        ...spendingInsight.riskSignals
      ].slice(0, 4)
    };
  }

  if (
    healthSnapshot.status === "Waspada ringan" ||
    spendingInsight.status === "Perlu dikontrol"
  ) {
    return {
      priority: "Kurangi",
      mainAction: focusCategoryName
        ? `Kurangi dan pantau kategori ${focusCategoryName}`
        : "Kurangi pengeluaran non-prioritas",
      reason:
        "Kondisi masih bisa dikendalikan, tetapi ada sinyal pengeluaran yang perlu dikontrol sebelum menjadi risiko lebih besar.",
      nextStep: focusCategoryName
        ? `Buat batas sederhana untuk ${focusCategoryName}, lalu evaluasi lagi setelah beberapa transaksi berikutnya.`
        : "Tahan pengeluaran non-prioritas dan pantau cashflow sampai akhir periode.",
      focusCategoryName,
      guardrail:
        "Tetap sisakan ruang untuk kebutuhan wajib dan saldo aman sebelum menambah goal baru.",
      riskSignals: [
        ...healthSnapshot.riskSignals,
        ...spendingInsight.riskSignals
      ].slice(0, 4)
    };
  }

  if (healthSnapshot.status === "Cukup aman") {
    return {
      priority: "Pantau",
      mainAction: "Pantau pengeluaran terbesar sampai akhir bulan",
      reason:
        "Cashflow masih cukup aman, tetapi pengeluaran terbesar tetap perlu dipantau agar tidak naik perlahan.",
      nextStep: focusCategoryName
        ? `Pantau kategori ${focusCategoryName} dan pertahankan batas pengeluaran yang realistis.`
        : "Pantau transaksi rutin dan pertahankan cashflow positif.",
      focusCategoryName,
      guardrail:
        "Boleh lanjut dengan rencana keuangan ringan, tetapi hindari keputusan besar tanpa menghitung dampaknya ke cashflow.",
      riskSignals: [
        ...healthSnapshot.riskSignals,
        ...spendingInsight.riskSignals
      ].slice(0, 4)
    };
  }

  return {
    priority: "Aman",
    mainAction: "Pertahankan pola pengeluaran saat ini",
    reason:
      "Pengeluaran masih relatif terkendali dan belum ada sinyal risiko besar dari data bulan ini.",
    nextStep: focusCategoryName
      ? `Tetap pantau kategori ${focusCategoryName}, lalu arahkan surplus ke goal atau saldo aman.`
      : "Pertahankan pencatatan rutin dan arahkan surplus ke goal atau saldo aman.",
    focusCategoryName,
    guardrail:
      "Tetap hindari pembelian impulsif dan pastikan saldo aman tidak terganggu.",
    riskSignals: [
      ...healthSnapshot.riskSignals,
      ...spendingInsight.riskSignals
    ].slice(0, 4)
  };
}

function buildConsultantActionCards(plan: ConsultantActionPlan): AiChatCard[] {
  const cards: AiChatCard[] = [
    {
      label: "Prioritas Aksi",
      value: plan.priority
    },
    {
      label: "Langkah Utama",
      value: plan.mainAction
    }
  ];

  if (plan.focusCategoryName) {
    cards.push({
      label: "Fokus Kategori",
      value: plan.focusCategoryName
    });
  }

  return cards;
}

function buildConsultantActionPromptContext(plan: ConsultantActionPlan) {
  return [
    `Prioritas aksi: ${plan.priority}`,
    `Langkah utama: ${plan.mainAction}`,
    `Alasan: ${plan.reason}`,
    `Langkah berikutnya: ${plan.nextStep}`,
    `Fokus kategori: ${plan.focusCategoryName ?? "Tidak ada kategori spesifik"}`,
    `Guardrail: ${plan.guardrail}`,
    `Sinyal risiko pendukung: ${
      plan.riskSignals.length > 0
        ? plan.riskSignals.join("; ")
        : "Tidak ada sinyal risiko besar"
    }`
  ].join("\n");
}

function buildUniqueSuggestions(suggestions: string[]) {
  const seenSuggestions = new Set<string>();
  const uniqueSuggestions: string[] = [];

  for (const suggestion of suggestions) {
    const normalizedSuggestion = suggestion.trim();

    if (!normalizedSuggestion) {
      continue;
    }

    const suggestionKey = normalizedSuggestion.toLowerCase();

    if (seenSuggestions.has(suggestionKey)) {
      continue;
    }

    seenSuggestions.add(suggestionKey);
    uniqueSuggestions.push(normalizedSuggestion);

    if (uniqueSuggestions.length >= MAX_RESPONSE_SUGGESTIONS) {
      break;
    }
  }

  return uniqueSuggestions;
}

function buildActionPlanSuggestions(input: {
  actionPlan: ConsultantActionPlan;
  spendingInsight: SpendingPatternInsight;
}) {
  const focusCategoryName = input.spendingInsight.topCategoryName;

  if (input.actionPlan.priority === "Tahan") {
    return [
      "Saya harus kurangi apa dulu?",
      "Berapa batas harian yang aman?",
      "Bandingkan dengan bulan lalu",
      "Lihat pengeluaran bulan ini"
    ];
  }

  if (input.actionPlan.priority === "Kurangi") {
    return [
      focusCategoryName
        ? `Buat batas ${focusCategoryName}`
        : "Buat batas pengeluaran",
      "Berapa batas harian yang aman?",
      "Bandingkan dengan bulan lalu",
      "Lihat ringkasan keuangan"
    ];
  }

  if (input.actionPlan.priority === "Pantau") {
    return [
      "Apa yang harus saya pantau?",
      "Bandingkan dengan bulan lalu",
      "Target tabungan saya realistis?",
      "Lihat ringkasan keuangan"
    ];
  }

  if (input.actionPlan.priority === "Aman") {
    return [
      "Apakah target tabungan saya aman?",
      "Boleh tambah goal baru?",
      "Bandingkan dengan bulan lalu",
      "Lihat ringkasan keuangan"
    ];
  }

  return [
    "Pengeluaran saya bulan ini gimana?",
    "Catat makan ayam geprek 15000",
    "Target tabungan saya realistis?",
    "Lihat ringkasan keuangan"
  ];
}

function buildDynamicFinancialSuggestions(input: {
  intent: Exclude<AiIntent, "OUT_OF_SCOPE" | "TRANSACTION_DRAFT">;
  healthSnapshot: FinancialHealthSnapshot;
  spendingInsight: SpendingPatternInsight;
  actionPlan: ConsultantActionPlan;
}) {
  const focusCategoryName = input.spendingInsight.topCategoryName;
  const actionSuggestions = buildActionPlanSuggestions({
    actionPlan: input.actionPlan,
    spendingInsight: input.spendingInsight
  });

  if (input.intent === "FINANCIAL_SUMMARY") {
    return buildUniqueSuggestions([
      ...actionSuggestions,
      "Saya boros di mana?",
      "Kasih saran hemat",
      "Target tabungan saya realistis?"
    ]);
  }

  if (input.intent === "SPENDING_ANALYSIS") {
    return buildUniqueSuggestions([
      "Kasih saran hemat",
      focusCategoryName
        ? `Kenapa ${focusCategoryName} besar?`
        : "Kenapa pengeluaran saya besar?",
      "Bandingkan bulan ini dan bulan lalu",
      "Berapa batas harian yang aman?",
      ...actionSuggestions
    ]);
  }

  if (input.intent === "SAVING_ADVICE") {
    return buildUniqueSuggestions([
      focusCategoryName
        ? `Buat batas ${focusCategoryName}`
        : "Buat batas pengeluaran",
      "Berapa batas harian yang aman?",
      "Bandingkan dengan bulan lalu",
      "Lihat pengeluaran bulan ini",
      ...actionSuggestions
    ]);
  }

  if (input.intent === "INCOME_ANALYSIS") {
    return buildUniqueSuggestions([
      "Bandingkan pemasukan bulan ini",
      "Lihat ringkasan keuangan",
      "Saya boros di mana?",
      "Catat dikasih kakak 100000"
    ]);
  }

  if (input.intent === "PERIOD_COMPARISON") {
    return buildUniqueSuggestions([
      "Kenapa pengeluaran berubah?",
      "Kategori mana yang naik?",
      "Kasih saran hemat",
      "Lihat ringkasan keuangan",
      ...actionSuggestions
    ]);
  }

  if (input.intent === "GOAL_ANALYSIS") {
    return buildUniqueSuggestions([
      "Target ini realistis?",
      "Berapa harus nabung per bulan?",
      "Apa risikonya?",
      "Kasih skenario lebih aman"
    ]);
  }

  return buildUniqueSuggestions([
    ...actionSuggestions,
    ...DEFAULT_SUGGESTIONS
  ]);
}

function buildScenarioCards(
  scenario: FinancialScenarioAnalysis
): AiChatCard[] {
  if (!scenario.detected) {
    return [];
  }

  const cards: AiChatCard[] = [];

  if (scenario.targetAmount) {
    cards.push({
      label: "Target",
      value: formatRupiah(scenario.targetAmount)
    });
  }

  if (scenario.monthlyIncome) {
    cards.push({
      label: "Pendapatan",
      value: formatRupiah(scenario.monthlyIncome)
    });
  }

  if (scenario.options.length > 0) {
    const lowestRiskOption = [...scenario.options].sort(
      (a, b) => a.monthlyRequired - b.monthlyRequired
    )[0];

    const highestRiskOption = [...scenario.options].sort(
      (a, b) => b.monthlyRequired - a.monthlyRequired
    )[0];

    if (scenario.options.length === 1) {
      cards.push({
        label: "Butuh / Bulan",
        value: formatRupiah(lowestRiskOption.monthlyRequired)
      });

      cards.push({
        label: "Verdict",
        value: lowestRiskOption.verdict
      });
    } else {
      cards.push({
        label: "Termurah / Bulan",
        value: formatRupiah(lowestRiskOption.monthlyRequired)
      });

      cards.push({
        label: "Terberat / Bulan",
        value: formatRupiah(highestRiskOption.monthlyRequired)
      });
    }
  } else if (scenario.missingFields.length > 0) {
    cards.push({
      label: "Data Kurang",
      value: scenario.missingFields.join(", ")
    });
  }

  return cards;
}

function mergeUniqueCards(cards: AiChatCard[], extraCards: AiChatCard[]) {
  const existingLabels = new Set(cards.map((card) => card.label));

  return [
    ...cards,
    ...extraCards.filter((card) => !existingLabels.has(card.label))
  ];
}

function enrichResponseWithScenario(
  response: AiChatResponse,
  scenario: FinancialScenarioAnalysis
): AiChatResponse {
  if (!scenario.detected) {
    return response;
  }

  return {
    ...response,
    cards: mergeUniqueCards(response.cards, buildScenarioCards(scenario))
  };
}

function buildPurchaseDecisionCards(
  decision: PurchaseDecisionAnalysis
): AiChatCard[] {
  if (!decision.detected) {
    return [];
  }

  const cards: AiChatCard[] = [
    {
      label: "Keputusan Pembelian",
      value:
        decision.status === "SAFE_TO_BUY"
          ? "Relatif aman"
          : decision.status === "LIMITED"
            ? "Boleh terbatas"
            : decision.status === "HOLD"
              ? "Tahan dulu"
              : "Belum bisa dinilai"
    },
    {
      label: "Nominal Pembelian",
      value:
        decision.purchaseAmount === null
          ? "Tidak terdeteksi"
          : formatRupiah(decision.purchaseAmount)
    },
    {
      label: "Risk Level",
      value: decision.riskLevel
    },
    {
      label: "Sisa Setelah Beli",
      value:
        decision.availableToSpendAfterPurchase === null
          ? "Belum bisa dihitung"
          : formatRupiah(decision.availableToSpendAfterPurchase)
    },
    {
      label: "Status Aman Pakai",
      value: formatSafeToSpendStatus(decision.safeToSpendStatus)
    }
  ];

  if (decision.suggestedDailyLimit !== null) {
    cards.push({
      label: "Limit Harian Aman",
      value: formatRupiah(decision.suggestedDailyLimit)
    });
  }

  if (decision.topRiskCategoryName) {
    cards.push({
      label: "Fokus Risiko",
      value: decision.topRiskCategoryName
    });
  }

  return cards;
}

function buildPurchaseDecisionReply(decision: PurchaseDecisionAnalysis) {
  const itemText = decision.itemName ? ` ${decision.itemName}` : "";
  const amountText =
    decision.purchaseAmount === null
      ? "nominal pembelian belum terdeteksi"
      : `nominalnya ${formatRupiah(decision.purchaseAmount)}`;

  const priority =
    decision.status === "SAFE_TO_BUY"
      ? `pembelian${itemText} relatif aman`
      : decision.status === "LIMITED"
        ? `pembelian${itemText} boleh dipertimbangkan secara terbatas`
        : decision.status === "HOLD"
          ? `tahan pembelian${itemText} dulu`
          : "data pembelian belum cukup untuk dinilai";

  const afterPurchaseText =
    decision.availableToSpendAfterPurchase === null
      ? null
      : `Sisa aman setelah pembelian menjadi ${formatRupiah(
          decision.availableToSpendAfterPurchase
        )}.`;

  const dailyLimitText =
    decision.suggestedDailyLimit === null
      ? null
      : `Limit harian aman saat ini sekitar ${formatRupiah(
          decision.suggestedDailyLimit
        )}.`;

  const focusText = decision.topRiskCategoryName
    ? `Fokus risiko sekarang ada di kategori ${decision.topRiskCategoryName}.`
    : null;

  const warningText =
    decision.warnings.length > 0 ? `Catatan: ${decision.warnings[0]}` : null;

  const supportingDetails = [
    `${amountText}.`,
    afterPurchaseText,
    dailyLimitText,
    focusText,
    warningText
  ]
    .filter(Boolean)
    .join(" ");

  return `Prioritas: ${priority}. Alasan: ${decision.reason} ${supportingDetails} Aksi: ${decision.action}`;
}

function enrichResponseWithPurchaseDecision(
  response: AiChatResponse,
  decision: PurchaseDecisionAnalysis
): AiChatResponse {
  if (!decision.detected) {
    return response;
  }

  return {
    ...response,
    reply: buildPurchaseDecisionReply(decision),
    cards: mergeUniqueCards(response.cards, buildPurchaseDecisionCards(decision)),
    suggestions: buildUniqueSuggestions([
      "Berapa batas harian yang aman?",
      "Kalau saya tunda gimana?",
      "Saya harus kurangi apa dulu?",
      "Lihat ringkasan keuangan"
    ])
  };
}

function buildOutOfScopeResponse(): AiChatResponse {
  return {
    intent: "OUT_OF_SCOPE",
    reply: OUT_OF_SCOPE_REPLY,
    cards: [],
    suggestions: DEFAULT_SUGGESTIONS
  };
}

function buildTransactionDraftResponse(
  drafts: AiTransactionDraft[]
): AiChatResponse {
  const primaryDraft = drafts[0];
  const isMultiDraft = drafts.length > 1;
  const readyDraftCount = drafts.filter(
    (draft) => draft.missingFields.length === 0
  ).length;

  const totalAmount = drafts.reduce((total, draft) => {
    return total + toNumber(draft.amount);
  }, 0);

  const isPrimaryReadyToSave = primaryDraft.missingFields.length === 0;
  const isEveryDraftReadyToSave = drafts.every(
    (draft) => draft.missingFields.length === 0
  );

  if (isMultiDraft) {
    return {
      intent: "TRANSACTION_DRAFT",
      reply: isEveryDraftReadyToSave
        ? `Saya menemukan ${drafts.length} draft transaksi dari pesanmu. Silakan review masing-masing draft sebelum disimpan.`
        : `Saya menemukan ${drafts.length} draft transaksi dari pesanmu, tetapi ada draft yang masih perlu dilengkapi sebelum bisa disimpan.`,
      cards: buildCards([
        {
          label: "Jumlah Draft",
          value: String(drafts.length)
        },
        {
          label: "Siap Disimpan",
          value: `${readyDraftCount}/${drafts.length}`
        },
        {
          label: "Total Nominal",
          value: formatRupiah(totalAmount)
        },
        {
          label: "Status",
          value: isEveryDraftReadyToSave ? "Siap direview" : "Perlu dilengkapi"
        }
      ]),
      suggestions: isEveryDraftReadyToSave
        ? [
            "Simpan semua draft",
            "Review draft dulu",
            "Batalkan draft",
            "Catat transaksi lain"
          ]
        : ["Lengkapi draft", "Batalkan draft", "Catat transaksi lain"],
      transactionDraft: primaryDraft,
      transactionDrafts: drafts
    };
  }

  return {
    intent: "TRANSACTION_DRAFT",
    reply: isPrimaryReadyToSave
      ? "Saya sudah membuat draft transaksi. Silakan review dulu sebelum disimpan."
      : "Saya sudah mencoba membuat draft transaksi, tetapi masih ada data yang perlu dilengkapi sebelum bisa disimpan.",
    cards: buildCards([
      {
        label: "Tipe",
        value: primaryDraft.type === "INCOME" ? "Pemasukan" : "Pengeluaran"
      },
      {
        label: "Nominal",
        value: primaryDraft.amount
          ? formatRupiah(primaryDraft.amount)
          : "Belum terdeteksi"
      },
      {
        label: "Kategori",
        value: primaryDraft.categoryName ?? "Perlu dipilih"
      },
      {
        label: "Tanggal",
        value: primaryDraft.date
      },
      {
        label: "Status",
        value: isPrimaryReadyToSave ? "Siap direview" : "Perlu dilengkapi"
      }
    ]),
    suggestions: isPrimaryReadyToSave
      ? ["Simpan draft ini", "Edit draft", "Batalkan draft", "Catat transaksi lain"]
      : ["Lengkapi nominal", "Pilih kategori", "Batalkan draft"],
    transactionDraft: primaryDraft,
    transactionDrafts: drafts
  };
}

function buildFinancialSummaryResponse(
  context: AiFinancialContext
): AiChatResponse {
  const healthSnapshot = buildFinancialHealthSnapshot(context);
  const spendingInsight = buildSpendingPatternInsight(context);
  const actionPlan = buildConsultantActionPlan({
    healthSnapshot,
    spendingInsight
  });
  const checkup = buildFinancialCheckup(context);
  const checkupText = buildFinancialCheckupReplySegment(checkup);

  const suggestions = buildDynamicFinancialSuggestions({
    intent: "FINANCIAL_SUMMARY",
    healthSnapshot,
    spendingInsight,
    actionPlan
  });

  if (!hasCurrentMonthTransactions(context)) {
    return {
      intent: "FINANCIAL_SUMMARY",
      reply: `Belum ada data transaksi bulan ini. ${checkupText} Prioritas: ${actionPlan.mainAction}. Alasan: data transaksi belum cukup untuk menilai kesehatan finansial secara akurat. Aksi: ${actionPlan.nextStep}`,
      cards: buildCards([
        ...buildFinancialCheckupCards(checkup),
        {
          label: "Status Finansial",
          value: healthSnapshot.status
        },
        ...buildConsultantActionCards(actionPlan),
        ...buildSafeToSpendCards(context),
        {
          label: "Pemasukan",
          value: formatRupiah(context.currentMonth.totalIncome)
        },
        {
          label: "Pengeluaran",
          value: formatRupiah(context.currentMonth.totalExpense)
        },
        {
          label: "Jumlah Transaksi",
          value: String(context.currentMonth.transactionCount)
        }
      ]),
      suggestions
    };
  }

  const topCategory = getTopExpenseCategory(context);
  const topCategoryText = topCategory
    ? `Kategori pengeluaran terbesar adalah ${topCategory.name} sebesar ${formatRupiah(
        topCategory.amount
      )}.`
    : "Belum ada kategori pengeluaran yang dominan.";

  return {
    intent: "FINANCIAL_SUMMARY",
    reply: `Status kesehatan keuanganmu bulan ini: ${healthSnapshot.status}. ${checkupText} Prioritas: ${actionPlan.mainAction}. Alasan: ${checkup.reason} Bulan ini pemasukanmu ${formatRupiah(
      context.currentMonth.totalIncome
    )}, pengeluaranmu ${formatRupiah(
      context.currentMonth.totalExpense
    )}, dan arus kas bersihmu ${formatRupiah(
      context.currentMonth.netCashflow
    )}. ${topCategoryText} Aksi: ${checkup.action}`,
    cards: buildCards([
      ...buildFinancialCheckupCards(checkup),
      ...buildFinancialHealthCards(healthSnapshot),
      ...buildSafeToSpendCards(context),
      ...buildConsultantActionCards(actionPlan),
      {
        label: "Pemasukan",
        value: formatRupiah(context.currentMonth.totalIncome)
      },
      {
        label: "Pengeluaran",
        value: formatRupiah(context.currentMonth.totalExpense)
      },
      {
        label: "Jumlah Transaksi",
        value: String(context.currentMonth.transactionCount)
      }
    ]),
    suggestions
  };
}

function buildSpendingAnalysisResponse(
  context: AiFinancialContext
): AiChatResponse {
  const topCategory = getTopExpenseCategory(context);
  const healthSnapshot = buildFinancialHealthSnapshot(context);
  const spendingInsight = buildSpendingPatternInsight(context);
  const actionPlan = buildConsultantActionPlan({
    healthSnapshot,
    spendingInsight
  });

  const suggestions = buildDynamicFinancialSuggestions({
    intent: "SPENDING_ANALYSIS",
    healthSnapshot,
    spendingInsight,
    actionPlan
  });

  if (toNumber(context.currentMonth.totalExpense) <= 0 || !topCategory) {
    return {
      intent: "SPENDING_ANALYSIS",
      reply: `Belum ada data pengeluaran bulan ini. Prioritas: ${actionPlan.mainAction}. Alasan: pola boros belum bisa dibaca tanpa transaksi pengeluaran yang cukup. Aksi: ${actionPlan.nextStep}`,
      cards: buildCards([
        {
          label: "Total Pengeluaran",
          value: formatRupiah(context.currentMonth.totalExpense)
        },
        {
          label: "Status Finansial",
          value: healthSnapshot.status
        },
        ...buildConsultantActionCards(actionPlan),
        ...buildSpendingPatternCards(spendingInsight),
        {
          label: "Jumlah Transaksi",
          value: String(context.currentMonth.transactionCount)
        }
      ]),
      suggestions
    };
  }

  const categoryTrendText =
    spendingInsight.topCategoryChangePercent === null
      ? "Kategori ini belum punya pembanding kuat dari bulan lalu."
      : `Dibanding bulan lalu, kategori ini berubah ${formatChangePercent(
          spendingInsight.topCategoryChangePercent
        )}.`;

  const expenseTrendText =
    context.monthComparison.expenseChangePercent === null
      ? "Total pengeluaran belum punya pembanding kuat dari bulan lalu."
      : `Total pengeluaran berubah ${formatChangePercent(
          context.monthComparison.expenseChangePercent
        )} dibanding bulan lalu.`;

  const lowExpenseDominantCategoryNote =
    spendingInsight.status === "Terkendali" &&
    spendingInsight.topCategoryName &&
    spendingInsight.topCategoryExpenseShare >= AI_CATEGORY_DOMINANCE_WARNING_SHARE
      ? "Meski porsinya terlihat besar, nominalnya belum terlihat sebagai risiko besar."
      : "";

  const priorityText =
    spendingInsight.status === "Terkendali"
      ? `pantau ${topCategory.name} tanpa perlu over-warning`
      : `fokus ke ${topCategory.name} dulu`;

  const actionText =
    spendingInsight.status === "Terkendali"
      ? spendingInsight.advice
      : actionPlan.nextStep;

  return {
    intent: "SPENDING_ANALYSIS",
    reply: `Pengeluaranmu bulan ini ${formatRupiah(
      context.currentMonth.totalExpense
    )}. Prioritas: ${priorityText}. Alasan: ${spendingInsight.mainDriver} ${lowExpenseDominantCategoryNote} ${expenseTrendText} ${categoryTrendText} Aksi: ${actionText}`,
    cards: buildCards([
      {
        label: "Total Pengeluaran",
        value: formatRupiah(context.currentMonth.totalExpense)
      },
      {
        label: "Status Finansial",
        value: healthSnapshot.status
      },
      ...buildConsultantActionCards(actionPlan),
      {
        label: "Rasio Pengeluaran",
        value: formatRatio(healthSnapshot.expenseToIncomeRatio)
      },
      {
        label: "Kategori Terbesar",
        value: topCategory.name
      },
      {
        label: "Nominal Kategori",
        value: formatRupiah(topCategory.amount)
      },
      ...buildSpendingPatternCards(spendingInsight)
    ]),
    suggestions
  };
}

function buildIncomeAnalysisResponse(
  context: AiFinancialContext
): AiChatResponse {
const healthSnapshot = buildFinancialHealthSnapshot(context);
const spendingInsight = buildSpendingPatternInsight(context);
const actionPlan = buildConsultantActionPlan({
  healthSnapshot,
  spendingInsight
});
const suggestions = buildDynamicFinancialSuggestions({
  intent: "INCOME_ANALYSIS",
  healthSnapshot,
  spendingInsight,
  actionPlan
});

  if (toNumber(context.currentMonth.totalIncome) <= 0) {
    return {
      intent: "INCOME_ANALYSIS",
      reply:
        "Belum ada data pemasukan bulan ini. Jika kamu mencatat gaji, bonus, atau pemasukan lain, saya bisa bantu membacanya sebagai ringkasan.",
      cards: buildCards([
        {
          label: "Total Pemasukan",
          value: formatRupiah(context.currentMonth.totalIncome)
        },
        {
          label: "Perubahan dari Bulan Lalu",
          value: formatPercent(context.monthComparison.incomeChangePercent)
        }
      ]),
      suggestions
    };
  }

  return {
    intent: "INCOME_ANALYSIS",
    reply: `Pemasukanmu bulan ini ${formatRupiah(
      context.currentMonth.totalIncome
    )}. Dibanding bulan lalu, perubahan pemasukanmu adalah ${formatPercent(
      context.monthComparison.incomeChangePercent
    )}.`,
    cards: buildCards([
      {
        label: "Pemasukan Bulan Ini",
        value: formatRupiah(context.currentMonth.totalIncome)
      },
      {
        label: "Pemasukan Bulan Lalu",
        value: formatRupiah(context.previousMonth.totalIncome)
      },
      {
        label: "Perubahan",
        value: formatPercent(context.monthComparison.incomeChangePercent)
      }
    ]),
    suggestions
  };
}

function buildPeriodComparisonResponse(
  context: AiFinancialContext
): AiChatResponse {
  const healthSnapshot = buildFinancialHealthSnapshot(context);
  const spendingInsight = buildSpendingPatternInsight(context);
  const actionPlan = buildConsultantActionPlan({
  healthSnapshot,
  spendingInsight
});
const suggestions = buildDynamicFinancialSuggestions({
  intent: "PERIOD_COMPARISON",
  healthSnapshot,
  spendingInsight,
  actionPlan
});

  return {
    intent: "PERIOD_COMPARISON",
    reply: `Dibanding bulan lalu, pengeluaranmu berubah ${formatPercent(
      context.monthComparison.expenseChangePercent
    )}, sedangkan pemasukanmu berubah ${formatPercent(
      context.monthComparison.incomeChangePercent
    )}. Status finansial bulan ini: ${healthSnapshot.status}. Pola pengeluaran bulan ini: ${
      spendingInsight.status
    }. ${spendingInsight.mainDriver}`,
    cards: buildCards([
      {
        label: "Expense Bulan Ini",
        value: formatRupiah(context.currentMonth.totalExpense)
      },
      {
        label: "Expense Bulan Lalu",
        value: formatRupiah(context.previousMonth.totalExpense)
      },
      {
        label: "Perubahan Expense",
        value: formatPercent(context.monthComparison.expenseChangePercent)
      },
      {
        label: "Perubahan Income",
        value: formatPercent(context.monthComparison.incomeChangePercent)
      },
      {
        label: "Status Finansial",
        value: healthSnapshot.status
      },
      ...buildSpendingPatternCards(spendingInsight)
    ]),
    suggestions
  };
}

function buildSavingAdviceResponse(context: AiFinancialContext): AiChatResponse {
  const topCategory = getTopExpenseCategory(context);
  const healthSnapshot = buildFinancialHealthSnapshot(context);
  const spendingInsight = buildSpendingPatternInsight(context);
  const actionPlan = buildConsultantActionPlan({
    healthSnapshot,
    spendingInsight
  });
  const safeToSpendText = buildSafeToSpendReplySegment(context);
  const suggestions = buildDynamicFinancialSuggestions({
  intent: "SAVING_ADVICE",
  healthSnapshot,
  spendingInsight,
  actionPlan
});

  if (!topCategory) {
    return {
      intent: "SAVING_ADVICE",
      reply: `Langkah paling aman sekarang: ${actionPlan.mainAction}. Prioritas: kumpulkan data transaksi dulu. Alasan: saya belum menemukan kategori pengeluaran yang cukup untuk diberi saran hemat yang akurat. ${safeToSpendText} Aksi: ${actionPlan.nextStep}`,
      cards: buildCards([
        {
          label: "Status Finansial",
          value: healthSnapshot.status
        },
        ...buildConsultantActionCards(actionPlan),
        ...buildSafeToSpendCards(context),
        {
          label: "Total Pengeluaran",
          value: formatRupiah(context.currentMonth.totalExpense)
        },
        ...buildSpendingPatternCards(spendingInsight)
      ]),
      suggestions
    };
  }

  const shouldFocusCategory =
    spendingInsight.status === "Perlu dikontrol" ||
    spendingInsight.status === "Meningkat tajam";

  const categoryAdvice = shouldFocusCategory
    ? topCategory.percentageOfIncome >= 30
      ? `Kategori ${topCategory.name} cukup besar dibanding pemasukanmu bulan ini.`
      : `Kategori ${topCategory.name} menjadi prioritas karena kontribusinya mulai perlu dikontrol.`
    : `Kategori ${topCategory.name} memang menjadi pengeluaran terbesar, tetapi dari data saat ini belum terlihat sebagai risiko besar.`;

  const repeatedTransactionAdvice =
    topCategory.transactionCount >= 8
      ? ` Kategori ini muncul ${topCategory.transactionCount} kali, jadi kemungkinan ada transaksi kecil berulang yang perlu dibatasi.`
      : "";

  const dailyLimitAdvice = healthSnapshot.suggestedDailyLimit
    ? ` Batas harian yang cukup konservatif sekitar ${formatRupiah(
        healthSnapshot.suggestedDailyLimit
      )}.`
    : "";

  return {
    intent: "SAVING_ADVICE",
    reply: `Langkah paling aman sekarang: ${
      actionPlan.mainAction
    }. Prioritas: ${
      shouldFocusCategory ? `fokus ke ${topCategory.name} dulu` : actionPlan.mainAction
    }. Alasan: ${categoryAdvice}${repeatedTransactionAdvice} ${safeToSpendText} Aksi: ${
      actionPlan.nextStep
    }${dailyLimitAdvice}`,
    cards: buildCards([
      {
        label: "Status Finansial",
        value: healthSnapshot.status
      },
      ...buildConsultantActionCards(actionPlan),
      ...buildSafeToSpendCards(context),
      {
        label: "Kategori Prioritas",
        value: topCategory.name
      },
      {
        label: "Nominal",
        value: formatRupiah(topCategory.amount)
      },
      {
        label: "Dari Pemasukan",
        value: `${topCategory.percentageOfIncome}%`
      },
      {
        label: "Batas Harian Aman",
        value: healthSnapshot.suggestedDailyLimit
          ? formatRupiah(healthSnapshot.suggestedDailyLimit)
          : "Belum bisa dihitung"
      },
      ...buildSpendingPatternCards(spendingInsight)
    ]),
    suggestions
  };
}

function buildGoalAnalysisResponse(context: AiFinancialContext): AiChatResponse {
const healthSnapshot = buildFinancialHealthSnapshot(context);
const spendingInsight = buildSpendingPatternInsight(context);
const actionPlan = buildConsultantActionPlan({
  healthSnapshot,
  spendingInsight
});
const suggestions = buildDynamicFinancialSuggestions({
  intent: "GOAL_ANALYSIS",
  healthSnapshot,
  spendingInsight,
  actionPlan
});
  if (context.goals.totalGoals === 0) {
    return {
      intent: "GOAL_ANALYSIS",
      reply:
        "Kamu belum punya goals aktif. Kalau kamu membuat target tabungan, saya bisa bantu membaca progress dan memberi gambaran apakah targetnya masih aman.",
      cards: buildCards([
        {
          label: "Total Goals",
          value: "0"
        }
      ]),
      suggestions
    };
  }

  return {
    intent: "GOAL_ANALYSIS",
    reply: `Kamu punya ${context.goals.totalGoals} goals. ${context.goals.completedGoals} sudah selesai, ${context.goals.activeGoals} masih aktif, dan ${context.goals.overdueGoals} melewati deadline.`,
    cards: buildCards([
      {
        label: "Total Goals",
        value: String(context.goals.totalGoals)
      },
      {
        label: "Selesai",
        value: String(context.goals.completedGoals)
      },
      {
        label: "Aktif",
        value: String(context.goals.activeGoals)
      },
      {
        label: "Overdue",
        value: String(context.goals.overdueGoals)
      }
    ]),
    suggestions
  };
}

function buildFinancialResponse(
  intent: Exclude<AiIntent, "OUT_OF_SCOPE" | "TRANSACTION_DRAFT">,
  context: AiFinancialContext
): AiChatResponse {
  switch (intent) {
    case "FINANCIAL_SUMMARY":
      return buildFinancialSummaryResponse(context);
    case "SPENDING_ANALYSIS":
      return buildSpendingAnalysisResponse(context);
    case "INCOME_ANALYSIS":
      return buildIncomeAnalysisResponse(context);
    case "PERIOD_COMPARISON":
      return buildPeriodComparisonResponse(context);
    case "SAVING_ADVICE":
      return buildSavingAdviceResponse(context);
    case "GOAL_ANALYSIS":
      return buildGoalAnalysisResponse(context);
  }
}

function buildFinancialSystemInstruction() {
  return [
    "Kamu adalah Asisten Sakuin, financial helper untuk aplikasi pencatatan keuangan pribadi Sakuin.",
    "Jawab hanya topik keuangan pribadi di Sakuin: transaksi, pemasukan, pengeluaran, goals, budget, safe balance, cashflow, kesehatan finansial, pola pengeluaran, dan saran hemat ringan.",
    "Jawab pertanyaan user secara langsung. Jangan mengalihkan jawaban ke topik lain.",
    "Gunakan recent conversation context untuk memahami follow-up user seperti 'kalau 8 bulan gimana', 'kalau targetnya naik', 'lanjutannya apa', 'lanjutkan', atau 'terus apa'.",
    "Jika follow-up user merujuk pada konteks sebelumnya, pakai konteks sebelumnya selama masih relevan dengan keuangan pribadi.",
    "Jika user meminta lanjutan seperti 'lanjutannya apa' atau 'lanjutkan', lanjutkan pembahasan finansial dari konteks terakhir tanpa menganggapnya out-of-scope.",
    "Jika konteks sebelumnya tidak cukup untuk menjawab, minta data yang kurang secara singkat.",
    "Jika FINANCIAL HEALTH SNAPSHOT tersedia, gunakan itu untuk menjawab apakah kondisi user aman, waspada, atau berisiko.",
    "Jika SAFE-TO-SPEND SNAPSHOT tersedia, gunakan itu untuk menjawab apakah user masih aman belanja, sisa aman bulan ini, batas harian aman, apakah harus tahan pengeluaran, dan ritme pengeluaran.",
    "Jika FINANCIAL CHECKUP SNAPSHOT tersedia, gunakan itu untuk menjawab checkup keuangan, kesehatan keuangan, kondisi bulan ini sehat atau berisiko, fokus kategori, alasan, dan aksi utama.",
    "Jika SPENDING PATTERN INSIGHT tersedia, gunakan itu untuk menjawab user boros di mana, kategori mana yang perlu dikontrol, dan apa penyebab pengeluaran terasa naik.",
    "Jika HABIT SNAPSHOT tersedia, gunakan itu untuk menilai apakah data user sudah cukup lengkap atau perlu pencatatan rutin tambahan.",
    "Jika FINANCIAL SCENARIO ANALYSIS tersedia, gunakan analisis itu sebagai sumber utama untuk hitungan target, tenor, kebutuhan bulanan, rasio pendapatan, dan verdict risiko.",
    "Jika PURCHASE DECISION IMPACT tersedia, gunakan itu untuk menjawab apakah pembelian langsung seperti beli barang, jajan, atau belanja hari ini aman dilakukan.",
    "Untuk purchase decision, mulai dari keputusan deterministik: relatif aman, boleh terbatas, tahan dulu, atau belum bisa dinilai.",
    "Jika user memberi angka skenario seperti gaji, target harga, tenor, atau deadline, angka user mengalahkan data historis Sakuin untuk analisis skenario tersebut.",
    "Jangan menyimpulkan realistis hanya dari cashflow historis Sakuin. Untuk skenario pembelian/kredit, selalu cek rasio kebutuhan bulanan terhadap pendapatan skenario.",
    "Untuk tenor atau deadline range, bandingkan opsi yang paling berat dan paling ringan.",
    "Jika bunga kredit tidak diketahui, jelaskan bahwa hitungan masih pokok/estimasi kasar dan total biaya bisa lebih tinggi.",
    "Untuk skenario pembelian/kredit, jangan langsung menyuruh user membeli. Beri analisis risiko dan syarat aman.",
    "Jangan mengarang nominal, kategori, transaksi, tanggal, pemasukan, pengeluaran, atau goals yang tidak ada di context atau tidak disebut user.",
    "Boleh melakukan perhitungan sederhana dari angka yang ada di context atau angka yang user berikan.",
    "Jika user bertanya apakah target/goal/kondisi finansial realistis atau aman, wajib beri verdict eksplisit.",
    "Jika user bertanya boros di mana, jawab kategori prioritas kontrol terlebih dahulu.",
    "Jika user bertanya masih aman belanja berapa, boleh jajan berapa, atau batas harian aman, jawab dari SAFE-TO-SPEND SNAPSHOT terlebih dahulu.",
    "Jika user bertanya checkup keuangan, kesehatan keuangan, status keuangan, atau aman/berisiko, jawab dari FINANCIAL CHECKUP SNAPSHOT terlebih dahulu.",
    "Jika user bertanya pengeluaran naik karena apa, jelaskan kategori terbesar, porsinya, frekuensinya, dan tren dibanding bulan lalu jika tersedia.",
    "Untuk analisis kesehatan finansial, gunakan struktur: status, alasan singkat, angka utama, saran aksi.",
    "Untuk analisis pola pengeluaran, gunakan struktur: kategori prioritas, nominal/porsi, tren/frekuensi, saran aksi.",
    "Untuk analisis target/goal, gunakan struktur: verdict, hitungan singkat, risiko utama, saran aksi.",
    "Jika user memberi gaji, target nominal, dan jangka waktu, hitung kebutuhan menabung per bulan.",
    "Jika user tidak memberi target nominal atau deadline, jangan mengarang. Minta data yang kurang secara singkat.",
    "Jika context punya income, expense, dan net cashflow, pakai itu untuk menilai kemampuan menabung.",
    "Jika user memberi angka hipotetis, analisis angka tersebut sebagai skenario, tetapi jelaskan bahwa hasil bergantung pada konsistensi pencatatan dan pengeluaran aktual.",
    "Untuk habit pencatatan, dorong user dengan kalimat ringan dan praktis. Jangan membuat user merasa disalahkan karena belum mencatat.",
    "Jangan menyebut database, backend, JSON, model, API, prompt, atau detail teknis internal.",
    "Jangan memberi nasihat investasi, pinjaman, pajak, hukum, atau keputusan finansial profesional.",
    "Jangan menghakimi user. Hindari kalimat seperti gaji kamu kecil.",
    "Jika data belum cukup, katakan data belum cukup dan sebutkan data apa yang perlu ditambahkan.",
    "Jawaban harus dalam Bahasa Indonesia yang natural, jelas, dan praktis.",
    "Panjang jawaban harus adaptif: pertanyaan sederhana dijawab singkat, evaluasi dijawab medium, analisis lengkap/perbandingan/goal boleh lebih panjang dan detail.",
    "Gaya jawaban default mengikuti pola: PRIORITAS - ALASAN - AKSI, tetapi jangan dipaksakan kaku jika user hanya bertanya singkat atau sedang follow-up.",
    "Mulai jawaban dengan keputusan utama atau prioritas tindakan, bukan pembukaan panjang.",
    "Setelah prioritas, jelaskan alasan berdasarkan data yang tersedia dengan panjang yang sesuai pertanyaan user.",
    "Akhiri dengan 1 sampai 3 aksi konkret yang bisa dilakukan user hari ini.",
    "Hindari jawaban generik seperti 'kurangi pengeluaran' tanpa menyebut kategori, batas, atau langkah praktis jika data tersedia.",
    "Jangan memberi terlalu banyak opsi sekaligus. Pilih tindakan paling berdampak dan paling realistis.",
    "Jangan selalu memaksa jawaban pendek. Untuk pertanyaan kompleks, boleh memakai 4 sampai 7 paragraf pendek atau bullet ringkas jika itu membuat jawaban lebih jelas.",
    "Pastikan jawaban selesai dengan utuh dan tidak menggantung di tengah kalimat.",
    "Untuk pertanyaan analisis kompleks, boleh memakai bullet pendek jika membantu, tetapi tetap pilih poin yang paling relevan.",
    "Jangan gunakan format markdown seperti **bold**, heading markdown, atau tabel markdown. Gunakan teks biasa yang rapi.",
    "Jangan membuat tabel markdown."
  ].join("\n");
}

function buildFinancialPrompt(input: {
  userMessage: string;
  intent: AiIntent;
  context: AiFinancialContext;
  baseResponse: AiChatResponse;
  history?: AiChatHistoryMessage[];
  scenario?: FinancialScenarioAnalysis;
  purchaseDecision?: PurchaseDecisionAnalysis;
}) {
  const healthSnapshot = buildFinancialHealthSnapshot(input.context);
  const spendingInsight = buildSpendingPatternInsight(input.context);
  const actionPlan = buildConsultantActionPlan({
    healthSnapshot,
    spendingInsight
  });

  return [
    "RECENT CONVERSATION CONTEXT:",
    buildConversationHistoryText(input.history),
    "",
    "USER QUESTION:",
    input.userMessage,
    "",
    "DETECTED INTENT:",
    input.intent,
    "",
    "FINANCIAL HEALTH SNAPSHOT:",
    buildFinancialHealthPromptContext(healthSnapshot),
    "",
    "FINANCIAL CHECKUP SNAPSHOT:",
    buildFinancialCheckupPromptContext(input.context),
    "",
    "SAFE-TO-SPEND SNAPSHOT:",
    buildSafeToSpendPromptContext(input.context),
    "",
    "SPENDING PATTERN INSIGHT:",
    buildSpendingPatternPromptContext(spendingInsight),
    "",
    "HABIT SNAPSHOT:",
    buildHabitPromptContext(input.context),
    "",
    "CONSULTANT ACTION PLAN:",
    buildConsultantActionPromptContext(actionPlan),
    "",
    "FINANCIAL SCENARIO ANALYSIS:",
    input.scenario
      ? buildFinancialScenarioPromptContext(input.scenario)
      : "Tidak ada skenario finansial terstruktur terdeteksi.",
    "",
    "PURCHASE DECISION IMPACT:",
    input.purchaseDecision
      ? buildPurchaseDecisionPromptContext(input.purchaseDecision)
      : "Tidak ada keputusan pembelian langsung yang perlu dianalisis.",
    "",
    "SAFE FINANCIAL CONTEXT:",
    JSON.stringify(input.context, null, 2),
    "",
    "DETERMINISTIC BACKEND SUMMARY:",
    input.baseResponse.reply,
    "",
    "ANSWER QUALITY RULES:",
    "- Jawab pertanyaan user secara langsung, natural, dan sesuai konteks pertanyaannya.",
    "- Sesuaikan panjang jawaban dengan pertanyaan user: singkat untuk pertanyaan cepat, medium untuk evaluasi, dan lebih detail untuk analisis lengkap/perbandingan/goal.",
    "- Hindari saran generik; jika data tersedia, sebutkan kategori, batas, nominal, status, atau langkah praktis yang relevan.",
    "- Gunakan struktur jawaban: PRIORITAS - ALASAN - AKSI sebagai default, tetapi jangan terlalu kaku jika user hanya bertanya singkat, meminta klarifikasi, atau sedang follow-up.",
    "- Untuk pertanyaan 'boros di mana', sebutkan kategori prioritas jika memang material. Jika kategori terbesar belum material, jelaskan bahwa kategori itu terbesar sementara tetapi belum menjadi risiko besar.",
    "- Untuk pertanyaan 'apa yang harus saya kurangi', beri satu prioritas utama jika ada sinyal material. Jika belum ada sinyal besar, sarankan tetap pantau dan catat transaksi rutin.",
    "- Untuk pertanyaan realistis/tidak, mulai dengan verdict, lalu jelaskan hitungan dan risiko.",
    "- Untuk follow-up seperti 'lanjutannya apa', 'terus?', 'kalau begitu?', gunakan recent conversation context dan lanjutkan pembahasan terakhir selama masih relevan dengan keuangan pribadi.",
    "- Jangan menakut-nakuti user saat status financial health aman, safe-to-spend aman, dan warning besar tidak ada.",
    "- Jangan menyebut kategori dominan sebagai risiko besar jika nominalnya kecil, rasio pengeluaran rendah, dan backend summary menyatakan tidak ada warning besar.",
    "- Tetap tegas jika status HOLD/RISK, cashflow negatif, pengeluaran mendekati pemasukan, atau ada warning material dari backend.",
    "- Jangan membahas hal yang tidak ditanya kecuali benar-benar membantu keputusan user.",
    "- Jika data kurang, jangan mengarang. Sebutkan data yang kurang secara singkat dan beri langkah berikutnya.",
    "- Jika habit snapshot menunjukkan data masih sedikit atau sudah lama tidak dicatat, beri dorongan ringan untuk mencatat transaksi terbaru tanpa nada menekan.",
    "- Angka penting harus konsisten dengan context, financial health snapshot, safe-to-spend snapshot, spending pattern insight, financial scenario analysis, atau angka yang user berikan.",
    "- Jika financial scenario analysis tersedia, jangan melawan verdict dan hitungan deterministik dari backend.",
    "- Jika financial health snapshot tersedia, jangan melawan status dan alasan deterministik dari backend.",
    "- Jika safe-to-spend snapshot tersedia, jangan melawan status, reason, action, dan warnings dari backend.",
    "- Jangan membocorkan userId, email, token, requestId, catatan transaksi mentah, atau data internal.",
    "- Jangan mengklaim bisa menyimpan transaksi kecuali response memang berupa draft transaksi yang perlu direview user.",
    "",
    "TASK:",
    "Buat jawaban final yang lebih natural, jelas, dan bernilai dari financial context, financial health snapshot, safe-to-spend snapshot, spending pattern insight, consultant action plan, financial scenario analysis, dan deterministic backend summary.",
    "Buat jawaban final yang lebih natural, jelas, dan bernilai dari financial context, financial health snapshot, financial checkup snapshot, safe-to-spend snapshot, spending pattern insight, consultant action plan, financial scenario analysis, purchase decision impact, dan deterministic backend summary.",
    "Gunakan angka yang sama seperti context/backend summary/health snapshot/spending insight/scenario analysis atau angka yang disebut user.",
    "Jangan tambahkan angka baru tanpa dasar.",
    "Jangan terlalu panjang untuk pertanyaan sederhana, tetapi jangan memotong analisis yang memang perlu penjelasan.",
    "Berikan insight dan saran yang langsung bisa dilakukan user.",
    "Pastikan jawaban akhir terasa seperti konsultan keuangan pribadi yang praktis: mulai dari prioritas, jelaskan alasan, lalu beri aksi."
  ].join("\n");
}

function normalizeAiReply(text: string) {
  return text
    .trim()
    .replace(/\n{3,}/g, "\n\n")
    .slice(0, MAX_AI_REPLY_CHARS);
}

async function enhanceFinancialResponseWithAi(input: {
  provider?: AiTextProvider;
  userMessage: string;
  intent: Exclude<AiIntent, "OUT_OF_SCOPE" | "TRANSACTION_DRAFT">;
  context: AiFinancialContext;
  baseResponse: AiChatResponse;
  history?: AiChatHistoryMessage[];
  scenario?: FinancialScenarioAnalysis;
  purchaseDecision?: PurchaseDecisionAnalysis;
}) {
  if (env.NODE_ENV === "test" && !input.provider) {
    return input.baseResponse;
  }

  const modelPlan = selectAiModelPlan({
    intent: input.intent,
    userMessage: input.userMessage,
    history: input.history
  });

  const provider = input.provider ?? createGeminiTextProvider();

  async function generateWithModel(model: string) {
    const result = await provider.generateText({
      systemInstruction: buildFinancialSystemInstruction(),
      prompt: buildFinancialPrompt({
        userMessage: input.userMessage,
        intent: input.intent,
        context: input.context,
        baseResponse: input.baseResponse,
        history: input.history,
        scenario: input.scenario,
        purchaseDecision: input.purchaseDecision
      }),
      model,
      maxOutputTokens: modelPlan.maxOutputTokens,
      temperature: modelPlan.temperature
    });

    const aiReply = normalizeAiReply(result.text);

    if (!aiReply) {
      throw new Error("EmptyAiReply");
    }

    return {
      reply: aiReply,
      model: result.model
    };
  }

  try {
    const result = await generateWithModel(modelPlan.primaryModel);

    logAiProviderEvent("ai.provider_used", {
      intent: input.intent,
      route: modelPlan.route,
      reason: modelPlan.reason,
      model: result.model,
      fallback: false
    });

    return {
      ...input.baseResponse,
      reply: result.reply
    };
  } catch (primaryError) {
    const shouldTryFallback =
      modelPlan.fallbackModel &&
      modelPlan.fallbackModel !== modelPlan.primaryModel;

    logAiProviderEvent("ai.provider_fallback", {
      intent: input.intent,
      route: modelPlan.route,
      reason:
        primaryError instanceof Error
          ? primaryError.name
          : "UnknownAiProviderError",
      model: modelPlan.primaryModel,
      fallbackModel: shouldTryFallback ? modelPlan.fallbackModel : null
    });

    if (!shouldTryFallback) {
      return input.baseResponse;
    }

    try {
      const fallbackResult = await generateWithModel(modelPlan.fallbackModel);

      logAiProviderEvent("ai.provider_used", {
        intent: input.intent,
        route: "default",
        reason: "fallback_model_used",
        model: fallbackResult.model,
        fallback: true
      });

      return {
        ...input.baseResponse,
        reply: fallbackResult.reply
      };
    } catch (fallbackError) {
      logAiProviderEvent("ai.provider_fallback", {
        intent: input.intent,
        route: "default",
        reason:
          fallbackError instanceof Error
            ? fallbackError.name
            : "UnknownAiProviderFallbackError",
        model: modelPlan.fallbackModel,
        fallbackModel: null
      });

      return input.baseResponse;
    }
  }
}

async function saveAssistantResponse(
  userId: string,
  response: AiChatResponse,
  shouldSaveToDb: boolean
): Promise<AiChatResponse & { id?: string }> {
  if (!shouldSaveToDb) {
    return response;
  }

  const assistantMsg = await prisma.chatMessage.create({
    data: {
      userId,
      role: "assistant",
      content: response.reply,
      intent: response.intent,
      cards: response.cards ? (response.cards as any) : undefined,
      suggestions: response.suggestions ? (response.suggestions as any) : undefined,
      transactionDraft: response.transactionDraft ? (response.transactionDraft as any) : undefined,
      transactionDrafts: response.transactionDrafts ? (response.transactionDrafts as any) : undefined
    }
  });

  return {
    ...response,
    id: assistantMsg.id
  };
}

export async function getAiChatResponse(
  input: AiChatServiceInput,
  options: AiChatServiceOptions = {}
): Promise<AiChatResponse & { id?: string }> {
  const normalizedMessage = input.message.trim();

  if (normalizedMessage.length === 0) {
    throw new Error("Pesan tidak boleh kosong");
  }

  // Cek apakah user ada di database
  const userRecord = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true }
  });

  const shouldSaveToDb = !!userRecord;

  let contextHistory: AiChatHistoryMessage[] = [];

  if (shouldSaveToDb) {
    // 1. Ambil riwayat chat SEBELUM menyimpan pesan user saat ini
    // agar konteks tidak terkontaminasi oleh pesan yang sedang diproses
    const dbHistory = await prisma.chatMessage.findMany({
      where: { userId: input.userId },
      orderBy: { createdAt: "desc" },
      take: 12
    });

    const sortedDbHistory = dbHistory.reverse();

    contextHistory = sortedDbHistory
      .filter((msg) => msg.role === "user" || msg.role === "assistant")
      .map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content
      }));
  }

  // Jika riwayat dari DB kosong, gunakan input.history (jika dikirim oleh caller)
  // Ini memastikan test dan integrasi frontend yang mengirim history eksplisit tetap bekerja
  if (contextHistory.length === 0 && input.history && input.history.length > 0) {
    contextHistory = input.history;
  } else if (contextHistory.length > 0 && input.history && input.history.length > 0) {
    // Jika DB history ada tapi lebih pendek dari input.history, coba merge
    // Prioritaskan input.history jika lebih banyak konteks (misal: dari frontend dengan full chat)
    const dbHistoryLength = contextHistory.length;
    const inputHistoryLength = input.history.length;
    if (inputHistoryLength > dbHistoryLength) {
      contextHistory = input.history;
    }
  }

  if (shouldSaveToDb) {
    // 2. Simpan pesan user ke database setelah ambil history
    await prisma.chatMessage.create({
      data: {
        userId: input.userId,
        role: "user",
        content: normalizedMessage
      }
    });
  }

  const classification = classifyAiChatMessage(
    normalizedMessage,
    contextHistory
  );

  if (classification.intent === "OUT_OF_SCOPE") {
    const response = buildOutOfScopeResponse();
    return saveAssistantResponse(input.userId, response, shouldSaveToDb);
  }

  if (classification.intent === "TRANSACTION_DRAFT") {
    const drafts = await buildRuleBasedTransactionDrafts({
      userId: input.userId,
      message: input.message
    });

    const response = buildTransactionDraftResponse(drafts);
    return saveAssistantResponse(input.userId, response, shouldSaveToDb);
  }

  const financialContext = await getAiFinancialContext(input.userId);
  const scenario = analyzeFinancialScenario(
    normalizedMessage,
    contextHistory
  );
  const purchaseDecision = analyzePurchaseDecision(
    normalizedMessage,
    financialContext,
    contextHistory
  );

  const baseResponse = enrichResponseWithPurchaseDecision(
    enrichResponseWithScenario(
      buildFinancialResponse(classification.intent, financialContext),
      scenario
    ),
    purchaseDecision
  );

  const finalResponse = await enhanceFinancialResponseWithAi({
    provider: options.provider,
    userMessage: normalizedMessage,
    intent: classification.intent,
    context: financialContext,
    baseResponse,
    history: contextHistory,
    scenario,
    purchaseDecision
  });

  return saveAssistantResponse(input.userId, finalResponse, shouldSaveToDb);
}

export async function getAiChatHistory(userId: string) {
  const messages = await prisma.chatMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    take: 80
  });

  return messages.map((msg) => ({
    id: msg.id,
    role: msg.role as "user" | "assistant",
    content: msg.content,
    intent: msg.intent ?? undefined,
    cards: msg.cards ? (msg.cards as any) : undefined,
    suggestions: msg.suggestions ? (msg.suggestions as any) : undefined,
    transactionDraft: msg.transactionDraft ? (msg.transactionDraft as any) : undefined,
    transactionDrafts: msg.transactionDrafts ? (msg.transactionDrafts as any) : undefined,
    createdAt: msg.createdAt.toISOString()
  }));
}

export async function clearAiChatHistory(userId: string): Promise<void> {
  await prisma.chatMessage.deleteMany({
    where: { userId }
  });
}

function buildWeeklyInsightPrompt(
  userName: string,
  transactions: any[],
  context: AiFinancialContext
) {
  const expenseSum = transactions
    .filter(t => t.type === "EXPENSE")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  
  const incomeSum = transactions
    .filter(t => t.type === "INCOME")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const categoryExpenses = transactions
    .filter(t => t.type === "EXPENSE")
    .reduce((acc: Record<string, number>, t) => {
      const catName = t.category?.name || "Lainnya";
      acc[catName] = (acc[catName] || 0) + Number(t.amount);
      return acc;
    }, {});

  const sortedCategories = Object.entries(categoryExpenses)
    .sort((a, b) => b[1] - a[1])
    .map(([name, amount]) => `- ${name}: Rp ${amount.toLocaleString("id-ID")}`)
    .join("\n");

  return `
Halo Gemini,
Berikan saran keuangan mingguan (Weekly Financial Insight) untuk pengguna bernama ${userName}.
Berikut adalah rangkuman keuangannya dalam 7 hari terakhir:
- Total Pengeluaran: Rp ${expenseSum.toLocaleString("id-ID")}
- Total Pemasukan: Rp ${incomeSum.toLocaleString("id-ID")}
- Pengeluaran per Kategori:
${sortedCategories || "Tidak ada transaksi pengeluaran."}

Context Keuangan Saat Ini:
- Safe Balance Limit: Rp ${Number(context.safeBalanceLimit).toLocaleString("id-ID")}
- Sisa Safe-to-Spend: Rp ${Number(context.safeToSpend.availableToSpend).toLocaleString("id-ID")}
- Progress Budget Kategori Bulanan: ${JSON.stringify(context.currentMonth.topExpenseCategories)}

Tugasmu:
1. Berikan evaluasi singkat (maks 3-4 kalimat) mengenai pengeluaran minggu ini (misalnya jika ada kategori yang terlalu dominan atau jika pengeluaran melebihi pemasukan).
2. Berikan 2 tips/tindakan hemat yang konkrit, spesifik, dan praktis untuk minggu depan berdasarkan kategori pengeluaran terbesarnya.
3. Gunakan nada bicara yang bersahabat, mendukung (tidak menghakimi), dan profesional dalam Bahasa Indonesia.

Format respons kamu harus berupa string teks markdown yang rapi yang siap ditampilkan ke pengguna.
`;
}

export async function generateWeeklyProactiveInsight(): Promise<{ processedUsers: number; insightsGenerated: number }> {
  const users = await prisma.user.findMany({
    include: {
      pushSubscriptions: true
    }
  });

  let processedUsers = 0;
  let insightsGenerated = 0;

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  for (const user of users) {
    processedUsers++;

    try {
      const weeklyTransactions = await prisma.transaction.findMany({
        where: {
          userId: user.id,
          date: { gte: oneWeekAgo }
        },
        include: {
          category: true
        }
      });

      if (weeklyTransactions.length === 0) {
        continue;
      }

      const context = await getAiFinancialContext(user.id);
      const provider = createGeminiTextProvider();
      const prompt = buildWeeklyInsightPrompt(user.name, weeklyTransactions, context);
      
      const result = await provider.generateText({
        systemInstruction: "Kamu adalah Asisten Finansial Sakuin yang proaktif dan memberikan saran mingguan yang bersahabat dan praktis.",
        prompt,
        model: "gemini-1.5-flash",
        maxOutputTokens: 2000,
        temperature: 0.5
      });

      const aiReply = normalizeAiReply(result.text) || "Tetap pantau pengeluaranmu minggu depan agar selalu sesuai anggaran ya!";

      const totalExpense = weeklyTransactions
        .filter(t => t.type === "EXPENSE")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const topCategory = weeklyTransactions
        .filter(t => t.type === "EXPENSE")
        .reduce((acc: { name: string; amount: number }[], t) => {
          const catName = t.category?.name || "Lainnya";
          const match = acc.find(item => item.name === catName);
          if (match) {
            match.amount += Number(t.amount);
          } else {
            acc.push({ name: catName, amount: Number(t.amount) });
          }
          return acc;
        }, [])
        .sort((a, b) => b.amount - a.amount)[0]?.name || "N/A";

      const cards = [
        { label: "Pengeluaran Minggu Ini", value: `Rp ${totalExpense.toLocaleString("id-ID")}` },
        { label: "Kategori Terbesar", value: topCategory },
        { label: "Safe-to-Spend", value: `Rp ${Number(context.safeToSpend.availableToSpend).toLocaleString("id-ID")}` }
      ];

      await prisma.chatMessage.create({
        data: {
          userId: user.id,
          role: "assistant",
          content: aiReply,
          intent: "SPENDING_ANALYSIS",
          cards: cards as any,
          suggestions: [
            "Bagaimana cara menghemat minggu ini?",
            "Lihat pengeluaran bulan ini",
            "Target tabungan saya masih realistis?"
          ] as any
        }
      });

      insightsGenerated++;

      if (user.pushSubscriptions.length > 0) {
        await sendGenericPushNotification(user.id, {
          title: "Saran Finansial Mingguan",
          body: `Halo ${user.name}, saran keuangan barumu sudah siap! Intip tips hemat khusus untukmu minggu ini.`,
          url: "/asisten",
          tag: "sakuin-weekly-insight"
        });
      }
    } catch (error) {
      console.error(`Gagal membuat proactive insight untuk user ${user.id}:`, error);
    }
  }

  return {
    processedUsers,
    insightsGenerated
  };
}
