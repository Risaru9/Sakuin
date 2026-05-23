import { describe, expect, it } from "vitest";
import type { AiFinancialContext } from "../src/modules/ai/ai-financial-context.js";
import {
  analyzePurchaseDecision,
  buildPurchaseDecisionPromptContext
} from "../src/modules/ai/ai-purchase-decision.js";

function createFinancialContext(
  override: Partial<AiFinancialContext["safeToSpend"]> = {}
): AiFinancialContext {
  const safeToSpend: AiFinancialContext["safeToSpend"] = {
    status: "SAFE",
    spendingPaceStatus: "ON_TRACK",
    netCashflow: 2_000_000,
    safeBalanceLimit: 500_000,
    availableToSpend: 1_500_000,
    remainingDays: 15,
    suggestedDailyLimit: 100_000,
    expenseToIncomeRatio: 40,
    monthProgressPercent: 50,
    expensePacePercent: 40,
    projectedMonthEndExpense: 1_500_000,
    projectedNetCashflow: 1_500_000,
    topRiskCategoryName: "Makanan",
    topRiskCategoryAmount: 800_000,
    reason: "Cashflow masih positif.",
    action: "Batasi pengeluaran harian.",
    warnings: [],
    ...override
  };

  return {
    currency: "IDR",
    generatedAt: "2026-05-20T12:00:00.000Z",
    safeBalanceLimit: "500000.00",
    currentMonth: {
      periodLabel: "Mei 2026",
      startDate: "2026-05-01T00:00:00.000Z",
      endDate: "2026-06-01T00:00:00.000Z",
      totalIncome: "3000000.00",
      totalExpense: "1000000.00",
      netCashflow: "2000000.00",
      transactionCount: 4,
      topExpenseCategories: [
        {
          name: "Makanan",
          amount: "800000.00",
          transactionCount: 4,
          percentageOfExpense: 80,
          percentageOfIncome: 26.7
        }
      ]
    },
    previousMonth: {
      periodLabel: "April 2026",
      startDate: "2026-04-01T00:00:00.000Z",
      endDate: "2026-05-01T00:00:00.000Z",
      totalIncome: "3000000.00",
      totalExpense: "900000.00",
      netCashflow: "2100000.00",
      transactionCount: 3,
      topExpenseCategories: []
    },
    monthComparison: {
      incomeChangePercent: 0,
      expenseChangePercent: 11.1
    },
    goals: {
      totalGoals: 0,
      completedGoals: 0,
      activeGoals: 0,
      overdueGoals: 0
    },
    safeToSpend
  };
}

describe("AI purchase decision analyzer", () => {
  it("mendeteksi keputusan pembelian langsung dari prompt user", () => {
    const context = createFinancialContext();

    const decision = analyzePurchaseDecision(
      "kalau saya beli sepatu 500 ribu sekarang aman nggak?",
      context
    );

    expect(decision.detected).toBe(true);
    expect(decision.itemName).toBe("sepatu");
    expect(decision.purchaseAmount).toBe(500_000);
    expect(decision.status).toBe("LIMITED");
    expect(decision.riskLevel).toBe("Sedang");
    expect(decision.availableToSpendBeforePurchase).toBe(1_500_000);
    expect(decision.availableToSpendAfterPurchase).toBe(1_000_000);
    expect(decision.reason).toContain("limit harian aman");
    expect(decision.action).toContain("Boleh dipertimbangkan");
    expect(decision.reason).toMatch(/Rp\s*500\.000/);
    expect(decision.reason).toMatch(/Rp\s*100\.000/);
    expect(decision.action).toContain("limit harian aman");
    expect(decision.action).toContain("tunda sebagian pengeluaran lain");
    expect(decision.warnings).toContain(
      "Nominal pembelian melebihi limit harian aman."
    );
  });

  it("menyarankan tahan jika nominal pembelian melebihi sisa aman", () => {
    const context = createFinancialContext({
      status: "WATCH",
      availableToSpend: 200_000,
      suggestedDailyLimit: 20_000
    });

    const decision = analyzePurchaseDecision(
      "boleh beli jaket 500 ribu hari ini?",
      context
    );

    expect(decision.detected).toBe(true);
    expect(decision.itemName).toBe("jaket");
    expect(decision.purchaseAmount).toBe(500_000);
    expect(decision.status).toBe("HOLD");
    expect(decision.riskLevel).toBe("Tinggi");
    expect(decision.availableToSpendAfterPurchase).toBe(0);
    expect(decision.reason).toContain("lebih besar dari sisa aman");
    expect(decision.action).toContain("Tunda pembelian");
    expect(decision.reason).toMatch(/Rp\s*500\.000/);
    expect(decision.reason).toMatch(/Rp\s*200\.000/);
    expect(decision.action).toContain("kebutuhan wajib");
  });

  it("tidak mendeteksi skenario tenor jangka panjang sebagai purchase decision langsung", () => {
    const context = createFinancialContext();

    const decision = analyzePurchaseDecision(
      "Gaji saya 8 juta, ingin membeli motor 30 juta dalam 24 bulan apakah realistis?",
      context
    );

    expect(decision.detected).toBe(false);
    expect(decision.purchaseAmount).toBeNull();
  });

  it("membuat prompt context purchase decision tanpa data sensitif mentah", () => {
    const context = createFinancialContext({
      status: "HOLD",
      availableToSpend: 100_000,
      suggestedDailyLimit: 10_000,
      topRiskCategoryName: "Belanja"
    });

    const decision = analyzePurchaseDecision(
      "kalau saya beli tas 300 ribu sekarang aman gak?",
      context
    );

    const promptContext = buildPurchaseDecisionPromptContext(decision);

    expect(promptContext).toContain("Item pembelian");
    expect(promptContext).toContain("Nominal pembelian");
    expect(promptContext).toContain("Keputusan deterministik");
    expect(promptContext).toContain("Sisa aman sebelum pembelian");
    expect(promptContext).toContain("Sisa aman setelah pembelian");
    expect(promptContext).toContain("Aksi pembelian");
    expect(promptContext).toContain("Belanja");
  });
});