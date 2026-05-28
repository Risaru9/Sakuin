import type { SummaryData, SummaryHabitData } from "./summary.types";

export type FinancialRhythmPeriod = "week" | "month";

export type FinancialRhythmHabitStatus =
  | "GOOD"
  | "BUILDING"
  | "STARTING"
  | "EMPTY";

export type FinancialRhythmFinanceStatus =
  | "SAFE"
  | "WATCH"
  | "REDUCE"
  | "UNKNOWN";

export type FinancialRhythmExpenseTrend =
  | "UP"
  | "DOWN"
  | "STABLE"
  | "NO_DATA";

export type FinancialRhythmActionKind =
  | "ADD_TRANSACTION"
  | "QUICK_TRANSACTION"
  | "ASSISTANT"
  | "GOALS";

export type FinancialRhythmDay = {
  date: string;
  day: "Sen" | "Sel" | "Rab" | "Kam" | "Jum" | "Sab" | "Min";
  hasTransaction: boolean;
  transactionCount: number;
  income: string;
  expense: string;
  isToday: boolean;
  isFuture: boolean;
};

export type FinancialRhythmInsight = {
  text: string;
  action: string;
  actionKind: FinancialRhythmActionKind;
};

export type FinancialRhythmViewModel = {
  period: FinancialRhythmPeriod;
  periodLabel: string;
  conditionTitle: string;
  todayHasTransaction: boolean;
  activeDaysThisWeek: number;
  activeDays: number;
  targetDays: number;
  focusTargetDays: number;
  streakDays: number;
  weeklyExpense: number;
  previousWeeklyExpense: number | null;
  weeklyExpenseTrend: FinancialRhythmExpenseTrend;
  topCategoryThisWeek: {
    name: string;
    amount: number;
    transactionCount: number;
  } | null;
  habitStatus: FinancialRhythmHabitStatus;
  financeStatus: FinancialRhythmFinanceStatus;
  primaryInsight: string;
  conditionInsight: string;
  conditionAction: string;
  recommendedAction: string;
  recommendedActionKind: FinancialRhythmActionKind;
  focusProgressLabel: string;
  dayRhythm: FinancialRhythmDay[];
  patternSummary: string;
  insights: FinancialRhythmInsight[];
  assistantPrompt: string;
};

type BuildFinancialRhythmOptions = {
  period?: FinancialRhythmPeriod;
  hasActiveGoals?: boolean;
};

const DEFAULT_DAY_LABELS = [
  "Sen",
  "Sel",
  "Rab",
  "Kam",
  "Jum",
  "Sab",
  "Min"
] as const;

const EMPTY_DAY_RHYTHM: FinancialRhythmDay[] = DEFAULT_DAY_LABELS.map((day) => ({
  date: "",
  day,
  hasTransaction: false,
  transactionCount: 0,
  income: "0.00",
  expense: "0.00",
  isToday: false,
  isFuture: false
}));

function toNumber(value: string | number | null | undefined) {
  const numberValue = Number(value ?? 0);

  if (Number.isNaN(numberValue)) {
    return 0;
  }

  return numberValue;
}

function getExpenseTrend(input: {
  currentExpense: number;
  previousExpense: number | null;
}): FinancialRhythmExpenseTrend {
  if (!input.previousExpense || input.previousExpense <= 0) {
    return "NO_DATA";
  }

  const deltaPercent =
    ((input.currentExpense - input.previousExpense) / input.previousExpense) * 100;

  if (deltaPercent >= 10) {
    return "UP";
  }

  if (deltaPercent <= -10) {
    return "DOWN";
  }

  return "STABLE";
}

function getHabitStatus(input: {
  activeDays: number;
  targetDays: number;
  period: FinancialRhythmPeriod;
}): FinancialRhythmHabitStatus {
  if (input.activeDays <= 0) {
    return "EMPTY";
  }

  if (input.period === "week") {
    if (input.activeDays >= 5) {
      return "GOOD";
    }

    if (input.activeDays >= 3) {
      return "BUILDING";
    }

    return "STARTING";
  }

  const goodThreshold = Math.max(5, Math.ceil(input.targetDays * 0.6));
  const buildingThreshold = Math.max(3, Math.ceil(input.targetDays * 0.3));

  if (input.activeDays >= goodThreshold) {
    return "GOOD";
  }

  if (input.activeDays >= buildingThreshold) {
    return "BUILDING";
  }

  return "STARTING";
}

