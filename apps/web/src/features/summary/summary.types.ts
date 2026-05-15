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
  createdAt: string;
  updatedAt: string;
};

export type SummaryCategoryItem = {
  categoryId: string;
  categoryName: string;
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

export type SummaryData = {
  totalIncome: string;
  totalExpense: string;
  balance: string;
  safeBalanceLimit: string;
  isBelowSafeLimit: boolean;
  incomeThisMonth: string;
  expenseThisMonth: string;
  balanceThisMonth: string;
  transactionCount: number;
  recentTransactions: SummaryTransaction[];
  expenseByCategory: SummaryCategoryItem[];
  incomeByCategory: SummaryCategoryItem[];
  monthlyTrend: MonthlyTrendItem[];
};