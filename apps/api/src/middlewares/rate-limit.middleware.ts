import type { Context, MiddlewareHandler } from "hono";
import { env } from "../config/env.js";
import type { AppEnv } from "../types/app.js";
import { logSecurityEventFromContext } from "../utils/security-event-logger.js";

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

type RateLimitKeyGenerator = (
  c: Context<AppEnv>
) => string | Promise<string>;

type RateLimitOptions = {
  keyPrefix: string;
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: RateLimitKeyGenerator;
};

type CloneableJsonRequest = {
  clone: () => {
    json: () => Promise<unknown>;
  };
};

const rateLimitStore = new Map<string, RateLimitRecord>();

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

export const AUTH_LOGIN_RATE_LIMIT_MAX = env.NODE_ENV === "test" ? 8 : 10;
export const AUTH_REGISTER_RATE_LIMIT_MAX = env.NODE_ENV === "test" ? 100 : 20;
export const API_GENERAL_RATE_LIMIT_MAX = env.NODE_ENV === "test" ? 1000 : 300;

function getCurrentTime() {
  return Date.now();
}

function cleanupExpiredRecords(now: number) {
  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

function normalizeHeaderValue(value: string | undefined) {
  return value?.split(",")[0]?.trim() || "";
}

function getClientIp(c: Context<AppEnv>) {
  const forwardedFor = normalizeHeaderValue(c.req.header("x-forwarded-for"));
  const realIp = normalizeHeaderValue(c.req.header("x-real-ip"));
  const cfConnectingIp = normalizeHeaderValue(
    c.req.header("cf-connecting-ip")
  );

  return cfConnectingIp || forwardedFor || realIp || "unknown-ip";
}

function getRequestPath(c: Context<AppEnv>) {
  try {
    return new URL(c.req.url).pathname;
  } catch {
    return c.req.path;
  }
}

function canCloneRequest(rawRequest: unknown): rawRequest is CloneableJsonRequest {
  return (
    typeof rawRequest === "object" &&
    rawRequest !== null &&
    "clone" in rawRequest &&
    typeof (rawRequest as { clone?: unknown }).clone === "function"
  );
}

async function getEmailFromJsonBody(c: Context<AppEnv>) {
  const contentType = c.req.header("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return "no-email";
  }

  const rawRequest = c.req.raw as unknown;

  if (!canCloneRequest(rawRequest)) {
    return "no-email";
  }

  try {
    const body = (await rawRequest.clone().json()) as {
      email?: unknown;
    };

    if (typeof body.email !== "string") {
      return "no-email";
    }

    const normalizedEmail = body.email.trim().toLowerCase();

    return normalizedEmail || "no-email";
  } catch {
    return "invalid-json";
  }
}

function setRateLimitHeaders({
  c,
  limit,
  remaining,
  resetAt
}: {
  c: Context<AppEnv>;
  limit: number;
  remaining: number;
  resetAt: number;
}) {
  c.header("RateLimit-Limit", String(limit));
  c.header("RateLimit-Remaining", String(Math.max(remaining, 0)));
  c.header("RateLimit-Reset", String(Math.ceil(resetAt / 1000)));
}

function getRetryAfterSeconds(resetAt: number, now: number) {
  return Math.max(1, Math.ceil((resetAt - now) / 1000));
}

export function resetRateLimitStore() {
  rateLimitStore.clear();
}

export function createRateLimitMiddleware(
  options: RateLimitOptions
): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const now = getCurrentTime();

    cleanupExpiredRecords(now);

    const generatedKey = options.keyGenerator
      ? await options.keyGenerator(c)
      : `${getClientIp(c)}:${getRequestPath(c)}`;

    const key = `${options.keyPrefix}:${generatedKey}`;
    const existingRecord = rateLimitStore.get(key);

    const record =
      existingRecord && existingRecord.resetAt > now
        ? existingRecord
        : {
            count: 0,
            resetAt: now + options.windowMs
          };

    const nextCount = record.count + 1;
    const remaining = options.max - nextCount;

    if (nextCount > options.max) {
      const retryAfterSeconds = getRetryAfterSeconds(record.resetAt, now);

      rateLimitStore.set(key, {
        ...record,
        count: nextCount
      });

      setRateLimitHeaders({
        c,
        limit: options.max,
        remaining: 0,
        resetAt: record.resetAt
      });

      c.header("Retry-After", String(retryAfterSeconds));

      logSecurityEventFromContext(c, "rate_limit.hit", {
        status: 429,
        metadata: {
          limiter: options.keyPrefix,
          limit: options.max,
          retryAfterSeconds
        }
      });

      return c.json(
        {
          success: false,
          message:
            options.message ??
            "Terlalu banyak request. Silakan coba lagi nanti.",
          errors: {
            retryAfterSeconds
          }
        },
        429
      );
    }

    rateLimitStore.set(key, {
      ...record,
      count: nextCount
    });

    setRateLimitHeaders({
      c,
      limit: options.max,
      remaining,
      resetAt: record.resetAt
    });

    await next();
  };
}

export const authLoginRateLimitMiddleware = createRateLimitMiddleware({
  keyPrefix: "auth:login",
  windowMs: FIFTEEN_MINUTES_MS,
  max: AUTH_LOGIN_RATE_LIMIT_MAX,
  message:
    "Terlalu banyak percobaan login. Silakan tunggu beberapa saat lalu coba lagi.",
  keyGenerator: async (c) => {
    const ip = getClientIp(c);
    const email = await getEmailFromJsonBody(c);

    return `${ip}:${email}`;
  }
});

export const authRegisterRateLimitMiddleware = createRateLimitMiddleware({
  keyPrefix: "auth:register",
  windowMs: FIFTEEN_MINUTES_MS,
  max: AUTH_REGISTER_RATE_LIMIT_MAX,
  message:
    "Terlalu banyak percobaan register. Silakan tunggu beberapa saat lalu coba lagi.",
  keyGenerator: (c) => {
    const ip = getClientIp(c);

    return `${ip}:register`;
  }
});

export const apiGeneralRateLimitMiddleware = createRateLimitMiddleware({
  keyPrefix: "api:general",
  windowMs: FIFTEEN_MINUTES_MS,
  max: API_GENERAL_RATE_LIMIT_MAX,
  message:
    "Terlalu banyak request ke API. Silakan tunggu beberapa saat lalu coba lagi.",
  keyGenerator: (c) => {
    const ip = getClientIp(c);

    return `${ip}:api`;
  }
});