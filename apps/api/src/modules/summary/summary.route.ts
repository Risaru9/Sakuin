import { Hono } from "hono";
import type { AppEnv } from "../../types/app.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { getSummaryController } from "./summary.controller.js";

export const summaryRoutes = new Hono<AppEnv>();

summaryRoutes.get("/", authMiddleware, getSummaryController);