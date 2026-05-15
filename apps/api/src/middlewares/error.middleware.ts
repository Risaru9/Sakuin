import { Prisma } from "@prisma/client";
import type { Context } from "hono";
import { ZodError } from "zod";
import type { AppEnv } from "../types/app.js";
import { errorResponse } from "../utils/api-response.js";
import { HttpError } from "../utils/http-error.js";
import { env } from "../config/env.js";

export function errorHandler(error: Error, c: Context<AppEnv>) {
  if (error instanceof HttpError) {
    return errorResponse(
      c,
      error.message,
      error.errors ?? null,
      error.statusCode
    );
  }

  if (error instanceof ZodError) {
    return errorResponse(
      c,
      "Validasi request gagal",
      error.flatten(),
      400
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return errorResponse(
      c,
      "Terjadi kesalahan pada database",
      {
        code: error.code,
        meta: error.meta
      },
      400
    );
  }

  console.error(error);

  return errorResponse(
    c,
    "Terjadi kesalahan pada server",
    env.NODE_ENV === "development"
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      : null,
    500
  );
}

export function notFoundHandler(c: Context<AppEnv>) {
  const url = new URL(c.req.url);

  return errorResponse(
    c,
    `Route ${c.req.method} ${url.pathname} tidak ditemukan`,
    null,
    404
  );
}