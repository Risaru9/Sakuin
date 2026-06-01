import type {
  RecentTransaction,
  CategorySummaryItem,
  MonthlyTrendItem as SharedMonthlyTrendItem,
  SafeToSpendStatus as SharedSafeToSpendStatus,
  SpendingPaceStatus as SharedSpendingPaceStatus,
  SafeToSpendResult,
  FinancialCheckupStatus as SharedFinancialCheckupStatus,
  FinancialCheckupPriority as SharedFinancialCheckupPriority,
  FinancialCheckupResult,
  HabitSummaryResult,
  SummaryResponse
} from "@sakuin/shared";

export type SummaryTransaction = RecentTransaction;
export type SummaryCategoryItem = CategorySummaryItem;
export type MonthlyTrendItem = SharedMonthlyTrendItem;
export type SafeToSpendStatus = SharedSafeToSpendStatus;
export type SpendingPaceStatus = SharedSpendingPaceStatus;
export type SafeToSpendData = SafeToSpendResult;
export type FinancialCheckupStatus = SharedFinancialCheckupStatus;
export type FinancialCheckupPriority = SharedFinancialCheckupPriority;
export type FinancialCheckupData = FinancialCheckupResult;
export type SummaryHabitData = HabitSummaryResult;
export type SummaryData = SummaryResponse;
