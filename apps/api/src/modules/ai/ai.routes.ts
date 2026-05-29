import { Hono } from "hono";
import type { AppEnv } from "../../types/app.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate.middleware.js";
import {
  aiChatController,
  getAiChatHistoryController,
  clearAiChatHistoryController,
  runProactiveInsightCronController
} from "./ai.controller.js";
import { aiChatSchema } from "./ai.schema.js";

export const aiRoutes = new Hono<AppEnv>();

aiRoutes.post(
  "/chat",
  authMiddleware,
  validateRequest("json", aiChatSchema),
  aiChatController
);

aiRoutes.get(
  "/chat",
  authMiddleware,
  getAiChatHistoryController
);

aiRoutes.delete(
  "/chat",
  authMiddleware,
  clearAiChatHistoryController
);

aiRoutes.get(
  "/proactive-insight",
  runProactiveInsightCronController
);