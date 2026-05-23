import type { FinancialCheckupResult } from "../finance/financial-checkup.js";
import type { SafeToSpendResult } from "../finance/safe-to-spend.js";

export type SummaryAmount = string;

export type RecentTransaction = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: SummaryAmount;
  note: string | null;
  date: string;
  category: {
    id: string;
    name: string;
    type: "INCOME" | "EXPENSE";
    icon: string | null;
    color: string | null;
  };
};

export type CategorySummaryItem = {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  type: "INCOME" | "EXPENSE";
  totalAmount: SummaryAmount;
  transactionCount: number;
};

export type MonthlyTrendItem = {
  month: string;
  income: SummaryAmount;
  expense: SummaryAmount;
  balance: SummaryAmount;
};

export type SummaryResponse = {
  totalIncome: SummaryAmount;
  totalExpense: SummaryAmount;
  balance: SummaryAmount;
  safeBalanceLimit: SummaryAmount;
  isBelowSafeLimit: boolean;
  safeToSpend: SafeToSpendResult;
  financialCheckup: FinancialCheckupResult;

  incomeThisMonth: SummaryAmount;
  expenseThisMonth: SummaryAmount;
  balanceThisMonth: SummaryAmount;

  transactionCount: number;
  recentTransactions: RecentTransaction[];

  expenseByCategory: CategorySummaryItem[];
  incomeByCategory: CategorySummaryItem[];
  monthlyTrend: MonthlyTrendItem[];
};