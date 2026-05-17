import type { MiddlewareHandler } from "hono";
import { env } from "../config/env.js";
import type { AppEnv } from "../types/app.js";

const DEFAULT_REQUEST_BODY_LIMIT_BYTES = 1024 * 1024;

function requestCanHaveBody(method: string) {
  return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

function formatMegabytes(bytes: number) {
  const megabytes = bytes / (1024 * 1024);

  if (Number.isInteger(megabytes)) {
    return `${megabytes} MB`;
  }

  return `${megabytes.toFixed(1)} MB`;
}

export function getSecurityHeaders() {
  const headers: Record<string, string> = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Content-Security-Policy":
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    "X-Permitted-Cross-Domain-Policies": "none"
  };

  if (env.NODE_ENV === "production") {
    headers["Strict-Transport-Security"] =
      "max-age=15552000; includeSubDomains";
  }

  return headers;
}

export const securityHeadersMiddleware: MiddlewareHandler<AppEnv> = async (
  c,
  next
) => {
  for (const [key, value] of Object.entries(getSecurityHeaders())) {
    c.header(key, value);
  }

  await next();
};

type RequestSizeLimitOptions = {
  maxBytes?: number;
};

export function requestSizeLimitMiddleware(
  options: RequestSizeLimitOptions = {}
): MiddlewareHandler<AppEnv> {
  const maxBytes = options.maxBytes ?? DEFAULT_REQUEST_BODY_LIMIT_BYTES;

  return async (c, next) => {
    if (!requestCanHaveBody(c.req.method)) {
      await next();
      return;
    }

    const contentLength = c.req.header("content-length");

    if (!contentLength) {
      await next();
      return;
    }

    const requestBytes = Number(contentLength);

    if (!Number.isFinite(requestBytes) || requestBytes <= maxBytes) {
      await next();
      return;
    }

    return c.json(
      {
        success: false,
        message: `Ukuran request terlalu besar. Maksimal ${formatMegabytes(
          maxBytes
        )}.`,
        errors: null
      },
      413
    );
  };
}