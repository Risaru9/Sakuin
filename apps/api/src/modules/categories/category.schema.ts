import { z } from "zod";

export const getCategoriesQuerySchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]).optional()
});