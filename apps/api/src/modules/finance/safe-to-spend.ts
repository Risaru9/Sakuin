import type { AiFinancialContext } from "../ai/ai-financial-context.js";

export type SafeToSpendStatus = "SAFE" | "WATCH" | "HOLD" | "UNKNOWN";

export type SpendingPaceStatus = "ON_TRACK" | "WATCH" | "FAST" | "UNKNOWN";

export type SafeToSpendResult = {
  status: SafeToSpendStatus;
  spendingPaceStatus: SpendingPaceStatus;
  netCashflow: number;
  safeBalanceLimit: number;
  availableToSpend: number;
  remainingDays: number;
  suggestedDailyLimit: number | null;
  expenseToIncomeRatio: number | null;
  monthProgressPercent: number;
  expensePacePercent: number | null;
  projectedMonthEndExpense: number;
  projectedNetCashflow: number;
  topRiskCategoryName: string | null;
  topRiskCategoryAmount: number;
  reason: string;
  action: string;
  warnings: string[];
};

export type CalculateSafeToSpendOptions = {
  referenceDate?: Date;
};

const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

function toNumber(value: string | number | null | undefined) {
  const numberValue = Number(value ?? 0);

  if (Number.isNaN(numberValue)) {
    return 0;
  }

  return numberValue;
}

function roundOneDecimal(value: number) {
  return Number(value.toFixed(1));
}

function getClampedReferenceDate(input: {
  context: AiFinancialContext;
  referenceDate?: Date;
}) {
  const periodStart = new Date(input.context.currentMonth.startDate);
  const periodEnd = new Date(input.context.currentMonth.endDate);
  const referenceDate = input.referenceDate ?? new Date(input.context.generatedAt);

  if (Number.isNaN(referenceDate.getTime())) {
    return new Date(input.context.generatedAt);
  }

  if (referenceDate < periodStart) {
    return periodStart;
  }

  if (referenceDate > periodEnd) {
    return periodEnd;
  }

  return referenceDate;
}

function getPeriodStats(input: {
  context: AiFinancialContext;
  referenceDate?: Date;
}) {
  const periodStart = new Date(input.context.currentMonth.startDate);
  const periodEnd = new Date(input.context.currentMonth.endDate);
  const referenceDate = getClampedReferenceDate(input);

  const totalDays = Math.max(
    1,
    Math.ceil((periodEnd.getTime() - periodStart.getTime()) / MILLISECONDS_PER_DAY)
  );

  const elapsedDays = Math.min(
    totalDays,
    Math.max(
      1,
      Math.ceil(
        (referenceDate.getTime() - periodStart.getTime()) / MILLISECONDS_PER_DAY
      )
    )
  );

  const remainingDays = Math.max(
    1,
    Math.ceil((periodEnd.getTime() - referenceDate.getTime()) / MILLISECONDS_PER_DAY)
  );

  return {
    totalDays,
    elapsedDays,
    remainingDays,
    monthProgressPercent: roundOneDecimal((elapsedDays / totalDays) * 100)
  };
}

function calculateExpenseToIncomeRatio(input: {
  income: number;
  expense: number;
}) {
  if (input.income <= 0) {
    return null;
  }

  return roundOneDecimal((input.expense / input.income) * 100);
}

function calculateProjectedMonthEndExpense(input: {
  expense: number;
  elapsedDays: number;
  totalDays: number;
}) {
  if (input.expense <= 0) {
    return 0;
  }

  return Math.round((input.expense / input.elapsedDays) * input.totalDays);
}

function getSpendingPaceStatus(input: {
  transactionCount: number;
  income: number;
  expense: number;
  projectedMonthEndExpense: number;
  monthProgressPercent: number;
}): SpendingPaceStatus {
  if (input.transactionCount === 0 || input.income <= 0 || input.expense <= 0) {
    return "UNKNOWN";
  }

  const expensePacePercent = (input.expense / input.income) * 100;
  const paceGap = expensePacePercent - input.monthProgressPercent;

  if (paceGap >= 25 || input.projectedMonthEndExpense >= input.income * 1.1) {
    return "FAST";
  }

  if (paceGap >= 10 || input.projectedMonthEndExpense >= input.income * 0.9) {
    return "WATCH";
  }

  return "ON_TRACK";
}

function getTopRiskCategory(context: AiFinancialContext) {
  return context.currentMonth.topExpenseCategories[0] ?? null;
}

