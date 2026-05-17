import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import {
  API_GENERAL_RATE_LIMIT_MAX,
  AUTH_LOGIN_RATE_LIMIT_MAX,
  AUTH_REGISTER_RATE_LIMIT_MAX,
  resetRateLimitStore
} from "../src/middlewares/rate-limit.middleware.js";

type ApiResponse<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
  errors?: {
    retryAfterSeconds?: number;
  } | unknown;
};

const testRunId = Date.now();

async function parseJson<T = unknown>(response: Response) {
  return (await response.json()) as ApiResponse<T>;
}

function getRateLimitHeaders(response: Response) {
  return {
    retryAfter: response.headers.get("Retry-After"),
    limit: response.headers.get("RateLimit-Limit"),
    remaining: response.headers.get("RateLimit-Remaining"),
    reset: response.headers.get("RateLimit-Reset")
  };
}

function expectRateLimitHeaders(response: Response, expectedLimit: number) {
  const headers = getRateLimitHeaders(response);

  expect(headers.retryAfter).toBeTruthy();
  expect(headers.limit).toBe(String(expectedLimit));
  expect(headers.remaining).toBe("0");
  expect(headers.reset).toBeTruthy();

  const retryAfterSeconds = Number(headers.retryAfter);
  const resetSeconds = Number(headers.reset);

  expect(Number.isFinite(retryAfterSeconds)).toBe(true);
  expect(retryAfterSeconds).toBeGreaterThan(0);

  expect(Number.isFinite(resetSeconds)).toBe(true);
  expect(resetSeconds).toBeGreaterThan(0);
}

beforeEach(() => {
  resetRateLimitStore();
});

describe("Rate limit security", () => {
  it("Login rate limit memblok percobaan login berulang dengan IP dan email yang sama", async () => {
    const clientIp = "198.51.200.10";
    const email = `rate-login-same-${testRunId}@example.com`;

    for (let attempt = 1; attempt <= AUTH_LOGIN_RATE_LIMIT_MAX; attempt += 1) {
      const response = await app.request("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": clientIp
        },
        body: JSON.stringify({
          email,
          password: "WrongPassword123"
        })
      });

      const body = await parseJson(response);

      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.message).toBe("Email atau password salah");
    }

    const blockedResponse = await app.request("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": clientIp
      },
      body: JSON.stringify({
        email,
        password: "WrongPassword123"
      })
    });

    const blockedBody = await parseJson(blockedResponse);

    expect(blockedResponse.status).toBe(429);
    expect(blockedBody.success).toBe(false);
    expect(blockedBody.message).toBe(
      "Terlalu banyak percobaan login. Silakan tunggu beberapa saat lalu coba lagi."
    );

    expectRateLimitHeaders(blockedResponse, AUTH_LOGIN_RATE_LIMIT_MAX);
  });

  it("Login rate limit memakai kombinasi IP dan email sehingga email berbeda dari IP berbeda tidak langsung ikut terblokir", async () => {
    const firstClientIp = "198.51.200.11";
    const secondClientIp = "198.51.200.12";
    const firstEmail = `rate-login-first-${testRunId}@example.com`;
    const secondEmail = `rate-login-second-${testRunId}@example.com`;

    for (let attempt = 1; attempt <= AUTH_LOGIN_RATE_LIMIT_MAX; attempt += 1) {
      const response = await app.request("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": firstClientIp
        },
        body: JSON.stringify({
          email: firstEmail,
          password: "WrongPassword123"
        })
      });

      expect(response.status).toBe(401);
    }

    const blockedResponse = await app.request("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": firstClientIp
      },
      body: JSON.stringify({
        email: firstEmail,
        password: "WrongPassword123"
      })
    });

    expect(blockedResponse.status).toBe(429);

    const differentIdentityResponse = await app.request("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": secondClientIp
      },
      body: JSON.stringify({
        email: secondEmail,
        password: "WrongPassword123"
      })
    });

    const differentIdentityBody = await parseJson(differentIdentityResponse);

    expect(differentIdentityResponse.status).toBe(401);
    expect(differentIdentityBody.success).toBe(false);
    expect(differentIdentityBody.message).toBe("Email atau password salah");
  });

  it("Register rate limit memblok spam register dari IP yang sama tanpa menjalankan hash password berulang", async () => {
    const clientIp = "198.51.200.20";

    for (
      let attempt = 1;
      attempt <= AUTH_REGISTER_RATE_LIMIT_MAX;
      attempt += 1
    ) {
      const response = await app.request("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": clientIp
        },
        body: JSON.stringify({
          name: "Rate Limit Register User",
          email: `rate-register-${testRunId}-${attempt}@example.com`,
          password: "weak"
        })
      });

      expect(response.status).toBe(400);
    }

    const blockedResponse = await app.request("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": clientIp
      },
      body: JSON.stringify({
        name: "Rate Limit Register Blocked User",
        email: `rate-register-blocked-${testRunId}@example.com`,
        password: "weak"
      })
    });

    const blockedBody = await parseJson(blockedResponse);

    expect(blockedResponse.status).toBe(429);
    expect(blockedBody.success).toBe(false);
    expect(blockedBody.message).toBe(
      "Terlalu banyak percobaan register. Silakan tunggu beberapa saat lalu coba lagi."
    );

    expectRateLimitHeaders(blockedResponse, AUTH_REGISTER_RATE_LIMIT_MAX);
  });

  it("General API rate limit memblok request API berlebihan dari IP yang sama", async () => {
    const clientIp = "198.51.200.30";

    for (let attempt = 1; attempt <= API_GENERAL_RATE_LIMIT_MAX; attempt += 1) {
      const response = await app.request("/api/health", {
        method: "GET",
        headers: {
          "X-Forwarded-For": clientIp
        }
      });

      expect(response.status).toBe(200);
    }

    const blockedResponse = await app.request("/api/health", {
      method: "GET",
      headers: {
        "X-Forwarded-For": clientIp
      }
    });

    const blockedBody = await parseJson(blockedResponse);

    expect(blockedResponse.status).toBe(429);
    expect(blockedBody.success).toBe(false);
    expect(blockedBody.message).toBe(
      "Terlalu banyak request ke API. Silakan tunggu beberapa saat lalu coba lagi."
    );

    expectRateLimitHeaders(blockedResponse, API_GENERAL_RATE_LIMIT_MAX);
  }, 30000);

  it("Rate limit store bisa di-reset sehingga request berikutnya kembali diproses normal", async () => {
    const clientIp = "198.51.200.40";
    const email = `rate-reset-${testRunId}@example.com`;

    for (let attempt = 1; attempt <= AUTH_LOGIN_RATE_LIMIT_MAX; attempt += 1) {
      const response = await app.request("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": clientIp
        },
        body: JSON.stringify({
          email,
          password: "WrongPassword123"
        })
      });

      expect(response.status).toBe(401);
    }

    const blockedResponse = await app.request("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": clientIp
      },
      body: JSON.stringify({
        email,
        password: "WrongPassword123"
      })
    });

    expect(blockedResponse.status).toBe(429);

    resetRateLimitStore();

    const responseAfterReset = await app.request("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": clientIp
      },
      body: JSON.stringify({
        email,
        password: "WrongPassword123"
      })
    });

    const bodyAfterReset = await parseJson(responseAfterReset);

    expect(responseAfterReset.status).toBe(401);
    expect(bodyAfterReset.success).toBe(false);
    expect(bodyAfterReset.message).toBe("Email atau password salah");
  });
});