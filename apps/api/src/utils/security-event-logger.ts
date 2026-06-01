import type { Context } from "hono";
import { env } from "../config/env.js";
import {
  getRequestIdForRequest,
  REQUEST_ID_HEADER
} from "../middlewares/request-id.middleware.js";
import type { AppEnv } from "../types/app.js";
import {
  createSecurityHash,
  sanitizeSafeMetadata,
  type SafeMetadata
} from "./safe-metadata.js";

export { createSecurityHash };

export type SecurityEventType =
  | "auth.login_failed"
  | "auth.auth_failed"
  | "rate_limit.hit";

type SecurityEventInput = {
  eventType: SecurityEventType;
  requestId: string;
  method: string;
  path: string;
  status: number;
  userId?: string;
  metadata?: SafeMetadata;
};

function getRequestPath(requestUrl: string) {
  try {
    return new URL(requestUrl).pathname;
  } catch {
    return "unknown-path";
  }
}

export function createSafeSecurityEventLog(input: SecurityEventInput) {
  return {
    level: "warn",
    event: "security_event",
    eventType: input.eventType,
    requestId: input.requestId,
    method: input.method,
    path: input.path,
    status: input.status,
    userHash: input.userId ? createSecurityHash(input.userId) : undefined,
    metadata: sanitizeSafeMetadata(input.metadata),
    timestamp: new Date().toISOString()
  };
}

function shouldLogSecurityEvent() {
  return env.NODE_ENV !== "test";
}

export function logSecurityEvent(input: SecurityEventInput) {
  if (!shouldLogSecurityEvent()) {
    return;
  }

  console.warn(JSON.stringify(createSafeSecurityEventLog(input)));
}

export function logSecurityEventFromContext(
  c: Context<AppEnv>,
  eventType: SecurityEventType,
  options: {
    status: number;
    userId?: string;
    metadata?: SafeMetadata;
  }
) {
  logSecurityEvent({
    eventType,
    requestId: getRequestIdForRequest(
      c.req.raw,
      c.req.header(REQUEST_ID_HEADER)
    ),
    method: c.req.method,
    path: getRequestPath(c.req.url),
    status: options.status,
    userId: options.userId,
    metadata: options.metadata
  });
}
