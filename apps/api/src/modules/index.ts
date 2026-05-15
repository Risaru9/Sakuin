import { Hono } from "hono";
import type { AppEnv } from "../types/app.js";
import { successResponse } from "../utils/api-response.js";
import { authRoutes } from "./auth/auth.route.js";
import { transactionRoutes } from "./transactions/transaction.route.js";
import { summaryRoutes } from "./summary/summary.route.js";
import { goalRoutes } from "./goals/goal.route.js";
import { userRoutes } from "./users/user.route.js";
import { exportRoutes } from "./export/export.route.js";
import { categoryRoutes } from "./categories/category.route.js";

export const apiRoutes = new Hono<AppEnv>();

apiRoutes.get("/", (c) => {
  return successResponse(c, "Sakuin API routes aktif", {
    basePath: "/api",
    status: "ok"
  });
});

apiRoutes.get("/health", (c) => {
  return successResponse(c, "API sehat", {
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

apiRoutes.route("/auth", authRoutes);
apiRoutes.route("/transactions", transactionRoutes);
apiRoutes.route("/summary", summaryRoutes);
apiRoutes.route("/goals", goalRoutes);
apiRoutes.route("/users", userRoutes);
apiRoutes.route("/export", exportRoutes);
apiRoutes.route("/categories", categoryRoutes);