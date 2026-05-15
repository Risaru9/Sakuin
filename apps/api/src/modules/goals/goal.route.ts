import { Hono } from "hono";
import type { AppEnv } from "../../types/app.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate.middleware.js";
import {
  createGoalSchema,
  goalIdParamSchema,
  updateGoalSchema
} from "./goal.schema.js";
import {
  createGoalController,
  deleteGoalController,
  getGoalDetailController,
  getGoalsController,
  updateGoalController
} from "./goal.controller.js";

export const goalRoutes = new Hono<AppEnv>();

goalRoutes.post(
  "/",
  authMiddleware,
  validateRequest("json", createGoalSchema),
  createGoalController
);

goalRoutes.get("/", authMiddleware, getGoalsController);

goalRoutes.get(
  "/:id",
  authMiddleware,
  validateRequest("param", goalIdParamSchema),
  getGoalDetailController
);

goalRoutes.put(
  "/:id",
  authMiddleware,
  validateRequest("param", goalIdParamSchema),
  validateRequest("json", updateGoalSchema),
  updateGoalController
);

goalRoutes.delete(
  "/:id",
  authMiddleware,
  validateRequest("param", goalIdParamSchema),
  deleteGoalController
);