function getFinanceStatus(input: {
  activeDays: number;
  expense: number;
  previousExpense: number | null;
  trend: FinancialRhythmExpenseTrend;
}): FinancialRhythmFinanceStatus {
  if (input.activeDays <= 0) {
    return "UNKNOWN";
  }

  if (input.expense <= 0) {
    return "SAFE";
  }

  if (!input.previousExpense || input.previousExpense <= 0) {
    return input.activeDays >= 3 ? "SAFE" : "UNKNOWN";
  }

  const increase = input.expense - input.previousExpense;
  const increasePercent = (increase / input.previousExpense) * 100;

  if (increasePercent >= 50 && increase >= 50_000) {
    return "REDUCE";
  }

  if (input.trend === "UP") {
    return "WATCH";
  }

  return "SAFE";
}

function getTopCategory(
  habit: SummaryHabitData | null | undefined,
  summary: SummaryData | null | undefined,
  period: FinancialRhythmPeriod
) {
  if (period === "week") {
    const topCategory =
      habit?.currentWeekTopExpenseCategory === undefined
        ? habit?.last7DaysTopExpenseCategory
        : habit.currentWeekTopExpenseCategory;

    if (!topCategory) {
      return null;
    }

    return {
      name: topCategory.name,
      amount: toNumber(topCategory.amount),
      transactionCount: topCategory.transactionCount
    };
  }

  if (!summary?.financialCheckup.focusCategoryName) {
    return null;
  }

  return {
    name: summary.financialCheckup.focusCategoryName,
    amount: summary.financialCheckup.focusCategoryAmount,
    transactionCount: 0
  };
}

function getPrimaryInsight(input: {
  habitStatus: FinancialRhythmHabitStatus;
  todayHasTransaction: boolean;
  periodLabel: string;
}) {
  if (!input.todayHasTransaction) {
    return "Mulai pelan-pelan dulu. Cukup catat satu transaksi hari ini.";
  }

  if (input.habitStatus === "GOOD") {
    return `Ritme catatmu kuat ${input.periodLabel}.`;
  }

  if (input.habitStatus === "BUILDING") {
    return `Ritmemu mulai terbentuk ${input.periodLabel}.`;
  }

  return "Catatan hari ini sudah masuk. Lanjutkan dengan transaksi kecil berikutnya.";
}

function getConditionCopy(input: {
  financeStatus: FinancialRhythmFinanceStatus;
  trend: FinancialRhythmExpenseTrend;
  topCategoryName: string | null;
  periodLabel: string;
}) {
  if (input.financeStatus === "UNKNOWN") {
    return {
      title: "Belum Cukup Data",
      insight:
        "Catat beberapa transaksi lagi agar Sakuin bisa membaca polamu.",
      action: "Mulai dari 1 transaksi kecil hari ini."
    };
  }

  if (input.financeStatus === "REDUCE") {
    return {
      title: "Kurangi Dulu",
      insight:
        input.topCategoryName !== null
          ? `Pengeluaran ${input.topCategoryName} naik cukup terasa ${input.periodLabel}.`
          : `Pengeluaran naik cukup terasa ${input.periodLabel}.`,
      action: "Tahan pengeluaran non-prioritas dulu."
    };
  }

  if (input.financeStatus === "WATCH") {
    return {
      title: "Perlu Dipantau",
      insight:
        input.topCategoryName !== null
          ? `Pengeluaran ${input.topCategoryName} mulai perlu diperhatikan.`
          : "Ada bagian pengeluaran yang mulai perlu diperhatikan.",
      action: "Cek lagi sebelum akhir minggu."
    };
  }

  return {
    title: "Aman",
    insight:
      input.trend === "DOWN"
        ? `Pengeluaran ${input.periodLabel} lebih ringan dari sebelumnya.`
        : `Pengeluaran ${input.periodLabel} masih terkendali.`,
    action: "Pertahankan ritme catat yang sudah berjalan."
  };
}

