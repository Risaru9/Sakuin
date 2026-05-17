import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "./config/env.js";
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

function jsonError(message: string, status: number, errors: unknown = null) {
  return new Response(
    JSON.stringify({
      success: false,
      message,
      errors
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        ...getSecurityHeaders()
      }
    }
  );
}

app.use("*", securityHeadersMiddleware);

app.use(
  "*",
  cors({
    origin: (origin) => getAllowedOrigin(origin),
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
);

app.use(
  "*",
  requestSizeLimitMiddleware({
    maxBytes: 1024 * 1024
  })
);

app.get("/health", (c) => {
  return successResponse(c, "Server sehat", {
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

app.route("/api", apiRoutes);

app.notFound(() => {
  return jsonError("Route tidak ditemukan", 404);
});

app.onError((error) => {
  const status = getErrorStatus(error);
  const message = getErrorMessage(error, status);
  const errors = getErrorDetails(error, status);

  return jsonError(message, status, errors);
});

export default app;