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

export type SummaryData = {
  totalIncome: string;
  totalExpense: string;
  balance: string;
  safeBalanceLimit: string;
  isBelowSafeLimit: boolean;
  safeToSpend: SafeToSpendData;

  incomeThisMonth: string;
  expenseThisMonth: string;
  balanceThisMonth: string;

  transactionCount: number;
  recentTransactions: SummaryTransaction[];
  expenseByCategory: SummaryCategoryItem[];
  incomeByCategory: SummaryCategoryItem[];
  monthlyTrend: MonthlyTrendItem[];
};