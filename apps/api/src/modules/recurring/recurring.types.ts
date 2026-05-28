export type RecurringFrequency = "WEEKLY" | "MONTHLY";

export type RecurringRuleResponse = {
  id: string;
  categoryId: string;
  type: "INCOME" | "EXPENSE";
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
    type: "INCOME" | "EXPENSE";
    icon: string | null;
    color: string | null;
  };
};

export type CreateRecurringRuleInput = {
  categoryId: string;
  type: "INCOME" | "EXPENSE";
  amount: string;
  note?: string | null;
  frequency: RecurringFrequency;
  interval?: number;
  dayOfMonth?: number | null;
  dayOfWeek?: number | null;
  startDate: Date;
  endDate?: Date | null;
  autoPost?: boolean;
  isActive?: boolean;
};

export type UpdateRecurringRuleInput = Partial<CreateRecurringRuleInput>;

export type RecurringRuleIdParam = {
  id: string;
};

export type RunDueRecurringResult = {
  generatedCount: number;
  skippedCount: number;
  processedRuleCount: number;
};
