// apps/api/src/app.ts

import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "./config/env.js";
import {
  apiGeneralRateLimitMiddleware,
  authLoginRateLimitMiddleware,
  authRegisterRateLimitMiddleware
} from "./middlewares/rate-limit.middleware.js";
import {
  getRequestIdForRequest,
  REQUEST_ID_HEADER,
  requestIdMiddleware
} from "./middlewares/request-id.middleware.js";
import {
  getSecurityHeaders,
  requestSizeLimitMiddleware,
  securityHeadersMiddleware
} from "./middlewares/security.middleware.js";
import { apiRoutes } from "./modules/index.js";
import type { AppEnv } from "./types/app.js";
import { successResponse } from "./utils/api-response.js";
import { HttpError } from "./utils/http-error.js";

export const app = new Hono<AppEnv>();

const allowedOrigins = new Set([
  "http://127.0.0.1:3000",
  "http://localhost:3000",
  env.FRONTEND_URL,
  "https://sakuin-web.vercel.app"
]);

function getAllowedOrigin(origin: string) {
  if (!origin) {
    return env.FRONTEND_URL;
  }

  if (allowedOrigins.has(origin)) {
    return origin;
  }

  try {
    const url = new URL(origin);

    const isVercelPreviewFromAccount =
      url.protocol === "https:" &&
      url.hostname.endsWith("-risaru9s-projects.vercel.app");

    if (isVercelPreviewFromAccount) {
      return origin;
    }
  } catch {
    return env.FRONTEND_URL;
  }

  return env.FRONTEND_URL;
}

function getErrorStatus(error: unknown) {
  if (error && typeof error === "object") {
    if (
      "statusCode" in error &&
      typeof (error as { statusCode?: unknown }).statusCode === "number"
    ) {
      return (error as { statusCode: number }).statusCode;
    }

    if (
      "status" in error &&
      typeof (error as { status?: unknown }).status === "number"
    ) {
      return (error as { status: number }).status;
    }
  }

  return 500;
}

function getErrorMessage(error: unknown, status: number) {
  if (status >= 500 && env.NODE_ENV === "production") {
    return "Internal server error";
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (status >= 500) {
    return "Internal server error";
  }

  return "Terjadi kesalahan.";
}

function getErrorDetails(error: unknown, status: number) {
  if (status >= 500) {
    return null;
  }

  if (error instanceof HttpError) {
    return error.errors ?? null;
  }

  if (error && typeof error === "object" && "errors" in error) {
    return (error as { errors?: unknown }).errors ?? null;
  }

  return null;
}

function jsonError(
  message: string,
  status: number,
  errors: unknown = null,
  requestId?: string
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...getSecurityHeaders()
  };

  if (requestId) {
    headers[REQUEST_ID_HEADER] = requestId;
  }

  return new Response(
    JSON.stringify({
      success: false,
      message,
      errors
    }),
    {
      status,
      headers
    }
  );
}

app.use("*", requestIdMiddleware);

app.use("*", securityHeadersMiddleware);

app.use(
  "*",
  cors({
    origin: (origin) => getAllowedOrigin(origin),
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", REQUEST_ID_HEADER],
    credentials: true
  })
);

app.use(
  "*",
  requestSizeLimitMiddleware({
    maxBytes: 1024 * 1024
  })
);

app.use("/api/auth/login", authLoginRateLimitMiddleware);
app.use("/api/auth/register", authRegisterRateLimitMiddleware);
app.use("/api/*", apiGeneralRateLimitMiddleware);

app.get("/health", (c) => {
  return successResponse(c, "Server sehat", {
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

app.route("/api", apiRoutes);

app.notFound((c) => {
  return jsonError(
    "Route tidak ditemukan",
    404,
    null,
    getRequestIdForRequest(c.req.raw)
  );
});

app.onError((error, c) => {
  const status = getErrorStatus(error);
  const message = getErrorMessage(error, status);
  const errors = getErrorDetails(error, status);

  return jsonError(message, status, errors, getRequestIdForRequest(c.req.raw));
});

export default app;