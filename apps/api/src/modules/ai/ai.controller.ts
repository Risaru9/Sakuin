import type { Context } from "hono";
import type { AppEnv } from "../../types/app.js";
import { successResponse } from "../../utils/api-response.js";
import { HttpError } from "../../utils/http-error.js";
import type { AiChatRequest } from "./ai.types.js";
import { getAiChatResponse } from "./ai.service.js";

function getAuthenticatedUserId(c: Context<AppEnv>) {
  const userId = c.get("userId");

  if (!userId) {
    throw new HttpError("User belum terautentikasi", 401);
  }

  return userId;
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