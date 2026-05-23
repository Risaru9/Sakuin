import { describe, expect, it } from "vitest";
import type { AiFinancialContext } from "../src/modules/ai/ai-financial-context.js";
import { buildFinancialCheckup } from "../src/modules/finance/financial-checkup.js";

type FinancialCheckupContextOverride = Partial<
  Omit<
    AiFinancialContext,
    | "currentMonth"
    | "previousMonth"
    | "monthComparison"
    | "goals"
    | "safeToSpend"
  >
> & {
  currentMonth?: Partial<AiFinancialContext["currentMonth"]>;
  previousMonth?: Partial<AiFinancialContext["previousMonth"]>;
  monthComparison?: Partial<AiFinancialContext["monthComparison"]>;
  goals?: Partial<AiFinancialContext["goals"]>;
  safeToSpend?: Partial<AiFinancialContext["safeToSpend"]>;
};

function createFinancialContext(
  override: FinancialCheckupContextOverride = {}
): AiFinancialContext {
  const baseContext: AiFinancialContext = {
    currency: "IDR",
    generatedAt: "2026-05-20T12:00:00.000Z",
    safeBalanceLimit: "500000.00",
    currentMonth: {
      periodLabel: "Mei 2026",
      startDate: "2026-05-01T00:00:00.000Z",
      endDate: "2026-06-01T00:00:00.000Z",
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
    },
    previousMonth: {
      periodLabel: "April 2026",
      startDate: "2026-04-01T00:00:00.000Z",
      endDate: "2026-05-01T00:00:00.000Z",
      totalIncome: "3000000.00",
      totalExpense: "500000.00",
      netCashflow: "2500000.00",
      transactionCount: 3,
      topExpenseCategories: [
        {
          name: "Makanan",
          amount: "150000.00",
          transactionCount: 2,
          percentageOfExpense: 30,
          percentageOfIncome: 5
        }
      ]
    },
    monthComparison: {
      incomeChangePercent: 0,
      expenseChangePercent: 20
    },
    goals: {
      totalGoals: 0,
      completedGoals: 0,
      activeGoals: 0,
      overdueGoals: 0
    },
    safeToSpend: {
      status: "SAFE",
      spendingPaceStatus: "ON_TRACK",
      netCashflow: 2400000,
      safeBalanceLimit: 500000,
      availableToSpend: 1900000,
      remainingDays: 12,
      suggestedDailyLimit: 158333,
      expenseToIncomeRatio: 20,
      monthProgressPercent: 64.5,
      expensePacePercent: 20,
      projectedMonthEndExpense: 930000,
      projectedNetCashflow: 2070000,
      topRiskCategoryName: "Makanan",
      topRiskCategoryAmount: 180000,
      reason: "Cashflow bulan ini masih positif.",
      action: "Kamu masih bisa memakai sekitar Rp158.333 per hari.",
      warnings: []
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
    },
    safeToSpend: {
      ...baseContext.safeToSpend,
      ...override.safeToSpend
    }
  };
}

