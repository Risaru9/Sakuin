export type SummaryTransaction = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: string;
  note: string | null;
  date: string;
  category: {
    id: string;
    name: string;
    type: "INCOME" | "EXPENSE";
    icon: string | null;
    color: string | null;
    isDefault?: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
};

export type SummaryCategoryItem = {
  categoryId: string;
  categoryName: string;
  categoryIcon?: string | null;
  categoryColor?: string | null;
  type: "INCOME" | "EXPENSE";
  totalAmount: string;
  transactionCount: number;
};

export type MonthlyTrendItem = {
  month: string;
  income: string;
  expense: string;
  balance: string;
};

export type SafeToSpendStatus = "SAFE" | "WATCH" | "HOLD" | "UNKNOWN";

export type SpendingPaceStatus = "ON_TRACK" | "WATCH" | "FAST" | "UNKNOWN";

export type SafeToSpendData = {
  status: SafeToSpendStatus;
  spendingPaceStatus: SpendingPaceStatus;
  netCashflow: number;
  safeBalanceLimit: number;
  availableToSpend: number;
  remainingDays: number;
  suggestedDailyLimit: number | null;
  expenseToIncomeRatio: number | null;
  monthProgressPercent: number;
  expensePacePercent: number | null;
  projectedMonthEndExpense: number;
  projectedNetCashflow: number;
  topRiskCategoryName: string | null;
  topRiskCategoryAmount: number;
  reason: string;
  action: string;
  warnings: string[];
};

export type FinancialCheckupStatus = "GOOD" | "WATCH" | "RISK" | "UNKNOWN";

export type FinancialCheckupPriority =
  | "MAINTAIN"
  | "MONITOR"
  | "REDUCE"
  | "HOLD"
  | "COLLECT_DATA";

export type FinancialCheckupData = {
  status: FinancialCheckupStatus;
  priority: FinancialCheckupPriority;
  title: string;
  headline: string;
  focusCategoryName: string | null;
  focusCategoryAmount: number;
  reason: string;
  action: string;
  warnings: string[];
  metrics: {
    totalIncome: number;
    totalExpense: number;
    netCashflow: number;
    expenseToIncomeRatio: number | null;
    expenseChangePercent: number | null;
    safeToSpendStatus: SafeToSpendStatus;
    spendingPaceStatus: SpendingPaceStatus;
    availableToSpend: number;
    suggestedDailyLimit: number | null;
    projectedNetCashflow: number;
  };
};

export type SummaryHabitData = {
  currentMonthTransactionDays: number;
  currentMonthDaysElapsed: number;
  currentMonthCompletenessPercent: number;
  monthActiveDays: number;
  weeklyActiveDays: number;
  currentStreakDays: number;
  hasTransactionToday: boolean;
  transactionsToday: number;
  todayTransactionCount: number;
  expenseTransactionsToday: number;
  todayExpenseCount: number;
  todayIncomeCount: number;
  lastTransactionDate: string | null;
  daysSinceLastTransaction: number | null;
  last7DaysTransactionCount: number;
  last7DaysExpense: string;
  last7DaysTopExpenseCategory: {
    name: string;
    amount: string;
    transactionCount: number;
  } | null;
  completionStatus: "NOT_STARTED" | "STARTED" | "REVIEW_READY" | "STRONG_DAY";
  recommendedAction:
    | "ADD_TRANSACTION"
    | "REVIEW_TODAY"
    | "ASK_ASSISTANT"
    | "CONTINUE_TRACKING";
  habitStatus: "NO_DATA" | "LIGHT" | "ACTIVE" | "STALE";
  habitMessage: string;
  habitMessageDetail?: {
    title: string;
    description: string;
    tone: "NEUTRAL" | "NUDGE" | "GOOD" | "READY";
  };
};

export type SummaryData = {
  totalIncome: string;
  totalExpense: string;
  balance: string;
  safeBalanceLimit: string;
  isBelowSafeLimit: boolean;
  safeToSpend: SafeToSpendData;
  financialCheckup: FinancialCheckupData;
  habit: SummaryHabitData | null;

  incomeThisMonth: string;
  expenseThisMonth: string;
  balanceThisMonth: string;

  transactionCount: number;
  recentTransactions: SummaryTransaction[];
  expenseByCategory: SummaryCategoryItem[];
  incomeByCategory: SummaryCategoryItem[];
  monthlyTrend: MonthlyTrendItem[];
  weeklyCheckin?: {
    expenseDeltaPercent: number | null;
    status: "UP" | "DOWN" | "STABLE" | "NO_DATA";
    summary: string;
    action: string;
  };
  recurringStatus?: {
    generatedCount: number;
    processedRuleCount: number;
  };
};