function getRecommendedAction(input: {
  todayHasTransaction: boolean;
  activeDays: number;
  financeStatus: FinancialRhythmFinanceStatus;
  topCategoryName: string | null;
  hasActiveGoals: boolean;
  balanceThisMonth: number;
}) {
  if (!input.todayHasTransaction) {
    return {
      text: "Catat 1 transaksi hari ini.",
      kind: "QUICK_TRANSACTION" as const
    };
  }

  if (input.activeDays < 3) {
    return {
      text: "Bangun ritme dulu: catat minimal 1 transaksi per hari.",
      kind: "QUICK_TRANSACTION" as const
    };
  }

  if (input.financeStatus === "REDUCE" || input.financeStatus === "WATCH") {
    return {
      text:
        input.topCategoryName?.toLowerCase() === "makanan"
          ? "Cek pengeluaran makanan sebelum akhir minggu."
          : input.topCategoryName
            ? `Pantau pengeluaran ${input.topCategoryName} sebelum akhir minggu.`
            : "Pantau pengeluaran yang naik minggu ini.",
      kind: "ASSISTANT" as const
    };
  }

  if (input.hasActiveGoals && input.balanceThisMonth > 0) {
    return {
      text: "Pertahankan ritme dan alokasikan surplus kecil ke goals.",
      kind: "GOALS" as const
    };
  }

  return {
    text: "Pertahankan ritme dengan mencatat setelah transaksi.",
    kind: "QUICK_TRANSACTION" as const
  };
}

function buildInsights(input: {
  todayHasTransaction: boolean;
  habitStatus: FinancialRhythmHabitStatus;
  financeStatus: FinancialRhythmFinanceStatus;
  topCategoryName: string | null;
  periodLabel: string;
}): FinancialRhythmInsight[] {
  const insights: FinancialRhythmInsight[] = [];

  if (input.topCategoryName) {
    insights.push({
      text: `${input.topCategoryName} masih jadi pengeluaran yang paling sering muncul.`,
      action: "Coba catat langsung setelah bayar.",
      actionKind: "QUICK_TRANSACTION"
    });
  }

  if (!input.todayHasTransaction) {
    insights.push({
      text: "Catatan hari ini belum ada.",
      action: "Gunakan Catat Cepat untuk transaksi kecil.",
      actionKind: "QUICK_TRANSACTION"
    });
  } else if (input.habitStatus === "GOOD" || input.habitStatus === "BUILDING") {
    insights.push({
      text: `Kamu mulai konsisten mencatat ${input.periodLabel}.`,
      action: "Tanya Asisten untuk evaluasi singkat.",
      actionKind: "ASSISTANT"
    });
  }

  if (input.financeStatus === "UNKNOWN" && insights.length < 2) {
    insights.push({
      text: "Belum cukup data untuk membaca pola pengeluaran.",
      action: "Catat beberapa transaksi lagi pelan-pelan.",
      actionKind: "QUICK_TRANSACTION"
    });
  }

  return insights.slice(0, 2);
}

function getPatternSummary(input: {
  dayRhythm: FinancialRhythmDay[];
  activeDays: number;
  topCategoryName: string | null;
}) {
  const mostActiveDay = input.dayRhythm
    .filter((item) => item.transactionCount > 0)
    .sort((first, second) => second.transactionCount - first.transactionCount)[0];

  if (mostActiveDay) {
    return input.topCategoryName
      ? `Hari paling aktif: ${mostActiveDay.day}. Kategori sering muncul: ${input.topCategoryName}.`
      : `Hari paling aktif: ${mostActiveDay.day}.`;
  }

  if (input.activeDays > 0) {
    return "Ritme catat mulai terlihat, lanjutkan dengan transaksi kecil berikutnya.";
  }

  return "Belum ada pola yang terbaca minggu ini.";
}

