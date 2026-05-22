import { env } from "../../config/env.js";
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
  getAiFinancialContext,
  type AiFinancialContext
} from "./ai-financial-context.js";
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
  "Pengeluaran saya bulan ini gimana?",
  "Saya boros di mana?",
  "Bandingkan pengeluaran bulan ini dengan bulan lalu",
  "Target tabungan saya realistis?"
];

const TRANSACTION_DRAFT_SUGGESTIONS = [
  "Catat makan ayam geprek 15000",
  "Catat bensin 30000 kemarin",
  "Catat dikasih kakak 100000",
  "Lihat pengeluaran bulan ini"
];

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

  if (topCategory.percentageOfExpense >= 40) {
    riskSignals.push(
      "Satu kategori mengambil porsi besar dari total pengeluaran bulan ini."
    );
  }

  if (topCategory.percentageOfIncome >= 30) {
    riskSignals.push(
      "Kategori terbesar sudah memakai porsi besar dari pemasukan bulan ini."
    );
  }

  if (expenseChangePercent !== null && expenseChangePercent >= 25) {
    riskSignals.push("Total pengeluaran naik cukup besar dibanding bulan lalu.");
  }

  if (
    topCategoryChangePercent === null &&
    topCategoryAmount > 0 &&
    topCategoryPreviousAmount === 0
  ) {
    riskSignals.push(
      "Kategori terbesar belum terlihat pada pembanding bulan lalu."
    );
  }

  if (topCategoryChangePercent !== null && topCategoryChangePercent >= 25) {
    riskSignals.push("Kategori terbesar naik cukup besar dibanding bulan lalu.");
  }

  if (topCategory.transactionCount >= 8) {
    riskSignals.push(
      "Kategori terbesar muncul cukup sering, jadi kemungkinan dipengaruhi transaksi kecil yang berulang."
    );
  }

  if (
    (expenseChangePercent !== null && expenseChangePercent >= 40) ||
    (topCategoryChangePercent !== null && topCategoryChangePercent >= 50)
  ) {
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
    topCategory.percentageOfExpense >= 40 ||
    topCategory.percentageOfIncome >= 30 ||
    topCategory.transactionCount >= 8
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
    mainDriver: `Kategori terbesar bulan ini adalah ${topCategory.name}, tetapi porsinya belum terlihat terlalu dominan.`,
    advice:
      "Tetap pantau kategori terbesar agar tidak naik perlahan, terutama jika transaksi kecil mulai sering muncul.",
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

  if (!hasCurrentMonthTransactions(context)) {
    return {
      intent: "FINANCIAL_SUMMARY",
      reply: `Belum ada data transaksi bulan ini. Kalau kamu mulai mencatat pemasukan dan pengeluaran, saya bisa bantu merangkum kondisi keuanganmu dengan lebih jelas. Langkah paling aman sekarang: ${actionPlan.mainAction}. ${actionPlan.nextStep}`,
      cards: buildCards([
        {
          label: "Status Finansial",
          value: healthSnapshot.status
        },
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
      suggestions: DEFAULT_SUGGESTIONS
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
    reply: `Status kesehatan keuanganmu bulan ini: ${healthSnapshot.status}. ${healthSnapshot.reason} Bulan ini pemasukanmu ${formatRupiah(
      context.currentMonth.totalIncome
    )} dan pengeluaranmu ${formatRupiah(
      context.currentMonth.totalExpense
    )}. Arus kas bersih periode ini ${formatRupiah(
      context.currentMonth.netCashflow
    )}. ${topCategoryText} Langkah paling aman sekarang: ${
      actionPlan.mainAction
    }. ${actionPlan.nextStep}`,
    cards: buildCards([
      ...buildFinancialHealthCards(healthSnapshot),
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
    suggestions: DEFAULT_SUGGESTIONS
  };
}

function buildSpendingAnalysisResponse(
  context: AiFinancialContext
): AiChatResponse {
  const topCategory = getTopExpenseCategory(context);
  const healthSnapshot = buildFinancialHealthSnapshot(context);
  const spendingInsight = buildSpendingPatternInsight(context);

  if (toNumber(context.currentMonth.totalExpense) <= 0 || !topCategory) {
    return {
      intent: "SPENDING_ANALYSIS",
      reply:
        "Belum ada data pengeluaran bulan ini. Setelah kamu mencatat beberapa pengeluaran, saya bisa bantu melihat kategori terbesar, pola boros, dan prioritas pengeluaran yang perlu dikontrol.",
      cards: buildCards([
        {
          label: "Total Pengeluaran",
          value: formatRupiah(context.currentMonth.totalExpense)
        },
        {
          label: "Status Finansial",
          value: healthSnapshot.status
        },
        ...buildSpendingPatternCards(spendingInsight),
        {
          label: "Jumlah Transaksi",
          value: String(context.currentMonth.transactionCount)
        }
      ]),
      suggestions: DEFAULT_SUGGESTIONS
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

  return {
    intent: "SPENDING_ANALYSIS",
    reply: `Pengeluaranmu bulan ini ${formatRupiah(
      context.currentMonth.totalExpense
    )}. Prioritas pengeluaran yang perlu kamu pantau adalah ${
      topCategory.name
    }. Total kategori ini ${formatRupiah(topCategory.amount)}, sekitar ${
      topCategory.percentageOfExpense
    }% dari seluruh pengeluaran bulan ini dan muncul dalam ${
      topCategory.transactionCount
    } transaksi. ${expenseTrendText} ${categoryTrendText} Pola pengeluaran saat ini: ${
      spendingInsight.status
    }. ${spendingInsight.advice}`,
    cards: buildCards([
      {
        label: "Total Pengeluaran",
        value: formatRupiah(context.currentMonth.totalExpense)
      },
      {
        label: "Status Finansial",
        value: healthSnapshot.status
      },
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
    suggestions: [
      "Kasih saran hemat",
      "Bandingkan pengeluaran bulan ini dengan bulan lalu",
      "Lihat ringkasan keuangan",
      "Target tabungan saya realistis?"
    ]
  };
}

function buildIncomeAnalysisResponse(
  context: AiFinancialContext
): AiChatResponse {
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
      suggestions: DEFAULT_SUGGESTIONS
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
    suggestions: DEFAULT_SUGGESTIONS
  };
}

function buildPeriodComparisonResponse(
  context: AiFinancialContext
): AiChatResponse {
  const healthSnapshot = buildFinancialHealthSnapshot(context);
  const spendingInsight = buildSpendingPatternInsight(context);

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
    suggestions: [
      "Saya boros di mana?",
      "Kasih saran hemat",
      "Lihat ringkasan keuangan",
      "Analisis pemasukan saya"
    ]
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

  if (!topCategory) {
    return {
      intent: "SAVING_ADVICE",
      reply: `Saya belum menemukan kategori pengeluaran yang cukup untuk diberi saran. Langkah paling aman sekarang: ${actionPlan.mainAction}. ${actionPlan.nextStep}`,
      cards: buildCards([
        {
          label: "Status Finansial",
          value: healthSnapshot.status
        },
        ...buildConsultantActionCards(actionPlan),
        {
          label: "Total Pengeluaran",
          value: formatRupiah(context.currentMonth.totalExpense)
        },
        ...buildSpendingPatternCards(spendingInsight)
      ]),
      suggestions: DEFAULT_SUGGESTIONS
    };
  }

  const advice =
    topCategory.percentageOfIncome >= 30
      ? `Kategori ${topCategory.name} cukup besar dibanding pemasukanmu bulan ini. Coba turunkan secara bertahap, misalnya mulai dari 10% lebih rendah minggu depan.`
      : `Kategori ${topCategory.name} adalah pengeluaran terbesar bulan ini. Coba pasang batas mingguan agar pengeluaran tetap lebih mudah dikontrol.`;

  const repeatedTransactionAdvice =
    topCategory.transactionCount >= 8
      ? ` Karena kategori ini muncul ${topCategory.transactionCount} kali, kemungkinan ada transaksi kecil berulang yang perlu dibatasi.`
      : "";

  const dailyLimitAdvice = healthSnapshot.suggestedDailyLimit
    ? ` Untuk menjaga kondisi tetap aman, batas pengeluaran harian yang cukup konservatif sekitar ${formatRupiah(
        healthSnapshot.suggestedDailyLimit
      )}.`
    : "";

  return {
    intent: "SAVING_ADVICE",
    reply: `Langkah paling aman sekarang: ${actionPlan.mainAction}. ${advice}${repeatedTransactionAdvice} Aksi praktis: ${actionPlan.nextStep}${dailyLimitAdvice}`,
    cards: buildCards([
      {
        label: "Status Finansial",
        value: healthSnapshot.status
      },
      ...buildConsultantActionCards(actionPlan),
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
    suggestions: [
      "Bandingkan pengeluaran bulan ini dengan bulan lalu",
      "Lihat pengeluaran bulan ini",
      "Analisis goals saya",
      "Lihat ringkasan keuangan"
    ]
  };
}

function buildGoalAnalysisResponse(context: AiFinancialContext): AiChatResponse {
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
      suggestions: DEFAULT_SUGGESTIONS
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
    suggestions: [
      "Kasih saran hemat",
      "Lihat ringkasan keuangan",
      "Bandingkan pengeluaran bulan ini dengan bulan lalu",
      "Saya boros di mana?"
    ]
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
    "Jika SPENDING PATTERN INSIGHT tersedia, gunakan itu untuk menjawab user boros di mana, kategori mana yang perlu dikontrol, dan apa penyebab pengeluaran terasa naik.",
    "Jika FINANCIAL SCENARIO ANALYSIS tersedia, gunakan analisis itu sebagai sumber utama untuk hitungan target, tenor, kebutuhan bulanan, rasio pendapatan, dan verdict risiko.",
    "Jika FINANCIAL SCENARIO ANALYSIS tersedia, gunakan analisis itu sebagai sumber utama untuk hitungan target, tenor, kebutuhan bulanan, rasio pendapatan, dan verdict risiko.",
    "Jika user memberi angka skenario seperti gaji, target harga, tenor, atau deadline, angka user mengalahkan data historis Sakuin untuk analisis skenario tersebut.",
    "Jangan menyimpulkan realistis hanya dari cashflow historis Sakuin. Untuk skenario pembelian/kredit, selalu cek rasio kebutuhan bulanan terhadap pendapatan skenario.",
    "Untuk tenor atau deadline range, bandingkan opsi yang paling berat dan paling ringan.",
    "Jika bunga kredit tidak diketahui, jelaskan bahwa hitungan masih pokok/estimasi kasar dan total biaya bisa lebih tinggi.",
    "Untuk skenario pembelian/kredit, jangan langsung menyuruh user membeli. Beri analisis risiko dan syarat aman.",
    "Jangan mengarang nominal, kategori, transaksi, tanggal, pemasukan, pengeluaran, atau goals yang tidak ada di context atau tidak disebut user.",
    "Boleh melakukan perhitungan sederhana dari angka yang ada di context atau angka yang user berikan.",
    "Jika user bertanya apakah target/goal/kondisi finansial realistis atau aman, wajib beri verdict eksplisit.",
    "Jika user bertanya boros di mana, jawab kategori prioritas kontrol terlebih dahulu.",
    "Jika user bertanya pengeluaran naik karena apa, jelaskan kategori terbesar, porsinya, frekuensinya, dan tren dibanding bulan lalu jika tersedia.",
    "Untuk analisis kesehatan finansial, gunakan struktur: status, alasan singkat, angka utama, saran aksi.",
    "Untuk analisis pola pengeluaran, gunakan struktur: kategori prioritas, nominal/porsi, tren/frekuensi, saran aksi.",
    "Untuk analisis target/goal, gunakan struktur: verdict, hitungan singkat, risiko utama, saran aksi.",
    "Jika user memberi gaji, target nominal, dan jangka waktu, hitung kebutuhan menabung per bulan.",
    "Jika user tidak memberi target nominal atau deadline, jangan mengarang. Minta data yang kurang secara singkat.",
    "Jika context punya income, expense, dan net cashflow, pakai itu untuk menilai kemampuan menabung.",
    "Jika user memberi angka hipotetis, analisis angka tersebut sebagai skenario, tetapi jelaskan bahwa hasil bergantung pada konsistensi pencatatan dan pengeluaran aktual.",
    "Jangan menyebut database, backend, JSON, model, API, prompt, atau detail teknis internal.",
    "Jangan memberi nasihat investasi, pinjaman, pajak, hukum, atau keputusan finansial profesional.",
    "Jangan menghakimi user. Hindari kalimat seperti gaji kamu kecil.",
    "Jika data belum cukup, katakan data belum cukup dan sebutkan data apa yang perlu ditambahkan.",
    "Jawaban harus dalam Bahasa Indonesia yang natural, jelas, ringkas, dan praktis.",
    "Format jawaban maksimal 4 paragraf pendek.",
    "Pastikan jawaban selesai dengan utuh dan tidak menggantung di tengah kalimat.",
    "Untuk pertanyaan analisis kompleks, boleh memakai bullet pendek maksimal 4 poin.",
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
    "SPENDING PATTERN INSIGHT:",
    buildSpendingPatternPromptContext(spendingInsight),
    "",
    "CONSULTANT ACTION PLAN:",
    buildConsultantActionPromptContext(actionPlan),
    "",
    "FINANCIAL SCENARIO ANALYSIS:",
    input.scenario
      ? buildFinancialScenarioPromptContext(input.scenario)
      : "Tidak ada skenario finansial terstruktur terdeteksi.",
    "",
    "SAFE FINANCIAL CONTEXT:",
    JSON.stringify(input.context, null, 2),
    "",
    "DETERMINISTIC BACKEND SUMMARY:",
    input.baseResponse.reply,
    "",
    "ANSWER QUALITY RULES:",
    "- Jawab pertanyaan user secara langsung dan on-point.",
    "- Jangan membahas hal yang tidak ditanya kecuali benar-benar relevan.",
    "- Jika user bertanya aman/tidak, sehat/tidak, atau boros/tidak, mulai jawaban dengan status financial health atau spending pattern.",
    "- Jika user bertanya 'boros di mana', sebutkan kategori prioritas kontrol terlebih dahulu.",
    "- Jika user bertanya pengeluaran naik karena apa, gunakan spending pattern insight sebagai sumber utama.",
    "- Jika user bertanya realistis/tidak, mulai jawaban dengan verdict.",
    "- Jika user meminta lanjutan, lanjutkan penjelasan finansial terakhir dari conversation context.",
    "- Jika user bertanya target tabungan, hitung kebutuhan tabungan per bulan bila data tersedia.",
    "- Jika data kurang, jangan mengarang. Sebutkan data yang kurang.",
    "- Angka penting harus konsisten dengan context, financial health snapshot, spending pattern insight, financial scenario analysis, atau angka yang user berikan.",
    "- Jika financial scenario analysis tersedia, jangan melawan verdict dan hitungan deterministik dari backend.",
    "- Jika financial health snapshot tersedia, jangan melawan status dan alasan deterministik dari backend.",
    "- Jika spending pattern insight tersedia, jangan melawan kategori prioritas, nominal, porsi, tren, dan saran deterministik dari backend.",
    "- Jika consultant action plan tersedia, jangan melawan prioritas aksi, langkah utama, alasan, dan guardrail deterministik dari backend.",
    "- Jika user bertanya apa yang harus dilakukan sekarang, mulai dari langkah utama consultant action plan.",
    "- Cards di frontend sudah menampilkan angka utama, jadi reply fokus pada interpretasi dan saran.",
    "",
    "TASK:",
    "Buat jawaban final yang lebih natural, jelas, dan bernilai dari financial context, financial health snapshot, spending pattern insight, consultant action plan, financial scenario analysis, dan deterministic backend summary.",
    "Gunakan angka yang sama seperti context/backend summary/health snapshot/spending insight/scenario analysis atau angka yang disebut user.",
    "Jangan tambahkan angka baru tanpa dasar.",
    "Jangan terlalu panjang.",
    "Berikan insight dan saran yang langsung bisa dilakukan user."
  ].join("\n");
}

function normalizeAiReply(text: string) {
  return text
    .trim()
    .replace(/\n{3,}/g, "\n\n")
    .slice(0, 2400);
}

async function enhanceFinancialResponseWithAi(input: {
  provider?: AiTextProvider;
  userMessage: string;
  intent: Exclude<AiIntent, "OUT_OF_SCOPE" | "TRANSACTION_DRAFT">;
  context: AiFinancialContext;
  baseResponse: AiChatResponse;
  history?: AiChatHistoryMessage[];
  scenario?: FinancialScenarioAnalysis;
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
        scenario: input.scenario
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

export async function getAiChatResponse(
  input: AiChatServiceInput,
  options: AiChatServiceOptions = {}
): Promise<AiChatResponse> {
  const normalizedMessage = input.message.trim();

  const classification = classifyAiChatMessage(
    normalizedMessage,
    input.history ?? []
  );

  if (classification.intent === "OUT_OF_SCOPE") {
    return buildOutOfScopeResponse();
  }

  if (classification.intent === "TRANSACTION_DRAFT") {
    const drafts = await buildRuleBasedTransactionDrafts({
      userId: input.userId,
      message: input.message
    });

    return buildTransactionDraftResponse(drafts);
  }

  const financialContext = await getAiFinancialContext(input.userId);
  const scenario = analyzeFinancialScenario(
    normalizedMessage,
    input.history ?? []
  );

  const baseResponse = enrichResponseWithScenario(
    buildFinancialResponse(classification.intent, financialContext),
    scenario
  );

  return enhanceFinancialResponseWithAi({
    provider: options.provider,
    userMessage: normalizedMessage,
    intent: classification.intent,
    context: financialContext,
    baseResponse,
    history: input.history,
    scenario
  });
}