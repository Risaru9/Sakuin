import type { Context } from "hono";
import type { AppEnv } from "../../types/app.js";
import { successResponse } from "../../utils/api-response.js";
import { HttpError } from "../../utils/http-error.js";
import { env } from "../../config/env.js";
import type { AiChatRequest } from "./ai.types.js";
import {
  getAiChatResponse,
  getAiChatHistory,
  clearAiChatHistory,
  generateWeeklyProactiveInsight
} from "./ai.service.js";

function getAuthenticatedUserId(c: Context<AppEnv>) {
  const userId = c.get("userId");

  if (!userId) {
    throw new HttpError("User belum terautentikasi", 401);
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

export async function aiChatController(c: Context<AppEnv>) {
  const userId = getAuthenticatedUserId(c);
  const input = c.get("validatedJson") as AiChatRequest;

  const response = await getAiChatResponse({
    userId,
    message: input.message,
    history: input.history ?? []
  });

  return successResponse(c, "Response Asisten Sakuin berhasil dibuat", response);
}

export async function getAiChatHistoryController(c: Context<AppEnv>) {
  const userId = getAuthenticatedUserId(c);
  const history = await getAiChatHistory(userId);

  return successResponse(c, "Riwayat chat asisten berhasil diambil", history);
}

export async function clearAiChatHistoryController(c: Context<AppEnv>) {
  const userId = getAuthenticatedUserId(c);
  await clearAiChatHistory(userId);

  return successResponse(c, "Riwayat chat asisten berhasil dibersihkan", { success: true });
}

export async function runProactiveInsightCronController(c: Context<AppEnv>) {
  assertCronAuthorized(c);

  const result = await generateWeeklyProactiveInsight();

  return successResponse(c, "Cron proactive insight asisten berhasil dijalankan", result);
}