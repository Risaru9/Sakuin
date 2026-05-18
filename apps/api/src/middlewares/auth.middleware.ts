import type { JwtPayload } from "jsonwebtoken";
import jwt from "jsonwebtoken";
import type { Context, MiddlewareHandler } from "hono";
import type { AppEnv } from "../types/app.js";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http-error.js";
import { logSecurityEventFromContext } from "../utils/security-event-logger.js";

type AccessTokenPayload = JwtPayload & {
  userId?: string;
};

function logAuthFailure(c: Context<AppEnv>, reason: string) {
  logSecurityEventFromContext(c, "auth.auth_failed", {
    status: 401,
    metadata: {
      reason
    }
  });
}

export const authMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const authorization = c.req.header("Authorization");

  if (!authorization) {
    logAuthFailure(c, "missing_authorization_header");
    throw new HttpError("Authorization header wajib diisi", 401);
  }

  if (!authorization.startsWith("Bearer ")) {
    logAuthFailure(c, "invalid_authorization_format");
    throw new HttpError("Format token harus Bearer token", 401);
  }

  const token = authorization.split(" ")[1];

  if (!token) {
    logAuthFailure(c, "missing_bearer_token");
    throw new HttpError("Token tidak ditemukan", 401);
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;

    if (!decoded.userId || typeof decoded.userId !== "string") {
      logAuthFailure(c, "invalid_token_payload");
      throw new HttpError("Payload token tidak valid", 401);
    }

    c.set("userId", decoded.userId);

    await next();
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    logAuthFailure(c, "invalid_or_expired_token");
    throw new HttpError("Token tidak valid atau sudah kedaluwarsa", 401);
  }
};