import { Hono } from "hono";
import type { AppEnv } from "../../types/app.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate.middleware.js";
import {
  createRecurringRuleSchema,
  recurringRuleIdParamSchema,
  updateRecurringRuleSchema
} from "./recurring.schema.js";
import {
  createRecurringRuleController,
  deleteRecurringRuleController,
  getRecurringRulesController,
  runDueRecurringRulesController,
  updateRecurringRuleController
} from "./recurring.controller.js";

export const recurringRoutes = new Hono<AppEnv>();

recurringRoutes.post(
  "/",
  authMiddleware,
  validateRequest("json", createRecurringRuleSchema),
  createRecurringRuleController
);

recurringRoutes.get("/", authMiddleware, getRecurringRulesController);

recurringRoutes.put(
  "/:id",
  authMiddleware,
  validateRequest("param", recurringRuleIdParamSchema),
  validateRequest("json", updateRecurringRuleSchema),
  updateRecurringRuleController
);

recurringRoutes.delete(
  "/:id",
  authMiddleware,
  validateRequest("param", recurringRuleIdParamSchema),
  deleteRecurringRuleController
);

recurringRoutes.post("/run-due", authMiddleware, runDueRecurringRulesController);
