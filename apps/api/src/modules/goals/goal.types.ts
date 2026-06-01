import type { z } from "zod";
import type {
  createGoalSchema,
  goalIdParamSchema,
  updateGoalSchema
} from "./goal.schema.js";
import type {
  GoalResponse,
  GoalHistory
} from "@sakuin/shared";

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
export type GoalIdParam = z.infer<typeof goalIdParamSchema>;

export type GoalHistoryResponse = GoalHistory;
export type { GoalResponse };