import { describe, expect, it } from "vitest";
import type { AiFinancialBaseContext } from "../src/modules/ai/ai-financial-context.js";
import { calculateSafeToSpend } from "../src/modules/finance/safe-to-spend.js";

type FinancialContextOverride = Partial<
  Omit<
    AiFinancialBaseContext,
    "currentMonth" | "previousMonth" | "monthComparison" | "goals"
  >
> & {
  currentMonth?: Partial<AiFinancialBaseContext["currentMonth"]>;
  previousMonth?: Partial<AiFinancialBaseContext["previousMonth"]>;
  monthComparison?: Partial<AiFinancialBaseContext["monthComparison"]>;
  goals?: Partial<AiFinancialBaseContext["goals"]>;
};

function createFinancialContext(
  override: FinancialContextOverride = {}
): AiFinancialBaseContext {
  const baseContext: AiFinancialBaseContext = {
    currency: "IDR",
    generatedAt: "2026-05-20T12:00:00.000Z",
    safeBalanceLimit: "50000.00",
    currentMonth: {
      periodLabel: "Mei 2026",
      startDate: "2026-05-01T00:00:00.000Z",
      endDate: "2026-06-01T00:00:00.000Z",
      totalIncome: "0.00",
      totalExpense: "0.00",
      netCashflow: "0.00",
      transactionCount: 0,
      topExpenseCategories: []
    },
    previousMonth: {
      periodLabel: "April 2026",
      startDate: "2026-04-01T00:00:00.000Z",
      endDate: "2026-05-01T00:00:00.000Z",
      totalIncome: "0.00",
      totalExpense: "0.00",
      netCashflow: "0.00",
      transactionCount: 0,
      topExpenseCategories: []
    },
    monthComparison: {
      incomeChangePercent: 0,
      expenseChangePercent: 0
    },
    goals: {
      totalGoals: 0,
      completedGoals: 0,
      activeGoals: 0,
      overdueGoals: 0
    }
  };

  return {
    ...baseContext,
    ...override,
    currentMonth: {
      ...baseContext.currentMonth,
      ...override.currentMonth
    },
    previousMonth: {
      ...baseContext.previousMonth,
      ...override.previousMonth
    },
    monthComparison: {
      ...baseContext.monthComparison,
      ...override.monthComparison
    },
    goals: {
      ...baseContext.goals,
      ...override.goals
    }
  };
}

