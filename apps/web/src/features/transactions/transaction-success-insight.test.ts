import { describe, expect, it } from "vitest";
import type { SummaryData } from "../summary/summary.types";
import type { Transaction } from "./transaction.types";
import { buildTransactionSuccessInsight } from "./transaction-success-insight";

const referenceDate = new Date("2026-05-27T10:00:00.000Z");

function createSummary(): SummaryData {
  return {
    totalIncome: "3000000.00",
    totalExpense: "500000.00",
    balance: "2500000.00",
    safeBalanceLimit: "50000.00",
    isBelowSafeLimit: false,
    safeToSpend: {
      status: "SAFE",
      spendingPaceStatus: "ON_TRACK",
      netCashflow: 2500000,
      safeBalanceLimit: 50000,
      availableToSpend: 2450000,
      remainingDays: 5,
      suggestedDailyLimit: 490000,
      expenseToIncomeRatio: 16.7,
      monthProgressPercent: 87.1,
      expensePacePercent: 16.7,
      projectedMonthEndExpense: 600000,
      projectedNetCashflow: 2400000,
      topRiskCategoryName: "Makanan",
      topRiskCategoryAmount: 300000,
      reason: "Aman",
      action: "Pertahankan",
      warnings: []
    },
    financialCheckup: {
      status: "GOOD",
      priority: "MAINTAIN",
      title: "Checkup baik",
      headline: "Kondisi aman",
      focusCategoryName: "Makanan",
      focusCategoryAmount: 300000,
      reason: "Cashflow positif",
      action: "Pertahankan pencatatan",
      warnings: [],
      metrics: {
        totalIncome: 3000000,
        totalExpense: 500000,
        netCashflow: 2500000,
        expenseToIncomeRatio: 16.7,
        expenseChangePercent: null,
        safeToSpendStatus: "SAFE",
        spendingPaceStatus: "ON_TRACK",
        availableToSpend: 2450000,
        suggestedDailyLimit: 490000,
        projectedNetCashflow: 2400000
      }
    },
    incomeThisMonth: "3000000.00",
    expenseThisMonth: "500000.00",
    balanceThisMonth: "2500000.00",
    transactionCount: 7,
    recentTransactions: [],
    expenseByCategory: [
      {
        categoryId: "cat-food",
        categoryName: "Makanan",
        categoryIcon: null,
        categoryColor: null,
        type: "EXPENSE",
        totalAmount: "300000.00",
        transactionCount: 4
      }
    ],
    incomeByCategory: [],
    monthlyTrend: []
  };
}

function createTransaction(
  override: Partial<Transaction> = {}
): Transaction {
  return {
    id: "tx-1",
    type: "EXPENSE",
    amount: "25000",
    categoryId: "cat-food",
    category: {
      id: "cat-food",
      name: "Makanan",
      type: "EXPENSE",
      icon: null,
      color: null,
      isDefault: false
    },
    date: "2026-05-27T00:00:00.000Z",
    note: "Makan siang",
    createdAt: "2026-05-27T10:00:00.000Z",
    updatedAt: "2026-05-27T10:00:00.000Z",
    ...override
  };
}

describe("buildTransactionSuccessInsight", () => {
  it("menjelaskan dampak transaksi expense ke kategori bulan ini", () => {
    const insight = buildTransactionSuccessInsight({
      transactions: [createTransaction()],
      previousSummary: createSummary(),
      referenceDate
    });

    expect(insight).toMatch(/Makanan bulan ini jadi Rp\s?325\.000/);
    expect(insight).toContain("dari 5 transaksi");
    expect(insight).toContain("Total catatanmu sekarang 8");
  });

  it("memberi insight ringkas untuk transaksi cepat banyak item", () => {
    const insight = buildTransactionSuccessInsight({
      transactions: [
        createTransaction({ id: "tx-1", amount: "25000" }),
        createTransaction({ id: "tx-2", amount: "15000" })
      ],
      previousSummary: createSummary(),
      createdCategoryCount: 1,
      referenceDate
    });

    expect(insight).toContain("2 transaksi tersimpan");
    expect(insight).toMatch(/Expense yang baru dicatat Rp\s?40\.000/);
    expect(insight).toContain("1 kategori baru juga siap dipakai lagi");
  });
});
