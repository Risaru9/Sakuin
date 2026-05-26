import type { Context } from "hono";
import type { AppEnv } from "../../types/app.js";
import { successResponse } from "../../utils/api-response.js";
import { HttpError } from "../../utils/http-error.js";
import { env } from "../../config/env.js";
import type {
  CompleteDailyReviewInput,
  DeletePushSubscriptionInput,
  SavePushSubscriptionInput,
  UpdateReminderSettingsInput
} from "./reminder.types.js";
import {
  completeDailyReview,
  deletePushSubscription,
  getReminderSettings,
  getVapidPublicKey,
  runReminderCron,
  savePushSubscription,
  updateReminderSettings
} from "./reminder.service.js";

function getUserId(c: Context<AppEnv>) {
  const userId = c.get("userId");

  if (!userId) {
    throw new HttpError("User tidak terautentikasi", 401);
  }

  return userId;
}

function assertCronAuthorized(c: Context<AppEnv>) {
  if (!env.CRON_SECRET) {
    throw new HttpError("CRON_SECRET belum dikonfigurasi", 503);
  }

  const authorization = c.req.header("Authorization");

  if (authorization !== `Bearer ${env.CRON_SECRET}`) {
    throw new HttpError("Cron tidak terotorisasi", 401);
  }
}

export function getVapidPublicKeyController(c: Context<AppEnv>) {
  return successResponse(
    c,
    "VAPID public key berhasil diambil",
    getVapidPublicKey()
  );
}

export async function getReminderSettingsController(c: Context<AppEnv>) {
  const settings = await getReminderSettings(getUserId(c));

  return successResponse(c, "Pengaturan reminder berhasil diambil", settings);
}

export async function updateReminderSettingsController(c: Context<AppEnv>) {
  const input = c.get("validatedJson") as UpdateReminderSettingsInput;
  const settings = await updateReminderSettings(getUserId(c), input);

  return successResponse(c, "Pengaturan reminder berhasil disimpan", settings);
}

export async function savePushSubscriptionController(c: Context<AppEnv>) {
  const input = c.get("validatedJson") as SavePushSubscriptionInput;
  const settings = await savePushSubscription(getUserId(c), input);

  return successResponse(c, "Subscription reminder berhasil disimpan", settings);
}

export async function deletePushSubscriptionController(c: Context<AppEnv>) {
  const input = c.get("validatedJson") as DeletePushSubscriptionInput;
  const settings = await deletePushSubscription(getUserId(c), input);

  return successResponse(c, "Subscription reminder berhasil dimatikan", settings);
}

export async function completeDailyReviewController(c: Context<AppEnv>) {
  const input = c.get("validatedJson") as CompleteDailyReviewInput;
  const settings = await completeDailyReview(getUserId(c), input);

  return successResponse(c, "Review harian berhasil ditandai selesai", settings);
}

export async function runReminderCronController(c: Context<AppEnv>) {
  assertCronAuthorized(c);

  const result = await runReminderCron();

  return successResponse(c, "Reminder cron berhasil dijalankan", result);
}
