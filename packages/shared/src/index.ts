export const AI_INTENTS = [
  "FINANCIAL_SUMMARY",
  "SPENDING_ANALYSIS",
  "INCOME_ANALYSIS",
  "PERIOD_COMPARISON",
  "SAVING_ADVICE",
  "GOAL_ANALYSIS",
  "TRANSACTION_DRAFT",
  "OUT_OF_SCOPE"
] as const;

export type AiIntent = (typeof AI_INTENTS)[number];

export type AiIntentConfidence = "low" | "medium" | "high";

export type AiIntentClassification = {
  intent: AiIntent;
  confidence: AiIntentConfidence;
  reason: string;
};

export type AiChatHistoryRole = "user" | "assistant";

export type AiChatHistoryMessage = {
  role: AiChatHistoryRole;
  content: string;
};

export type AiChatCard = {
  label: string;
  value: string;
};

export type AiTransactionDraft = {
  type: "INCOME" | "EXPENSE";
  amount: string;
  categoryId: string | null;
  categoryName: string | null;
  note: string | null;
  date: string;
  confidence: AiIntentConfidence;
  missingFields: string[];
  warnings: string[];
};

export type AiChatRequest = {
  message: string;
  history?: AiChatHistoryMessage[];
};

export type AiChatResponse = {
  reply: string;
  intent: AiIntent;
  cards: AiChatCard[];
  suggestions: string[];
  transactionDraft?: AiTransactionDraft;
  transactionDrafts?: AiTransactionDraft[];
};

export type AiChatServiceInput = {
  userId: string;
  message: string;
  history?: AiChatHistoryMessage[];
};

export type AiChatMessage = {
  id: string;
  role: AiChatHistoryRole;
  content: string;
  intent?: AiIntent;
  cards?: AiChatCard[];
  suggestions?: string[];
  transactionDraft?: AiTransactionDraft;
  transactionDrafts?: AiTransactionDraft[];
  createdAt: string;
};

// Category Types
export type CategoryType = "INCOME" | "EXPENSE";

export type Category = {
  id: string;
  name: string;
  type: CategoryType;
  icon: string | null;
  color: string | null;
  isDefault: boolean;
  limit: number | null;
};

export type CreateCategoryInput = {
  name: string;
  type: CategoryType;
  icon?: string | null;
  color?: string | null;
  limit?: number | null;
};

export type UpdateCategoryInput = Partial<CreateCategoryInput>;

// Goal Types
export type GoalHistory = {
  id: string;
  amount: string;
  currentAmount: string;
  createdAt: string;
};

export type Goal = {
  id: string;
  name: string;
  targetAmount: string;
  currentAmount: string;
  deadline: string | null;
  description: string | null;
  history?: GoalHistory[];
  createdAt: string;
  updatedAt: string;
};

export type CreateGoalInput = {
  name: string;
  targetAmount: string;
  currentAmount?: string;
  deadline?: string | null;
  description?: string;
};

export type UpdateGoalInput = {
  name?: string;
  targetAmount?: string;
  currentAmount?: string;
  deadline?: string | null;
  description?: string;
};

export type GoalResponse = {
  id: string;
  name: string;
  targetAmount: string;
  currentAmount: string;
  progressPercentage: number;
  remainingAmount: string;
  isCompleted: boolean;
  deadline: string | null;
  isOverdue: boolean;
  history?: GoalHistory[];
  createdAt: string;
  updatedAt: string;
};

// Transaction Types
export type TransactionCategory = {
  id: string;
  name: string;
  type: CategoryType;
  icon: string | null;
  color: string | null;
  isDefault?: boolean;
};

export type Transaction = {
  id: string;
  type: CategoryType;
  amount: string;
  note: string | null;
  date: string;
  categoryId: string;
  category: TransactionCategory;
  createdAt: string;
  updatedAt: string;
};

export type TransactionPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type TransactionListResponse = {
  items: Transaction[];
  pagination?: TransactionPagination;
  meta?: TransactionPagination;
};

export type CreateTransactionInput = {
  type: CategoryType;
  amount: string;
  categoryId: string;
  date: string;
  note?: string;
};

