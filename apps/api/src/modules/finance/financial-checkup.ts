import type { AiFinancialContext } from "../ai/ai-financial-context.js";

export type FinancialCheckupStatus = "GOOD" | "WATCH" | "RISK" | "UNKNOWN";

export type FinancialCheckupPriority =
  | "MAINTAIN"
  | "MONITOR"
  | "REDUCE"
  | "HOLD"
  | "COLLECT_DATA";

export type FinancialCheckupResult = {
  status: FinancialCheckupStatus;
  priority: FinancialCheckupPriority;
  title: string;
  headline: string;
  focusCategoryName: string | null;
  focusCategoryAmount: number;
  reason: string;
  action: string;
  warnings: string[];
  metrics: {
    totalIncome: number;
    totalExpense: number;
    netCashflow: number;
    expenseToIncomeRatio: number | null;
    expenseChangePercent: number | null;
    safeToSpendStatus: AiFinancialContext["safeToSpend"]["status"];
    spendingPaceStatus: AiFinancialContext["safeToSpend"]["spendingPaceStatus"];
    availableToSpend: number;
    suggestedDailyLimit: number | null;
    projectedNetCashflow: number;
  };
};

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

function calculateExpenseToIncomeRatio(input: {
  totalIncome: number;
  totalExpense: number;
}) {
  if (input.totalIncome <= 0) {
    return null;
  }

  return roundOneDecimal((input.totalExpense / input.totalIncome) * 100);
}

function getTopExpenseCategory(context: AiFinancialContext) {
  return context.currentMonth.topExpenseCategories[0] ?? null;
}

function buildWarnings(input: {
  context: AiFinancialContext;
  expenseToIncomeRatio: number | null;
  focusCategoryName: string | null;
  focusCategoryExpenseShare: number;
}) {
  const warnings: string[] = [];

  if (input.context.currentMonth.transactionCount === 0) {
    warnings.push("Belum ada transaksi bulan ini.");
  }

  if (
    input.context.safeToSpend.status === "HOLD" ||
    input.context.safeToSpend.status === "WATCH"
  ) {
    warnings.push(...input.context.safeToSpend.warnings);
  }

  if (input.expenseToIncomeRatio !== null && input.expenseToIncomeRatio >= 70) {
    warnings.push("Rasio pengeluaran terhadap pemasukan sudah tinggi.");
  }

  if (input.focusCategoryName && input.focusCategoryExpenseShare >= 40) {
    warnings.push(
      `Kategori ${input.focusCategoryName} mengambil porsi besar dari total pengeluaran.`
    );
  }

  if (
    input.context.monthComparison.expenseChangePercent !== null &&
    input.context.monthComparison.expenseChangePercent >= 25
  ) {
    warnings.push("Total pengeluaran naik cukup besar dibanding bulan lalu.");
  }

  if (input.context.goals.overdueGoals > 0) {
    warnings.push("Ada goal yang sudah melewati deadline.");
  }

  return [...new Set(warnings)].slice(0, 5);
}

function determineStatus(input: {
  context: AiFinancialContext;
  expenseToIncomeRatio: number | null;
  focusCategoryExpenseShare: number;
}): FinancialCheckupStatus {
  if (input.context.currentMonth.transactionCount === 0) {
    return "UNKNOWN";
  }

  if (
    input.context.safeToSpend.status === "HOLD" ||
    input.context.safeToSpend.projectedNetCashflow < 0 ||
    toNumber(input.context.currentMonth.netCashflow) < 0
  ) {
    return "RISK";
  }

  if (input.expenseToIncomeRatio !== null && input.expenseToIncomeRatio >= 90) {
    return "RISK";
  }

  if (
    input.context.safeToSpend.status === "WATCH" ||
    input.context.safeToSpend.spendingPaceStatus === "FAST" ||
    input.context.safeToSpend.spendingPaceStatus === "WATCH"
  ) {
    return "WATCH";
  }

  if (input.expenseToIncomeRatio !== null && input.expenseToIncomeRatio >= 70) {
    return "WATCH";
  }

  if (input.focusCategoryExpenseShare >= 40) {
    return "WATCH";
  }

  if (
    input.context.monthComparison.expenseChangePercent !== null &&
    input.context.monthComparison.expenseChangePercent >= 25
  ) {
    return "WATCH";
  }

  return "GOOD";
}

