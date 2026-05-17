import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { resetRateLimitStore } from "../src/middlewares/rate-limit.middleware.js";

type ApiResponse<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
  errors?: unknown;
};

async function parseJson<T = unknown>(response: Response) {
  return (await response.json()) as ApiResponse<T>;
}

function getByteLength(value: string) {
  return new TextEncoder().encode(value).length;
}

beforeEach(() => {
  resetRateLimitStore();
});

describe("Security hardening", () => {
  it("GET /api/health menyertakan security headers", async () => {
    const response = await app.request("/api/health", {
      method: "GET"
    });

    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);

    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    expect(response.headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin"
    );
    expect(response.headers.get("X-Permitted-Cross-Domain-Policies")).toBe(
      "none"
    );
    expect(response.headers.get("Permissions-Policy")).toContain("camera=()");
    expect(response.headers.get("Permissions-Policy")).toContain(
      "microphone=()"
    );
    expect(response.headers.get("Content-Security-Policy")).toContain(
      "default-src 'none'"
    );
    expect(response.headers.get("Content-Security-Policy")).toContain(
      "frame-ancestors 'none'"
    );
  });

  it("CORS tidak memantulkan origin asing", async () => {
    const disallowedOrigin = "https://evil.example.com";

    const response = await app.request("/api/health", {
      method: "OPTIONS",
      headers: {
        Origin: disallowedOrigin,
        "Access-Control-Request-Method": "GET"
      }
    });

    expect(response.headers.get("Access-Control-Allow-Origin")).not.toBe(
      disallowedOrigin
    );
    expect(response.headers.get("Access-Control-Allow-Origin")).not.toBe("*");
  });

  it("CORS mengizinkan localhost development origin", async () => {
    const allowedOrigin = "http://localhost:3000";

    const response = await app.request("/api/health", {
      method: "OPTIONS",
      headers: {
        Origin: allowedOrigin,
        "Access-Control-Request-Method": "GET"
      }
    });

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      allowedOrigin
    );
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBe(
      "true"
    );
  });

  it("Request body terlalu besar ditolak dengan 413", async () => {
    const oversizedBody = JSON.stringify({
      email: "oversized@example.com",
      password: "A".repeat(1024 * 1024)
    });

    const response = await app.request("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": String(getByteLength(oversizedBody)),
        "X-Forwarded-For": "203.0.113.210"
      },
      body: oversizedBody
    });

    const body = await parseJson(response);

    expect(response.status).toBe(413);
    expect(body.success).toBe(false);
    expect(body.message).toContain("Ukuran request terlalu besar");
  });

  it("Authorization header dengan format salah ditolak", async () => {
    const response = await app.request("/api/auth/me", {
      method: "GET",
      headers: {
        Authorization: "Token not-a-bearer-token"
      }
    });

    const body = await parseJson(response);

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Format token harus Bearer token");
  });

  it("Bearer token invalid ditolak", async () => {
    const response = await app.request("/api/auth/me", {
      method: "GET",
      headers: {
        Authorization: "Bearer invalid.token.value"
      }
    });

    const body = await parseJson(response);

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Token tidak valid atau sudah kedaluwarsa");
  });

  it("Endpoint profile private gagal tanpa token", async () => {
    const response = await app.request("/api/users/profile", {
      method: "GET"
    });

    const body = await parseJson(response);

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Authorization header wajib diisi");
  });

  it("JSON endpoint menolak request tanpa Content-Type application/json", async () => {
    const response = await app.request("/api/auth/login", {
      method: "POST",
      headers: {
        "X-Forwarded-For": "203.0.113.211"
      },
      body: JSON.stringify({
        email: "security@example.com",
        password: "Password123"
      })
    });

    const body = await parseJson(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Content-Type harus application/json");
  });

  it("JSON endpoint menolak body JSON rusak", async () => {
    const response = await app.request("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": "203.0.113.212"
      },
      body: "{"
    });

    const body = await parseJson(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Body JSON tidak valid");
  });
});