export type CreateTransactionsBulkInput = {
  transactions: CreateTransactionInput[];
};

export type UpdateTransactionInput = Partial<CreateTransactionInput>;

export type TransactionResponse = {
  id: string;
  type: CategoryType;
  amount: string;
  note: string | null;
  date: string;
  category: {
    id: string;
    name: string;
    type: CategoryType;
    icon: string | null;
    color: string | null;
    isDefault: boolean;
  };
  createdAt: string;
  updatedAt: string;
};

// Summary Types
export type SummaryAmount = string;

export type RecentTransaction = {
  id: string;
  type: CategoryType;
  amount: SummaryAmount;
  note: string | null;
  date: string;
  category: {
    id: string;
    name: string;
    type: CategoryType;
    icon: string | null;
    color: string | null;
    isDefault?: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
};

export type CategorySummaryItem = {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  type: CategoryType;
  totalAmount: SummaryAmount;
  transactionCount: number;
  limit: string | null;
};

export type MonthlyTrendItem = {
  month: string;
  income: SummaryAmount;
  expense: SummaryAmount;
  balance: SummaryAmount;
};

export type SafeToSpendStatus = "SAFE" | "WATCH" | "HOLD" | "UNKNOWN";

export type SpendingPaceStatus = "ON_TRACK" | "WATCH" | "FAST" | "UNKNOWN";

export type SafeToSpendResult = {
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

export type FinancialCheckupResult = {
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

export type HabitCompletionStatus =
  | "NOT_STARTED"
  | "STARTED"
  | "REVIEW_READY"
  | "STRONG_DAY";

export type HabitRecommendedAction =
  | "ADD_TRANSACTION"
  | "REVIEW_TODAY"
  | "ASK_ASSISTANT"
  | "CONTINUE_TRACKING";

export type HabitMessageTone = "NEUTRAL" | "NUDGE" | "GOOD" | "READY";

export type HabitMessageDetail = {
  title: string;
  description: string;
  tone: HabitMessageTone;
};

export type HabitExpenseTrend = "UP" | "DOWN" | "STABLE" | "NO_DATA";

export type HabitDayRhythmItem = {
  date: string;
  day: "Sen" | "Sel" | "Rab" | "Kam" | "Jum" | "Sab" | "Min";
  hasTransaction: boolean;
  transactionCount: number;
  income: string;
  expense: string;
  isToday: boolean;
  isFuture: boolean;
};

export type HabitSummaryResult = {
  currentMonthTransactionDays: number;
  currentMonthDaysElapsed: number;
  currentMonthCompletenessPercent: number;
  monthActiveDays: number;
  weeklyActiveDays: number;
  currentWeekActiveDays: number;
  currentWeekExpense: string;
  previousWeekExpense: string;
  currentWeekExpenseTrend: HabitExpenseTrend;
  currentWeekTopExpenseCategory: {
    name: string;
    amount: string;
    transactionCount: number;
  } | null;
  dayRhythm: HabitDayRhythmItem[];
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
  completionStatus: HabitCompletionStatus;
  recommendedAction: HabitRecommendedAction;
  habitStatus: "NO_DATA" | "LIGHT" | "ACTIVE" | "STALE";
  habitMessage: string;
  habitMessageDetail: HabitMessageDetail;
};

export type SummaryResponse = {
  totalIncome: SummaryAmount;
  totalExpense: SummaryAmount;
  balance: SummaryAmount;
  safeBalanceLimit: SummaryAmount;
  isBelowSafeLimit: boolean;
  safeToSpend: SafeToSpendResult;
  financialCheckup: FinancialCheckupResult;
  habit: HabitSummaryResult | null;

  incomeThisMonth: SummaryAmount;
  expenseThisMonth: SummaryAmount;
  balanceThisMonth: SummaryAmount;

  transactionCount: number;
  recentTransactions: RecentTransaction[];

  expenseByCategory: CategorySummaryItem[];
  incomeByCategory: CategorySummaryItem[];
  monthlyTrend: MonthlyTrendItem[];
  recurringStatus?: {
    generatedCount: number;
    processedRuleCount: number;
  };
};
