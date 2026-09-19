import type { Context } from "hono";
import type { AppEnv } from "../../types/app.js";
import { successResponse } from "../../utils/api-response.js";
import { HttpError } from "../../utils/http-error.js";
import { DEFAULT_TZ_OFFSET_MINUTES, localDateKey } from "./glance-copy.js";
import { getGlance } from "./glance.service.js";
import { getSummary } from "./summary.service.js";
import type { GetGlanceQuery, GetSummaryQuery } from "./summary.types.js";

function getAuthenticatedUserId(c: Context<AppEnv>) {
  const userId = c.get("userId");

  if (!userId) {
    throw new HttpError("User belum terautentikasi", 401);
  }

  return userId;
}

export async function getSummaryController(c: Context<AppEnv>) {
  const userId = getAuthenticatedUserId(c);
  const query = c.get("validatedQuery") as GetSummaryQuery;

  const summary = await getSummary(userId, query);

  return successResponse(c, "Summary berhasil diambil", summary);
}

/** Small numbers for the Android widget and the weekly summary notification. */
export async function getGlanceController(c: Context<AppEnv>) {
  const userId = getAuthenticatedUserId(c);
  const query = c.get("validatedQuery") as GetGlanceQuery;
  const tzOffsetMinutes = query.tz ?? DEFAULT_TZ_OFFSET_MINUTES;
  const glance = await getGlance(userId, {
    date: query.date ?? localDateKey(new Date(), tzOffsetMinutes),
    tzOffsetMinutes
  });

  return successResponse(c, "Ringkasan singkat berhasil diambil", glance);
}
