import { Hono } from "hono";
import { cors } from "hono/cors";
import { apiRoutes } from "./modules/index.js";
import { successResponse } from "./utils/api-response.js";
import type { AppEnv } from "./types/app.js";

export const app = new Hono<AppEnv>();

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

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Internal server error";
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
        "Content-Type": "application/json"
      }
    }
  );
}

app.use(
  "*",
  cors({
    origin: ["http://127.0.0.1:3000", "http://localhost:3000"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true
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
  const message = getErrorMessage(error);

  return jsonError(message, status);
});