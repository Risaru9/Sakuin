import { Hono } from "hono";
import type { AppEnv } from "../../types/app.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate.middleware.js";
import {
  completeDailyReviewSchema,
  deletePushSubscriptionSchema,
  savePushSubscriptionSchema,
  updateReminderSettingsSchema
} from "./reminder.schema.js";
import {
  completeDailyReviewController,
  deletePushSubscriptionController,
  getReminderSettingsController,
  getVapidPublicKeyController,
  runReminderCronController,
  savePushSubscriptionController,
  updateReminderSettingsController
} from "./reminder.controller.js";

export const reminderRoutes = new Hono<AppEnv>();

reminderRoutes.get("/vapid-public-key", getVapidPublicKeyController);
reminderRoutes.get("/run", runReminderCronController);

reminderRoutes.get("/settings", authMiddleware, getReminderSettingsController);

reminderRoutes.put(
  "/settings",
  authMiddleware,
  validateRequest("json", updateReminderSettingsSchema),
  updateReminderSettingsController
);

reminderRoutes.post(
  "/subscriptions",
  authMiddleware,
  validateRequest("json", savePushSubscriptionSchema),
  savePushSubscriptionController
);

reminderRoutes.delete(
  "/subscriptions",
  authMiddleware,
  validateRequest("json", deletePushSubscriptionSchema),
  deletePushSubscriptionController
);

reminderRoutes.post(
  "/daily-review",
  authMiddleware,
  validateRequest("json", completeDailyReviewSchema),
  completeDailyReviewController
);
