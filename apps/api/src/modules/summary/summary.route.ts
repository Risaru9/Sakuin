import { Hono } from "hono";
import type { AppEnv } from "../../types/app.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate.middleware.js";
import { getSummaryController } from "./summary.controller.js";
import { getSummaryQuerySchema } from "./summary.schema.js";

export const summaryRoutes = new Hono<AppEnv>();

summaryRoutes.get(
  "/",
  authMiddleware,
  validateRequest("query", getSummaryQuerySchema),
  getSummaryController
);