function determinePriority(status: FinancialCheckupStatus): FinancialCheckupPriority {
  if (status === "UNKNOWN") {
    return "COLLECT_DATA";
  }

  if (status === "RISK") {
    return "HOLD";
  }

  if (status === "WATCH") {
    return "REDUCE";
  }

  return "MAINTAIN";
}

function buildTitle(status: FinancialCheckupStatus) {
  if (status === "GOOD") {
    return "Checkup Keuangan Baik";
  }

  if (status === "WATCH") {
    return "Checkup Keuangan Waspada";
  }

  if (status === "RISK") {
    return "Checkup Keuangan Berisiko";
  }

  return "Checkup Keuangan Belum Lengkap";
}

function buildHeadline(input: {
  status: FinancialCheckupStatus;
  focusCategoryName: string | null;
}) {
  if (input.status === "GOOD") {
    return "Kondisi bulan ini masih terkendali. Pertahankan pola pengeluaran dan tetap arahkan surplus ke goal atau saldo aman.";
  }

  if (input.status === "WATCH") {
    return input.focusCategoryName
      ? `Bulan ini masih bisa dikendalikan, tetapi kategori ${input.focusCategoryName} perlu jadi fokus kontrol.`
      : "Bulan ini masih bisa dikendalikan, tetapi ritme pengeluaran perlu dipantau.";
  }

  if (input.status === "RISK") {
    return input.focusCategoryName
      ? `Kondisi bulan ini berisiko. Tahan pengeluaran non-prioritas dan fokus kontrol kategori ${input.focusCategoryName}.`
      : "Kondisi bulan ini berisiko. Tahan pengeluaran non-prioritas sampai cashflow lebih aman.";
  }

  return "Belum cukup data untuk membuat checkup keuangan yang akurat. Mulai catat transaksi utama dulu.";
}

function buildReason(input: {
  status: FinancialCheckupStatus;
  netCashflow: number;
  expenseToIncomeRatio: number | null;
  focusCategoryName: string | null;
  focusCategoryExpenseShare: number;
  context: AiFinancialContext;
}) {
  if (input.status === "UNKNOWN") {
    return "Belum ada transaksi bulan ini, sehingga pola pemasukan, pengeluaran, dan batas aman belum bisa dinilai dengan akurat.";
  }

  if (input.status === "RISK") {
    if (input.netCashflow < 0) {
      return "Pengeluaran bulan ini sudah lebih besar dari pemasukan, sehingga cashflow berada dalam kondisi negatif.";
    }

    if (input.context.safeToSpend.status === "HOLD") {
      return input.context.safeToSpend.reason;
    }

    return "Ada sinyal risiko dari rasio pengeluaran, proyeksi cashflow, atau ritme pengeluaran bulan ini.";
  }

  if (input.status === "WATCH") {
    if (input.context.safeToSpend.spendingPaceStatus === "FAST") {
      return "Ritme pengeluaran bulan ini berjalan terlalu cepat dibanding progres periode berjalan.";
    }

    if (input.focusCategoryName && input.focusCategoryExpenseShare >= 40) {
      return `Kategori ${input.focusCategoryName} mengambil porsi besar dari total pengeluaran bulan ini.`;
    }

    if (
      input.context.monthComparison.expenseChangePercent !== null &&
      input.context.monthComparison.expenseChangePercent >= 25
    ) {
      return "Total pengeluaran bulan ini naik cukup besar dibanding bulan lalu.";
    }

    return "Kondisi masih bisa dikendalikan, tetapi ada sinyal pengeluaran yang perlu dipantau.";
  }

  if (input.expenseToIncomeRatio !== null) {
    return `Rasio pengeluaran terhadap pemasukan masih sekitar ${input.expenseToIncomeRatio}%, dan cashflow bulan ini masih positif.`;
  }

  return "Cashflow bulan ini masih positif dan belum ada sinyal risiko besar dari data yang tersedia.";
}