export function buildFinancialRhythm(
  summary: SummaryData | null | undefined,
  options: BuildFinancialRhythmOptions = {}
): FinancialRhythmViewModel {
  const period = options.period ?? "week";
  const habit = summary?.habit ?? null;
  const periodLabel = period === "week" ? "minggu ini" : "bulan ini";
  const todayHasTransaction = Boolean(habit?.hasTransactionToday);
  const weekActiveDays =
    habit?.currentWeekActiveDays ?? habit?.weeklyActiveDays ?? 0;
  const activeDays =
    period === "week" ? weekActiveDays : habit?.monthActiveDays ?? 0;
  const targetDays =
    period === "week" ? 7 : Math.max(habit?.currentMonthDaysElapsed ?? 1, 1);
  const focusTargetDays =
    period === "week"
      ? 5
      : Math.min(12, Math.max(5, Math.ceil(targetDays * 0.5)));
  const weeklyExpense =
    period === "week"
      ? toNumber(habit?.currentWeekExpense ?? habit?.last7DaysExpense)
      : toNumber(summary?.expenseThisMonth);
  const previousWeeklyExpense =
    period === "week"
      ? habit?.previousWeekExpense === undefined
        ? null
        : toNumber(habit.previousWeekExpense)
      : summary?.monthlyTrend && summary.monthlyTrend.length >= 2
        ? toNumber(summary.monthlyTrend[summary.monthlyTrend.length - 2]?.expense)
        : null;
  const weeklyExpenseTrend =
    period === "week" && habit?.currentWeekExpenseTrend
      ? habit.currentWeekExpenseTrend
      : getExpenseTrend({
          currentExpense: weeklyExpense,
          previousExpense: previousWeeklyExpense
        });
  const topCategoryThisWeek = getTopCategory(habit, summary, period);
  const habitStatus = getHabitStatus({
    activeDays,
    targetDays,
    period
  });
  const financeStatus = getFinanceStatus({
    activeDays,
    expense: weeklyExpense,
    previousExpense: previousWeeklyExpense,
    trend: weeklyExpenseTrend
  });
  const conditionCopy = getConditionCopy({
    financeStatus,
    trend: weeklyExpenseTrend,
    topCategoryName: topCategoryThisWeek?.name ?? null,
    periodLabel
  });
  const recommendedAction = getRecommendedAction({
    todayHasTransaction,
    activeDays,
    financeStatus,
    topCategoryName: topCategoryThisWeek?.name ?? null,
    hasActiveGoals: Boolean(options.hasActiveGoals),
    balanceThisMonth: toNumber(summary?.balanceThisMonth)
  });
  const dayRhythm =
    habit?.dayRhythm?.length === 7 ? habit.dayRhythm : EMPTY_DAY_RHYTHM;

  return {
    period,
    periodLabel,
    conditionTitle: conditionCopy.title,
    todayHasTransaction,
    activeDaysThisWeek: weekActiveDays,
    activeDays,
    targetDays,
    focusTargetDays,
    streakDays: habit?.currentStreakDays ?? 0,
    weeklyExpense,
    previousWeeklyExpense,
    weeklyExpenseTrend,
    topCategoryThisWeek,
    habitStatus,
    financeStatus,
    primaryInsight: getPrimaryInsight({
      habitStatus,
      todayHasTransaction,
      periodLabel
    }),
    conditionInsight: conditionCopy.insight,
    conditionAction: conditionCopy.action,
    recommendedAction: recommendedAction.text,
    recommendedActionKind: recommendedAction.kind,
    focusProgressLabel: `${Math.min(activeDays, focusTargetDays)}/${focusTargetDays} hari tercatat`,
    dayRhythm,
    patternSummary: getPatternSummary({
      dayRhythm,
      activeDays,
      topCategoryName: topCategoryThisWeek?.name ?? null
    }),
    insights: buildInsights({
      todayHasTransaction,
      habitStatus,
      financeStatus,
      topCategoryName: topCategoryThisWeek?.name ?? null,
      periodLabel
    }),
    assistantPrompt: "Bantu saya evaluasi kebiasaan keuangan minggu ini."
  };
}
