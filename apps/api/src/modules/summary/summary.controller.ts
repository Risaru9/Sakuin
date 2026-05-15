import type { Context } from "hono";
import type { AppEnv } from "../../types/app.js";
import { successResponse } from "../../utils/api-response.js";
import { HttpError } from "../../utils/http-error.js";
import { getSummary } from "./summary.service.js";

function getAuthenticatedUserId(c: Context<AppEnv>) {
  const userId = c.get("userId");

  if (!userId) {
    throw new HttpError("User belum terautentikasi", 401);
  }

  return userId;
}

export async function getSummaryController(c: Context<AppEnv>) {
  const userId = getAuthenticatedUserId(c);

  const summary = await getSummary(userId);

  return successResponse(c, "Summary berhasil diambil", summary);
}