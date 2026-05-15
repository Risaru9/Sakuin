import { Hono } from "hono";
import type { AppEnv } from "../../types/app.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate.middleware.js";
import { exportTransactionsController } from "./export.controller.js";
import { exportTransactionsQuerySchema } from "./export.schema.js";

export const exportRoutes = new Hono<AppEnv>();

exportRoutes.get(
  "/transactions",
  authMiddleware,
  validateRequest("query", exportTransactionsQuerySchema),
  exportTransactionsController
);