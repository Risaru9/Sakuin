import { createHash } from "node:crypto";
import type { Context } from "hono";
import { env } from "../config/env.js";
import {
  getRequestIdForRequest,
  REQUEST_ID_HEADER
} from "../middlewares/request-id.middleware.js";
import type { AppEnv } from "../types/app.js";

export type SecurityEventType =
  | "auth.login_failed"
  | "auth.auth_failed"
  | "rate_limit.hit";

type SecurityEventMetadataValue = string | number | boolean | null;

type SecurityEventMetadata = Record<
  string,
  SecurityEventMetadataValue | undefined
>;

type SecurityEventInput = {
  eventType: SecurityEventType;
  requestId: string;
  method: string;
  path: string;
  status: number;
  userId?: string;
  metadata?: SecurityEventMetadata;
};

const REDACTED_VALUE = "[REDACTED]";

const SENSITIVE_METADATA_KEY_PATTERN =
  /password|token|authorization|secret|cookie|body|raw|email|credential|session/i;

export function createSecurityHash(value: string) {
  return createHash("sha256")
    .update(value.trim().toLowerCase())
    .digest("hex");
}

function getRequestPath(requestUrl: string) {
  try {
    return new URL(requestUrl).pathname;
  } catch {
    return "unknown-path";
  }
}

function sanitizeMetadata(metadata: SecurityEventMetadata = {}) {
  const safeMetadata: Record<string, SecurityEventMetadataValue> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined) {
      continue;
    }

    if (SENSITIVE_METADATA_KEY_PATTERN.test(key)) {
      safeMetadata[key] = REDACTED_VALUE;
      continue;
    }

    safeMetadata[key] = value;
  }

  return safeMetadata;
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
    userId: input.userId,
    metadata: sanitizeMetadata(input.metadata),
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
    metadata?: SecurityEventMetadata;
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