function buildWarnings(input: {
  transactionCount: number;
  income: number;
  expense: number;
  netCashflow: number;
  safeBalanceLimit: number;
  availableToSpend: number;
  expenseToIncomeRatio: number | null;
  spendingPaceStatus: SpendingPaceStatus;
  topRiskCategoryName: string | null;
  topRiskCategoryExpenseShare: number;
  goals: AiFinancialContext["goals"];
}) {
  const warnings: string[] = [];

  if (input.transactionCount === 0) {
    warnings.push("Belum ada transaksi bulan ini.");
  }

  if (input.income <= 0 && input.expense > 0) {
    warnings.push("Belum ada pemasukan tercatat bulan ini.");
  }

  if (input.netCashflow < 0) {
    warnings.push("Cashflow bulan ini negatif.");
  }

  if (input.safeBalanceLimit > 0 && input.netCashflow < input.safeBalanceLimit) {
    warnings.push("Cashflow belum melewati batas aman yang ditetapkan user.");
  }

  if (input.availableToSpend <= 0 && input.transactionCount > 0) {
    warnings.push("Tidak ada ruang aman untuk pengeluaran tambahan.");
  }

  if (input.expenseToIncomeRatio !== null && input.expenseToIncomeRatio >= 70) {
    warnings.push("Rasio pengeluaran terhadap pemasukan sudah tinggi.");
  }

  if (input.spendingPaceStatus === "FAST") {
    warnings.push("Ritme pengeluaran bulan ini terlalu cepat.");
  }

  if (input.spendingPaceStatus === "WATCH") {
    warnings.push("Ritme pengeluaran perlu dipantau.");
  }

  if (input.topRiskCategoryName && input.topRiskCategoryExpenseShare >= 40) {
    warnings.push(
      `Kategori ${input.topRiskCategoryName} mengambil porsi besar dari total pengeluaran.`
    );
  }

  if (input.goals.overdueGoals > 0) {
    warnings.push("Ada goal yang sudah melewati deadline.");
  }

  return warnings;
}

function determineStatus(input: {
  transactionCount: number;
  income: number;
  expense: number;
  netCashflow: number;
  availableToSpend: number;
  expenseToIncomeRatio: number | null;
  projectedNetCashflow: number;
  safeBalanceLimit: number;
  spendingPaceStatus: SpendingPaceStatus;
  topRiskCategoryExpenseShare: number;
}): SafeToSpendStatus {
  if (input.transactionCount === 0) {
    return "UNKNOWN";
  }

  if (input.income <= 0 && input.expense > 0) {
    return "HOLD";
  }

  if (input.netCashflow < 0) {
    return "HOLD";
  }

  if (input.availableToSpend <= 0) {
    return "HOLD";
  }

  if (input.expenseToIncomeRatio !== null && input.expenseToIncomeRatio >= 90) {
    return "HOLD";
  }

  if (input.projectedNetCashflow < 0) {
    return "HOLD";
  }

  if (
    input.safeBalanceLimit > 0 &&
    input.projectedNetCashflow < input.safeBalanceLimit
  ) {
    return "WATCH";
  }

  if (input.expenseToIncomeRatio !== null && input.expenseToIncomeRatio >= 70) {
    return "WATCH";
  }

  if (
    input.spendingPaceStatus === "FAST" ||
    input.spendingPaceStatus === "WATCH"
  ) {
    return "WATCH";
  }

  if (input.topRiskCategoryExpenseShare >= 40) {
    return "WATCH";
  }

  return "SAFE";
}

function buildReason(input: {
  status: SafeToSpendStatus;
  income: number;
  expense: number;
  netCashflow: number;
  availableToSpend: number;
  safeBalanceLimit: number;
  topRiskCategoryName: string | null;
  topRiskCategoryAmount: number;
  spendingPaceStatus: SpendingPaceStatus;
  projectedNetCashflow: number;
}) {
  if (input.status === "UNKNOWN") {
    return "Belum ada data transaksi bulan ini, jadi batas aman pengeluaran belum bisa dihitung dengan akurat.";
  }

  if (input.status === "HOLD") {
    if (input.income <= 0 && input.expense > 0) {
      return "Ada pengeluaran tercatat, tetapi belum ada pemasukan bulan ini. Pengeluaran tambahan sebaiknya ditahan sampai cashflow lebih jelas.";
    }

    if (input.netCashflow < 0) {
      return "Pengeluaran bulan ini sudah lebih besar daripada pemasukan, sehingga cashflow berada dalam kondisi negatif.";
    }

    return "Ruang aman setelah memperhitungkan safe balance limit sudah habis atau terlalu tipis.";
  }

  if (input.status === "WATCH") {
    if (input.spendingPaceStatus === "FAST") {
      return "Cashflow masih memiliki ruang, tetapi ritme pengeluaran berjalan lebih cepat dari progres bulan ini.";
    }

    if (input.projectedNetCashflow < input.safeBalanceLimit) {
      return "Jika ritme pengeluaran saat ini berlanjut, cashflow akhir bulan berisiko turun di bawah batas aman.";
    }

    if (input.topRiskCategoryName) {
      return `Cashflow masih bisa dipakai, tetapi kategori ${input.topRiskCategoryName} sudah menjadi sumber pengeluaran terbesar.`;
    }

    return "Kondisi masih bisa dikendalikan, tetapi pengeluaran perlu dipantau agar tidak melewati batas aman.";
  }

  return "Cashflow bulan ini masih positif dan masih ada ruang aman setelah memperhitungkan safe balance limit.";
}

