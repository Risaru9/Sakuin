import type { FinancialCheckupResult } from "../finance/financial-checkup.js";
import type { SafeToSpendResult } from "../finance/safe-to-spend.js";
import type { AiFinancialHabitContext } from "../ai/ai-financial-context.js";
import type {
  RecentTransaction,
  CategorySummaryItem,
  MonthlyTrendItem
} from "@sakuin/shared";

export type SummaryAmount = string;

export type { RecentTransaction, CategorySummaryItem, MonthlyTrendItem };

export type SummaryResponse = {
  totalIncome: SummaryAmount;
  totalExpense: SummaryAmount;
  balance: SummaryAmount;
  safeBalanceLimit: SummaryAmount;
  isBelowSafeLimit: boolean;
  safeToSpend: SafeToSpendResult;
  financialCheckup: FinancialCheckupResult;
  habit: AiFinancialHabitContext | null;

  incomeThisMonth: SummaryAmount;
  expenseThisMonth: SummaryAmount;
  balanceThisMonth: SummaryAmount;

  transactionCount: number;
  recentTransactions: RecentTransaction[];

  expenseByCategory: CategorySummaryItem[];
  incomeByCategory: CategorySummaryItem[];
  monthlyTrend: MonthlyTrendItem[];
  recurringStatus: {
    generatedCount: number;
    processedRuleCount: number;
  };
};
