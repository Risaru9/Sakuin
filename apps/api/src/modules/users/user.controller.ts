import type { Context } from "hono";
import type { AppEnv } from "../../types/app.js";
import { successResponse } from "../../utils/api-response.js";
import { HttpError } from "../../utils/http-error.js";
import type { UpdateUserProfileInput } from "./user.types.js";
import { getUserProfile, updateUserProfile } from "./user.service.js";

function getAuthenticatedUserId(c: Context<AppEnv>) {
  const userId = c.get("userId");

  if (!userId) {
    throw new HttpError("User belum terautentikasi", 401);
  }

  return userId;
}

export async function getUserProfileController(c: Context<AppEnv>) {
  const userId = getAuthenticatedUserId(c);

  const profile = await getUserProfile(userId);

  return successResponse(c, "Profile berhasil diambil", profile);
}

export async function updateUserProfileController(c: Context<AppEnv>) {
  const userId = getAuthenticatedUserId(c);
  const input = c.get("validatedJson") as UpdateUserProfileInput;

  const profile = await updateUserProfile(userId, input);

  return successResponse(c, "Profile berhasil diupdate", profile);
}