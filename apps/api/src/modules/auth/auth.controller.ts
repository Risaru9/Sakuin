import type { Context } from "hono";
import type { AppEnv } from "../../types/app.js";
import { successResponse } from "../../utils/api-response.js";
import { HttpError } from "../../utils/http-error.js";
import {
  createSecurityHash,
  logSecurityEventFromContext
} from "../../utils/security-event-logger.js";
import type { LoginInput, RegisterInput } from "./auth.types.js";
import { getCurrentUser, loginUser, registerUser } from "./auth.service.js";

export async function registerController(c: Context<AppEnv>) {
  const input = c.get("validatedJson") as RegisterInput;

  const result = await registerUser(input);

  return successResponse(c, "Register berhasil", result, 201);
}

export async function loginController(c: Context<AppEnv>) {
  const input = c.get("validatedJson") as LoginInput;

  try {
    const result = await loginUser(input);

    return successResponse(c, "Login berhasil", result);
  } catch (error) {
    if (error instanceof HttpError && error.statusCode === 401) {
      logSecurityEventFromContext(c, "auth.login_failed", {
        status: 401,
        metadata: {
          reason: "invalid_credentials",
          identifierHash: createSecurityHash(input.email)
        }
      });
    }

    throw error;
  }
}

export async function meController(c: Context<AppEnv>) {
  const userId = c.get("userId");

  if (!userId) {
    throw new HttpError("User belum terautentikasi", 401);
  }

  const user = await getCurrentUser(userId);

  return successResponse(c, "Profile berhasil diambil", user);
}