function buildAction(input: {
  status: FinancialCheckupStatus;
  focusCategoryName: string | null;
  suggestedDailyLimit: number | null;
}) {
  if (input.status === "UNKNOWN") {
    return "Catat pemasukan dan pengeluaran utama beberapa hari ke depan agar checkup berikutnya lebih akurat.";
  }

  if (input.status === "RISK") {
    return input.focusCategoryName
      ? `Tahan pengeluaran non-prioritas dan kurangi kategori ${input.focusCategoryName} terlebih dahulu.`
      : "Tahan pengeluaran non-prioritas dan prioritaskan kebutuhan wajib sampai cashflow membaik.";
  }

  if (input.status === "WATCH") {
    if (input.suggestedDailyLimit !== null) {
      return input.focusCategoryName
        ? `Batasi pengeluaran harian mendekati batas aman dan pantau kategori ${input.focusCategoryName}.`
        : "Batasi pengeluaran harian mendekati batas aman sampai akhir bulan.";
    }

    return input.focusCategoryName
      ? `Tetapkan batas sederhana untuk kategori ${input.focusCategoryName} dan evaluasi lagi setelah beberapa transaksi.`
      : "Pantau transaksi harian dan hindari pembelian impulsif.";
  }

  return "Pertahankan pola pengeluaran saat ini dan arahkan surplus ke goal atau saldo aman.";
}

export function buildFinancialCheckup(
  context: AiFinancialContext
): FinancialCheckupResult {
  const totalIncome = toNumber(context.currentMonth.totalIncome);
  const totalExpense = toNumber(context.currentMonth.totalExpense);
  const netCashflow = toNumber(context.currentMonth.netCashflow);
  const topCategory = getTopExpenseCategory(context);
  const focusCategoryName = topCategory?.name ?? null;
  const focusCategoryAmount = topCategory ? toNumber(topCategory.amount) : 0;
  const focusCategoryExpenseShare = topCategory?.percentageOfExpense ?? 0;
  const expenseToIncomeRatio = calculateExpenseToIncomeRatio({
    totalIncome,
    totalExpense
  });

  const status = determineStatus({
    context,
    expenseToIncomeRatio,
    focusCategoryExpenseShare
  });

  const priority = determinePriority(status);

  const warnings = buildWarnings({
    context,
    expenseToIncomeRatio,
    focusCategoryName,
    focusCategoryExpenseShare
  });

  return {
    status,
    priority,
    title: buildTitle(status),
    headline: buildHeadline({
      status,
      focusCategoryName
    }),
    focusCategoryName,
    focusCategoryAmount,
    reason: buildReason({
      status,
      netCashflow,
      expenseToIncomeRatio,
      focusCategoryName,
      focusCategoryExpenseShare,
      context
    }),
    action: buildAction({
      status,
      focusCategoryName,
      suggestedDailyLimit: context.safeToSpend.suggestedDailyLimit
    }),
    warnings,
    metrics: {
      totalIncome,
      totalExpense,
      netCashflow,
      expenseToIncomeRatio,
      expenseChangePercent: context.monthComparison.expenseChangePercent,
      safeToSpendStatus: context.safeToSpend.status,
      spendingPaceStatus: context.safeToSpend.spendingPaceStatus,
      availableToSpend: context.safeToSpend.availableToSpend,
      suggestedDailyLimit: context.safeToSpend.suggestedDailyLimit,
      projectedNetCashflow: context.safeToSpend.projectedNetCashflow
    }
  };
}