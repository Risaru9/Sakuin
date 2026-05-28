import { describe, expect, it } from "vitest";
import { buildFinancialRhythm } from "./financial-rhythm";
import type { SummaryData, SummaryHabitData } from "./summary.types";

const defaultDayRhythm: NonNullable<SummaryHabitData["dayRhythm"]> = [
  "Sen",
  "Sel",
  "Rab",
  "Kam",
  "Jum",
  "Sab",
  "Min"
].map((day, index) => ({
  date: `2026-05-${18 + index}`,
  day: day as NonNullable<SummaryHabitData["dayRhythm"]>[number]["day"],
  hasTransaction: index === 0 || index === 1 || index === 3,
  transactionCount: index === 0 ? 2 : index === 1 || index === 3 ? 1 : 0,
  income: index === 0 ? "100000.00" : "0.00",
  expense: index === 1 ? "35000.00" : "0.00",
  isToday: index === 3,
  isFuture: index > 3
}));

function createSummary(
  summaryOverrides: Partial<SummaryData> = {},
  habitOverrides: Partial<SummaryHabitData> = {}
): SummaryData {
  const habit = {
    currentMonthTransactionDays: 4,
    currentMonthDaysElapsed: 20,
    currentMonthCompletenessPercent: 20,
    monthActiveDays: 4,
    weeklyActiveDays: 3,
    currentWeekActiveDays: 3,
    currentWeekExpense: "90000.00",
    previousWeekExpense: "50000.00",
    currentWeekExpenseTrend: "UP",
    currentWeekTopExpenseCategory: {
      name: "Makanan",
      amount: "65000.00",
      transactionCount: 3
    },
    dayRhythm: defaultDayRhythm,
    currentStreakDays: 1,
    hasTransactionToday: true,
    transactionsToday: 1,
    todayTransactionCount: 1,
    expenseTransactionsToday: 1,
    todayExpenseCount: 1,
    todayIncomeCount: 0,
    lastTransactionDate: "2026-05-21T03:00:00.000Z",
    daysSinceLastTransaction: 0,
    last7DaysTransactionCount: 4,
    last7DaysExpense: "90000.00",
    last7DaysTopExpenseCategory: {
      name: "Makanan",
      amount: "65000.00",
      transactionCount: 3
    },
    completionStatus: "STARTED",
    recommendedAction: "CONTINUE_TRACKING",
    habitStatus: "ACTIVE",
    habitMessage: "Ritme mulai terbentuk.",
    habitMessageDetail: {
      title: "Hari ini sudah tercatat.",
      description: "Data hari ini mulai terbentuk.",
      tone: "GOOD"
    },
    ...habitOverrides
  } satisfies SummaryHabitData;

  return {
    totalIncome: "1000000.00",
    totalExpense: "300000.00",
    balance: "700000.00",
    safeBalanceLimit: "0.00",
    isBelowSafeLimit: false,
    safeToSpend: {} as SummaryData["safeToSpend"],
    financialCheckup: {
      focusCategoryName: "Makanan",
      focusCategoryAmount: 120000
    } as SummaryData["financialCheckup"],
    habit,
    incomeThisMonth: "1000000.00",
    expenseThisMonth: "300000.00",
    balanceThisMonth: "700000.00",
    transactionCount: 6,
    recentTransactions: [],
    expenseByCategory: [],
    incomeByCategory: [],
    monthlyTrend: [
      {
        month: "2026-04",
        income: "900000.00",
        expense: "240000.00",
        balance: "660000.00"
      },
      {
        month: "2026-05",
        income: "1000000.00",
        expense: "300000.00",
        balance: "700000.00"
      }
    ],
    ...summaryOverrides
  } as SummaryData;
}

describe("buildFinancialRhythm", () => {
  it("memberi nudge ringan saat data kosong", () => {
    const rhythm = buildFinancialRhythm(null);

    expect(rhythm.habitStatus).toBe("EMPTY");
    expect(rhythm.financeStatus).toBe("UNKNOWN");
    expect(rhythm.todayHasTransaction).toBe(false);
    expect(rhythm.recommendedAction).toBe("Catat 1 transaksi hari ini.");
    expect(rhythm.dayRhythm).toHaveLength(7);
  });

  it("memprioritaskan catat hari ini sebelum insight lain", () => {
    const rhythm = buildFinancialRhythm(
      createSummary({}, {
        hasTransactionToday: false,
        todayTransactionCount: 0,
        transactionsToday: 0,
        currentStreakDays: 0
      })
    );

    expect(rhythm.todayHasTransaction).toBe(false);
    expect(rhythm.activeDaysThisWeek).toBe(3);
    expect(rhythm.weeklyExpenseTrend).toBe("UP");
    expect(rhythm.financeStatus).toBe("WATCH");
    expect(rhythm.recommendedActionKind).toBe("QUICK_TRANSACTION");
    expect(rhythm.primaryInsight).toContain("catat satu transaksi");
  });

  it("menyarankan asisten saat expense minggu ini naik tajam", () => {
    const rhythm = buildFinancialRhythm(
      createSummary({}, {
        currentWeekActiveDays: 4,
        currentWeekExpense: "220000.00",
        previousWeekExpense: "100000.00",
        currentWeekExpenseTrend: "UP"
      })
    );

    expect(rhythm.financeStatus).toBe("REDUCE");
    expect(rhythm.recommendedActionKind).toBe("ASSISTANT");
    expect(rhythm.recommendedAction).toBe(
      "Cek pengeluaran makanan sebelum akhir minggu."
    );
  });

  it("menganggap minggu tanpa expense sebagai aman jika ada catatan", () => {
    const rhythm = buildFinancialRhythm(
      createSummary({}, {
        currentWeekActiveDays: 1,
        currentWeekExpense: "0.00",
        previousWeekExpense: "0.00",
        currentWeekTopExpenseCategory: null,
        last7DaysTopExpenseCategory: null
      })
    );

    expect(rhythm.financeStatus).toBe("SAFE");
    expect(rhythm.conditionTitle).toBe("Aman");
  });

  it("mendukung mode bulan ini tanpa mengambil data baru", () => {
    const rhythm = buildFinancialRhythm(createSummary(), {
      period: "month",
      hasActiveGoals: true
    });

    expect(rhythm.periodLabel).toBe("bulan ini");
    expect(rhythm.activeDays).toBe(4);
    expect(rhythm.targetDays).toBe(20);
    expect(rhythm.weeklyExpense).toBe(300000);
    expect(rhythm.previousWeeklyExpense).toBe(240000);
    expect(rhythm.topCategoryThisWeek?.name).toBe("Makanan");
  });
});
