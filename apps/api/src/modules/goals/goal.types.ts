import type { z } from "zod";
import type {
  createGoalSchema,
  goalIdParamSchema,
  updateGoalSchema
} from "./goal.schema.js";

export type CreateGoalInput = z.infer<typeof createGoalSchema>;

export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;

export type GoalIdParam = z.infer<typeof goalIdParamSchema>;

export type GoalHistoryResponse = {
  id: string;
  amount: string;
  currentAmount: string;
  createdAt: string;
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
  history?: GoalHistoryResponse[];
  createdAt: string;
  updatedAt: string;
};