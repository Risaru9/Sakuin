import { buildFinancialCheckup, type FinancialCheckupResult } from "../finance/financial-checkup.js";
import { type FinancialScenarioAnalysis } from "./ai-financial-scenario.js";
import { type PurchaseDecisionAnalysis } from "./ai-purchase-decision.js";
import type { AiFinancialContext } from "./ai-financial-context.js";
import {
  calculateExpenseRatio,
  formatChangePercent,
  formatPercent,
  formatRatio,
  formatRupiah,
  roundOneDecimal,
  toNumber
} from "./ai-response-formatters.js";
import type {
  AiChatCard,
  AiChatResponse,
  AiIntent,
  AiTransactionDraft
} from "./ai.types.js";

export const OUT_OF_SCOPE_REPLY =
  "Maaf, Asisten Sakuin hanya bisa membantu pertanyaan seputar keuangan pribadi di Sakuin, seperti transaksi, pemasukan, pengeluaran, goals, budget, dan ringkasan keuangan.";

export const DEFAULT_SUGGESTIONS = [
  "Buat ringkasan kondisi keuangan saya",
  "Pengeluaran bulan ini gimana?",
  "Saya boros di kategori apa?",
  "Apakah saya masih aman jajan hari ini?",
  "Bagaimana cara menghemat minggu ini?",
  "Target tabungan saya masih realistis?",
  "Apa tindakan keuangan terbaik hari ini?",
  "Bantu saya memahami pola pengeluaran saya"
];

export const TRANSACTION_DRAFT_SUGGESTIONS = [
  "Catat makan ayam geprek 15000",
  "Catat bensin 30000 kemarin",
  "Catat dikasih kakak 100000",
  "Lihat pengeluaran bulan ini"
];

export const MAX_RESPONSE_SUGGESTIONS = 4;
export const AI_CATEGORY_DOMINANCE_WARNING_SHARE = 40;
export const AI_MATERIAL_EXPENSE_THRESHOLD = 100_000;
export const AI_MATERIAL_EXPENSE_RATIO_THRESHOLD = 20;
export const AI_REPEATED_CATEGORY_TRANSACTION_THRESHOLD = 8;
export const AI_MIN_TRANSACTIONS_FOR_CATEGORY_RISK = 5;
export const MAX_AI_REPLY_CHARS = 6000;

export type FinancialHealthStatus =
  | "Aman"
  | "Cukup aman"
  | "Waspada ringan"
  | "Berisiko"
  | "Belum bisa dinilai";

export type FinancialHealthSnapshot = {
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

export type SpendingPatternStatus =
  | "Terkendali"
  | "Perlu dikontrol"
  | "Meningkat tajam"
  | "Belum cukup data";

export type SpendingPatternInsight = {
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

export type ConsultantActionPriority =
  | "Aman"
  | "Pantau"
  | "Kurangi"
  | "Tahan"
  | "Belum bisa dinilai";

export type ConsultantActionPlan = {
  priority: ConsultantActionPriority;
  mainAction: string;
  reason: string;
  nextStep: string;
  focusCategoryName: string | null;
  guardrail: string;
  riskSignals: string[];
};

export {
  calculateExpenseRatio,
  formatChangePercent,
  formatPercent,
  formatRatio,
  formatRupiah,
  roundOneDecimal,
  toNumber
};

export function isMaterialExpenseCategoryConcern(input: {
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

export function isMaterialIncrease(input: {
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

export function calculateNumericChangePercent(currentValue: number, previousValue: number) {
  if (previousValue === 0) {
    if (currentValue === 0) {
      return 0;
    }

    return null;
  }

  return roundOneDecimal(((currentValue - previousValue) / previousValue) * 100);
}

export function getTopExpenseCategory(context: AiFinancialContext) {
  return context.currentMonth.topExpenseCategories[0] ?? null;
}

export function hasCurrentMonthTransactions(context: AiFinancialContext) {
  return context.currentMonth.transactionCount > 0;
}

export function buildCards(items: AiChatCard[]) {
  return items;
}

export function getRemainingDaysInCurrentPeriod(context: AiFinancialContext) {
  const generatedAt = new Date(context.generatedAt);
  const periodEnd = new Date(context.currentMonth.endDate);
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const remainingDays = Math.ceil(
    (periodEnd.getTime() - generatedAt.getTime()) / millisecondsPerDay
  );

  return Math.max(1, remainingDays);
}

export function findPreviousCategoryAmount(
  context: AiFinancialContext,
  categoryName: string
) {
  const previousCategory = context.previousMonth.topExpenseCategories.find(
    (category) => category.name.toLowerCase() === categoryName.toLowerCase()
  );

  return previousCategory ? toNumber(previousCategory.amount) : 0;
}

export function buildFinancialHealthSnapshot(
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

export function buildSpendingPatternInsight(
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

export function buildFinancialHealthCards(
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

export function buildSpendingPatternCards(
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

export function formatSafeToSpendStatus(
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

export function formatSpendingPaceStatus(
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

export function buildSafeToSpendCards(context: AiFinancialContext): AiChatCard[] {
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

export function buildSafeToSpendReplySegment(context: AiFinancialContext) {
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

export function formatHabitStatus(
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

export function formatFinancialCheckupStatus(status: FinancialCheckupResult["status"]) {
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

export function formatFinancialCheckupPriority(
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

export function buildFinancialCheckupCards(
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

export function buildFinancialCheckupReplySegment(checkup: FinancialCheckupResult) {
  return `Checkup keuangan: ${formatFinancialCheckupStatus(
    checkup.status
  )}. Fokus: ${
    checkup.focusCategoryName ?? "belum ada kategori khusus"
  }. ${checkup.headline} Aksi utama: ${checkup.action}`;
}

export function buildConsultantActionPlan(input: {
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

export function buildConsultantActionCards(plan: ConsultantActionPlan): AiChatCard[] {
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

export function buildUniqueSuggestions(suggestions: string[]) {
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

export function buildActionPlanSuggestions(input: {
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

export function buildDynamicFinancialSuggestions(input: {
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

export function buildScenarioCards(
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

export function mergeUniqueCards(cards: AiChatCard[], extraCards: AiChatCard[]) {
  const existingLabels = new Set(cards.map((card) => card.label));

  return [
    ...cards,
    ...extraCards.filter((card) => !existingLabels.has(card.label))
  ];
}

export function enrichResponseWithScenario(
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

export function buildPurchaseDecisionCards(
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

export function buildPurchaseDecisionReply(decision: PurchaseDecisionAnalysis) {
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

export function enrichResponseWithPurchaseDecision(
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

export function buildOutOfScopeResponse(): AiChatResponse {
  return {
    intent: "OUT_OF_SCOPE",
    reply: OUT_OF_SCOPE_REPLY,
    cards: [],
    suggestions: DEFAULT_SUGGESTIONS
  };
}

export function buildTransactionDraftResponse(
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

export function buildFinancialSummaryResponse(
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

export function buildSpendingAnalysisResponse(
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

export function buildIncomeAnalysisResponse(
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

export function buildPeriodComparisonResponse(
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

export function buildSavingAdviceResponse(context: AiFinancialContext): AiChatResponse {
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

export function buildGoalAnalysisResponse(context: AiFinancialContext): AiChatResponse {
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

export function buildFinancialResponse(
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

export function normalizeAiReply(text: string) {
  return text
    .trim()
    .replace(/\n{3,}/g, "\n\n")
    .slice(0, MAX_AI_REPLY_CHARS);
}
