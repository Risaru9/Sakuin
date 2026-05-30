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
import { aiRoutes } from "./ai/ai.routes.js";
import { reminderRoutes } from "./reminders/reminder.route.js";
import { recurringRoutes } from "./recurring/recurring.route.js";

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

apiRoutes.get("/app-version", (c) => {
  return successResponse(c, "Metadata versi aplikasi Android Sakuin", {
    latestVersionName: "1.2",
    latestVersionCode: 3,
    apkDownloadUrl: "https://sakuin-web.vercel.app/downloads/sakuin.apk",
    releaseNotes: [
      "Pembaruan sistem update APK otomatis langsung dari dalam aplikasi.",
      "Perbaikan performa widget home-screen.",
      "Pembersihan dashboard dari tombol unduh yang mengganggu."
    ],
    forceUpdate: false,
    publishedAt: "2026-05-30T15:00:00Z"
  });
});

apiRoutes.route("/auth", authRoutes);
apiRoutes.route("/transactions", transactionRoutes);
apiRoutes.route("/summary", summaryRoutes);
apiRoutes.route("/goals", goalRoutes);
apiRoutes.route("/users", userRoutes);
apiRoutes.route("/export", exportRoutes);
apiRoutes.route("/categories", categoryRoutes);
apiRoutes.route("/ai", aiRoutes);
apiRoutes.route("/reminders", reminderRoutes);
apiRoutes.route("/recurring", recurringRoutes);
