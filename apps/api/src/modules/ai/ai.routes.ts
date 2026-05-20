import { Hono } from "hono";
import type { AppEnv } from "../../types/app.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate.middleware.js";
import { aiChatController } from "./ai.controller.js";
import { aiChatSchema } from "./ai.schema.js";

export const aiRoutes = new Hono<AppEnv>();

aiRoutes.post(
  "/chat",
  authMiddleware,
  validateRequest("json", aiChatSchema),
  aiChatController
);