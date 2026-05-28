export type RecurringFrequency = "WEEKLY" | "MONTHLY";
export type TransactionType = "INCOME" | "EXPENSE";

export type RecurringRule = {
  id: string;
  categoryId: string;
  type: TransactionType;
  amount: string;
  note: string | null;
  frequency: RecurringFrequency;
  interval: number;
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  startDate: string;
  endDate: string | null;
  nextRunAt: string;
  autoPost: boolean;
  isActive: boolean;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
  category: {
    id: string;
    name: string;
    type: TransactionType;
    icon: string | null;
    color: string | null;
  };
};

export type CreateRecurringRuleInput = {
  categoryId: string;
  type: TransactionType;
  amount: string;
  note?: string | null;
  frequency: RecurringFrequency;
  interval?: number;
  dayOfMonth?: number | null;
  dayOfWeek?: number | null;
  startDate: string;
  endDate?: string | null;
  autoPost?: boolean;
  isActive?: boolean;
};
