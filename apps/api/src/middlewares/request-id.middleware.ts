import { randomUUID } from "node:crypto";
import type { MiddlewareHandler } from "hono";
import { env } from "../config/env.js";
import type { AppEnv } from "../types/app.js";

export const REQUEST_ID_HEADER = "X-Request-Id";

const SAFE_REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

const requestIdStore = new WeakMap<object, string>();

function normalizeRequestId(value: string | null | undefined) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return null;
  }

  if (!SAFE_REQUEST_ID_PATTERN.test(trimmedValue)) {
    return null;
  }

  return trimmedValue;
}

function createRequestId() {
  return randomUUID();
}

export function getRequestIdForRequest(
  request: object,
  incomingRequestId?: string | null
) {
  const existingRequestId = requestIdStore.get(request);

  if (existingRequestId) {
    return existingRequestId;
  }

  const requestId = normalizeRequestId(incomingRequestId) ?? createRequestId();

  requestIdStore.set(request, requestId);

  return requestId;
}

function getRequestPath(requestUrl: string) {
  try {
    return new URL(requestUrl).pathname;
  } catch {
    return "unknown-path";
  }
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

function getResponseStatus(response: unknown) {
  if (
    response &&
    typeof response === "object" &&
    "status" in response &&
    typeof (response as { status?: unknown }).status === "number"
  ) {
    return (response as { status: number }).status;
  }

  return 200;
}

function shouldLogRequest() {
  return env.NODE_ENV !== "test";
}

function writeSafeRequestLog({
  requestId,
  method,
  path,
  status,
  durationMs
}: {
  requestId: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
}) {
  if (!shouldLogRequest()) {
    return;
  }

  console.info(
    JSON.stringify({
      level: "info",
      event: "http_request",
      requestId,
      method,
      path,
      status,
      durationMs,
      timestamp: new Date().toISOString()
    })
  );
}

export const requestIdMiddleware: MiddlewareHandler<AppEnv> = async (
  c,
  next
) => {
  const requestId = getRequestIdForRequest(
    c.req.raw,
    c.req.header(REQUEST_ID_HEADER)
  );
  const startedAt = Date.now();

  c.header(REQUEST_ID_HEADER, requestId);

  try {
    await next();

    const durationMs = Date.now() - startedAt;

    c.header(REQUEST_ID_HEADER, requestId);

    writeSafeRequestLog({
      requestId,
      method: c.req.method,
      path: getRequestPath(c.req.url),
      status: getResponseStatus(c.res),
      durationMs
    });
  } catch (error) {
    const durationMs = Date.now() - startedAt;

    c.header(REQUEST_ID_HEADER, requestId);

    writeSafeRequestLog({
      requestId,
      method: c.req.method,
      path: getRequestPath(c.req.url),
      status: getErrorStatus(error),
      durationMs
    });

    throw error;
  }
};