describe("Financial checkup engine", () => {
  it("menghasilkan UNKNOWN jika data transaksi belum ada", () => {
    const context = createFinancialContext({
      currentMonth: {
        totalIncome: "0.00",
        totalExpense: "0.00",
        netCashflow: "0.00",
        transactionCount: 0,
        topExpenseCategories: []
      },
      safeToSpend: {
        status: "UNKNOWN",
        spendingPaceStatus: "UNKNOWN",
        netCashflow: 0,
        availableToSpend: 0,
        suggestedDailyLimit: null,
        expenseToIncomeRatio: null,
        topRiskCategoryName: null,
        topRiskCategoryAmount: 0,
        reason:
          "Belum ada data transaksi bulan ini, jadi batas aman pengeluaran belum bisa dihitung dengan akurat.",
        action:
          "Catat pemasukan dan pengeluaran utama terlebih dahulu agar batas aman bisa dihitung.",
        warnings: ["Belum ada transaksi bulan ini."]
      }
    });

    const result = buildFinancialCheckup(context);

    expect(result.status).toBe("UNKNOWN");
    expect(result.priority).toBe("COLLECT_DATA");
    expect(result.title).toBe("Checkup Keuangan Belum Lengkap");
    expect(result.focusCategoryName).toBeNull();
    expect(result.reason).toContain("Belum ada transaksi");
    expect(result.action).toContain("Catat pemasukan dan pengeluaran");
    expect(result.warnings).toContain("Belum ada transaksi bulan ini.");
  });

  it("menghasilkan RISK jika safe-to-spend HOLD dan cashflow negatif", () => {
    const context = createFinancialContext({
      currentMonth: {
        totalIncome: "1000000.00",
        totalExpense: "1500000.00",
        netCashflow: "-500000.00",
        transactionCount: 3,
        topExpenseCategories: [
          {
            name: "Belanja",
            amount: "1200000.00",
            transactionCount: 2,
            percentageOfExpense: 80,
            percentageOfIncome: 120
          }
        ]
      },
      safeToSpend: {
        status: "HOLD",
        spendingPaceStatus: "FAST",
        netCashflow: -500000,
        availableToSpend: 0,
        suggestedDailyLimit: 0,
        expenseToIncomeRatio: 150,
        projectedNetCashflow: -1200000,
        topRiskCategoryName: "Belanja",
        topRiskCategoryAmount: 1200000,
        reason:
          "Pengeluaran bulan ini sudah lebih besar daripada pemasukan, sehingga cashflow berada dalam kondisi negatif.",
        action:
          "Tahan pengeluaran non-prioritas dan fokus kontrol kategori Belanja.",
        warnings: [
          "Cashflow bulan ini negatif.",
          "Ritme pengeluaran bulan ini terlalu cepat."
        ]
      }
    });

    const result = buildFinancialCheckup(context);

    expect(result.status).toBe("RISK");
    expect(result.priority).toBe("HOLD");
    expect(result.focusCategoryName).toBe("Belanja");
    expect(result.focusCategoryAmount).toBe(1200000);
    expect(result.headline).toContain("berisiko");
    expect(result.reason).toContain("cashflow");
    expect(result.action).toContain("Tahan pengeluaran non-prioritas");
    expect(result.warnings).toContain("Cashflow bulan ini negatif.");
    expect(result.metrics.safeToSpendStatus).toBe("HOLD");
  });

  it("menghasilkan WATCH jika kategori terbesar dominan", () => {
    const context = createFinancialContext({
      currentMonth: {
        totalIncome: "3000000.00",
        totalExpense: "1200000.00",
        netCashflow: "1800000.00",
        transactionCount: 5,
        topExpenseCategories: [
          {
            name: "Makanan",
            amount: "900000.00",
            transactionCount: 4,
            percentageOfExpense: 75,
            percentageOfIncome: 30
          }
        ]
      },
      monthComparison: {
        expenseChangePercent: 10
      },
      safeToSpend: {
        status: "SAFE",
        spendingPaceStatus: "ON_TRACK",
        netCashflow: 1800000,
        availableToSpend: 1300000,
        suggestedDailyLimit: 100000,
        expenseToIncomeRatio: 40,
        topRiskCategoryName: "Makanan",
        topRiskCategoryAmount: 900000
      }
    });

    const result = buildFinancialCheckup(context);

    expect(result.status).toBe("WATCH");
    expect(result.priority).toBe("REDUCE");
    expect(result.focusCategoryName).toBe("Makanan");
    expect(result.headline).toContain("Makanan");
    expect(result.reason).toContain("Kategori Makanan");
    expect(result.action).toContain("Makanan");
    expect(result.warnings).toContain(
      "Kategori Makanan mengambil porsi besar dari total pengeluaran."
    );
  });

  it("menghasilkan GOOD jika safe-to-spend aman dan rasio pengeluaran rendah", () => {
    const context = createFinancialContext();

    const result = buildFinancialCheckup(context);

    expect(result.status).toBe("GOOD");
    expect(result.priority).toBe("MAINTAIN");
    expect(result.title).toBe("Checkup Keuangan Baik");
    expect(result.headline).toContain("terkendali");
    expect(result.reason).toContain("Rasio pengeluaran");
    expect(result.action).toContain("Pertahankan pola pengeluaran");
    expect(result.metrics.expenseToIncomeRatio).toBe(20);
    expect(result.metrics.safeToSpendStatus).toBe("SAFE");
  });

  it("memasukkan warning goal overdue", () => {
    const context = createFinancialContext({
      goals: {
        overdueGoals: 1
      }
    });

    const result = buildFinancialCheckup(context);

    expect(result.warnings).toContain("Ada goal yang sudah melewati deadline.");
  });
});