function buildAction(input: {
  status: SafeToSpendStatus;
  availableToSpend: number;
  suggestedDailyLimit: number | null;
  topRiskCategoryName: string | null;
}) {
  if (input.status === "UNKNOWN") {
    return "Catat pemasukan dan pengeluaran utama terlebih dahulu agar batas aman bisa dihitung.";
  }

  if (input.status === "HOLD") {
    return input.topRiskCategoryName
      ? `Tahan pengeluaran non-prioritas dan fokus kontrol kategori ${input.topRiskCategoryName}.`
      : "Tahan pengeluaran non-prioritas sampai cashflow kembali aman.";
  }

  if (input.status === "WATCH") {
    if (input.suggestedDailyLimit !== null) {
      return input.topRiskCategoryName
        ? `Batasi pengeluaran harian maksimal sekitar Rp${input.suggestedDailyLimit.toLocaleString(
            "id-ID"
          )} dan pantau kategori ${input.topRiskCategoryName}.`
        : `Batasi pengeluaran harian maksimal sekitar Rp${input.suggestedDailyLimit.toLocaleString(
            "id-ID"
          )}.`;
    }

    return "Pantau pengeluaran harian dan hindari transaksi non-prioritas.";
  }

  if (input.suggestedDailyLimit !== null) {
    return `Kamu masih bisa memakai sekitar Rp${input.suggestedDailyLimit.toLocaleString(
      "id-ID"
    )} per hari dengan tetap menjaga batas aman.`;
  }

  return "Pertahankan pola pengeluaran saat ini dan tetap catat transaksi rutin.";
}

export function calculateSafeToSpend(
  context: AiFinancialContext,
  options: CalculateSafeToSpendOptions = {}
): SafeToSpendResult {
  const income = toNumber(context.currentMonth.totalIncome);
  const expense = toNumber(context.currentMonth.totalExpense);
  const netCashflow = toNumber(context.currentMonth.netCashflow);
  const safeBalanceLimit = Math.max(0, toNumber(context.safeBalanceLimit));
  const transactionCount = context.currentMonth.transactionCount;
  const topRiskCategory = getTopRiskCategory(context);

  const { totalDays, elapsedDays, remainingDays, monthProgressPercent } =
    getPeriodStats({
      context,
      referenceDate: options.referenceDate
    });

  const expenseToIncomeRatio = calculateExpenseToIncomeRatio({
    income,
    expense
  });

  const projectedMonthEndExpense = calculateProjectedMonthEndExpense({
    expense,
    elapsedDays,
    totalDays
  });

  const projectedNetCashflow = Math.round(income - projectedMonthEndExpense);
  const availableToSpend = Math.max(0, Math.round(netCashflow - safeBalanceLimit));
  const suggestedDailyLimit =
    transactionCount === 0 ? null : Math.floor(availableToSpend / remainingDays);

  const expensePacePercent =
    income > 0 && expense > 0 ? roundOneDecimal((expense / income) * 100) : null;

  const spendingPaceStatus = getSpendingPaceStatus({
    transactionCount,
    income,
    expense,
    projectedMonthEndExpense,
    monthProgressPercent
  });

  const topRiskCategoryName = topRiskCategory?.name ?? null;
  const topRiskCategoryAmount = topRiskCategory
    ? Math.round(toNumber(topRiskCategory.amount))
    : 0;
  const topRiskCategoryExpenseShare = topRiskCategory?.percentageOfExpense ?? 0;

  const status = determineStatus({
    transactionCount,
    income,
    expense,
    netCashflow,
    availableToSpend,
    expenseToIncomeRatio,
    projectedNetCashflow,
    safeBalanceLimit,
    spendingPaceStatus,
    topRiskCategoryExpenseShare
  });

  const warnings = buildWarnings({
    transactionCount,
    income,
    expense,
    netCashflow,
    safeBalanceLimit,
    availableToSpend,
    expenseToIncomeRatio,
    spendingPaceStatus,
    topRiskCategoryName,
    topRiskCategoryExpenseShare,
    goals: context.goals
  });

  return {
    status,
    spendingPaceStatus,
    netCashflow: Math.round(netCashflow),
    safeBalanceLimit: Math.round(safeBalanceLimit),
    availableToSpend,
    remainingDays,
    suggestedDailyLimit,
    expenseToIncomeRatio,
    monthProgressPercent,
    expensePacePercent,
    projectedMonthEndExpense,
    projectedNetCashflow,
    topRiskCategoryName,
    topRiskCategoryAmount,
    reason: buildReason({
      status,
      income,
      expense,
      netCashflow,
      availableToSpend,
      safeBalanceLimit,
      topRiskCategoryName,
      topRiskCategoryAmount,
      spendingPaceStatus,
      projectedNetCashflow
    }),
    action: buildAction({
      status,
      availableToSpend,
      suggestedDailyLimit,
      topRiskCategoryName
    }),
    warnings
  };
}

export const buildSafeToSpend = calculateSafeToSpend;