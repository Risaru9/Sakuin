import { Hono } from "hono";
import type { AppEnv } from "../../types/app.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate.middleware.js";
import { getGlanceController, getSummaryController } from "./summary.controller.js";
import { getGlanceQuerySchema, getSummaryQuerySchema } from "./summary.schema.js";

export const summaryRoutes = new Hono<AppEnv>();

summaryRoutes.get(
  "/",
  authMiddleware,
  validateRequest("query", getSummaryQuerySchema),
  getSummaryController
);

summaryRoutes.get(
  "/glance",
  authMiddleware,
  validateRequest("query", getGlanceQuerySchema),
  getGlanceController
);
