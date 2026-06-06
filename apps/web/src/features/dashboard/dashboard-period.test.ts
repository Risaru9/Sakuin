import { describe, expect, it } from "vitest";
import {
  buildPeriodDashboardMetrics,
  getDashboardPeriodLabel,
  getDashboardPeriodRange,
  parseDashboardMonth,
  parseDashboardYear
} from "./dashboard-period";
import type { Transaction } from "../transactions/transaction.types";

describe("dashboard period", () => {
  it("memvalidasi query bulan dan tahun", () => {
    expect(parseDashboardMonth("6", 1)).toBe(6);
    expect(parseDashboardMonth("all", 1)).toBe("all");
    expect(parseDashboardMonth("13", 4)).toBe(4);
    expect(parseDashboardYear("2026", 2025)).toBe(2026);
    expect(parseDashboardYear("invalid", 2025)).toBe(2025);
  });

  it("membuat label dan rentang periode", () => {
    expect(getDashboardPeriodLabel(6, 2026)).toBe("Juni 2026");
    expect(getDashboardPeriodLabel("all", 2026)).toBe("Tahun 2026");
    expect(getDashboardPeriodLabel("all", "all")).toBe("Semua waktu");

    const range = getDashboardPeriodRange(6, 2026);
    expect(new Date(range?.startDate ?? "").getMonth()).toBe(5);
    expect(new Date(range?.endDate ?? "").getMonth()).toBe(5);
    expect(getDashboardPeriodRange("all", "all")).toBeNull();
  });

  it("menghitung metrik transaksi periode", () => {
    const transactions = [
      { id: "income", type: "INCOME", amount: "100000" },
      { id: "expense", type: "EXPENSE", amount: "25000" }
    ] as Transaction[];

    expect(buildPeriodDashboardMetrics(transactions)).toMatchObject({
      totalIncome: "100000.00",
      totalExpense: "25000.00",
      balance: "75000.00",
      transactionCount: 2,
      recentTransactions: transactions
    });
  });
});