describe("Safe-to-Spend engine", () => {
  it("menghasilkan UNKNOWN jika belum ada transaksi bulan ini", () => {
    const context = createFinancialContext();

    const result = calculateSafeToSpend(context);

    expect(result.status).toBe("UNKNOWN");
    expect(result.spendingPaceStatus).toBe("UNKNOWN");
    expect(result.availableToSpend).toBe(0);
    expect(result.suggestedDailyLimit).toBeNull();
    expect(result.expenseToIncomeRatio).toBeNull();
    expect(result.topRiskCategoryName).toBeNull();
    expect(result.reason).toContain("Belum ada data transaksi");
    expect(result.action).toContain("Catat pemasukan dan pengeluaran");
    expect(result.warnings).toContain("Belum ada transaksi bulan ini.");
  });

  it("menghasilkan HOLD jika cashflow negatif", () => {
    const context = createFinancialContext({
      safeBalanceLimit: "50000.00",
      currentMonth: {
        totalIncome: "1000000.00",
        totalExpense: "1500000.00",
        netCashflow: "-500000.00",
        transactionCount: 2,
        topExpenseCategories: [
          {
            name: "Belanja",
            amount: "1500000.00",
            transactionCount: 1,
            percentageOfExpense: 100,
            percentageOfIncome: 150
          }
        ]
      }
    });

    const result = calculateSafeToSpend(context);

    expect(result.status).toBe("HOLD");
    expect(result.netCashflow).toBe(-500000);
    expect(result.availableToSpend).toBe(0);
    expect(result.suggestedDailyLimit).toBe(0);
    expect(result.expenseToIncomeRatio).toBe(150);
    expect(result.topRiskCategoryName).toBe("Belanja");
    expect(result.topRiskCategoryAmount).toBe(1500000);
    expect(result.reason).toContain("Pengeluaran bulan ini sudah lebih besar");
    expect(result.action).toContain("Tahan pengeluaran non-prioritas");
    expect(result.warnings).toContain("Cashflow bulan ini negatif.");
    expect(result.warnings).toContain(
      "Tidak ada ruang aman untuk pengeluaran tambahan."
    );
  });

  it("menghasilkan WATCH jika kategori terbesar dominan dan ritme perlu dipantau", () => {
    const context = createFinancialContext({
      generatedAt: "2026-05-17T12:00:00.000Z",
      safeBalanceLimit: "500000.00",
      currentMonth: {
        totalIncome: "3000000.00",
        totalExpense: "1500000.00",
        netCashflow: "1500000.00",
        transactionCount: 4,
        topExpenseCategories: [
          {
            name: "Makanan",
            amount: "1200000.00",
            transactionCount: 3,
            percentageOfExpense: 80,
            percentageOfIncome: 40
          }
        ]
      }
    });

    const result = calculateSafeToSpend(context);

    expect(result.status).toBe("WATCH");
    expect(result.spendingPaceStatus).toBe("WATCH");
    expect(result.availableToSpend).toBe(1000000);
    expect(result.suggestedDailyLimit).toBeGreaterThan(0);
    expect(result.expenseToIncomeRatio).toBe(50);
    expect(result.topRiskCategoryName).toBe("Makanan");
    expect(result.reason).toMatch(/ritme|kategori Makanan/i);
    expect(result.action).toContain("Makanan");
    expect(result.warnings).toContain("Ritme pengeluaran perlu dipantau.");
    expect(result.warnings).toContain(
      "Kategori Makanan mengambil porsi besar dari total pengeluaran."
    );
  });

  it("menghasilkan SAFE jika cashflow positif dan ruang aman masih besar", () => {
    const context = createFinancialContext({
      safeBalanceLimit: "500000.00",
      currentMonth: {
        totalIncome: "3000000.00",
        totalExpense: "600000.00",
        netCashflow: "2400000.00",
        transactionCount: 3,
        topExpenseCategories: [
          {
            name: "Makanan",
            amount: "180000.00",
            transactionCount: 2,
            percentageOfExpense: 30,
            percentageOfIncome: 6
        }
        ]
      }
    });

    const result = calculateSafeToSpend(context);

    expect(result.status).toBe("SAFE");
    expect(result.netCashflow).toBe(2400000);
    expect(result.safeBalanceLimit).toBe(500000);
    expect(result.availableToSpend).toBe(1900000);
    expect(result.suggestedDailyLimit).toBeGreaterThan(0);
    expect(result.expenseToIncomeRatio).toBe(20);
    expect(result.topRiskCategoryName).toBe("Makanan");
    expect(result.reason).toContain("Cashflow bulan ini masih positif");
    expect(result.action).toContain("Kamu masih bisa memakai");
  });

  it("memasukkan warning goal overdue jika ada goal melewati deadline", () => {
    const context = createFinancialContext({
      currentMonth: {
        totalIncome: "3000000.00",
        totalExpense: "600000.00",
        netCashflow: "2400000.00",
        transactionCount: 3,
        topExpenseCategories: [
          {
            name: "Makanan",
            amount: "300000.00",
            transactionCount: 2,
            percentageOfExpense: 50,
            percentageOfIncome: 10
          }
        ]
      },
      goals: {
        totalGoals: 2,
        activeGoals: 1,
        completedGoals: 1,
        overdueGoals: 1
      }
    });

    const result = calculateSafeToSpend(context);

    expect(result.warnings).toContain("Ada goal yang sudah melewati deadline.");
  });
});