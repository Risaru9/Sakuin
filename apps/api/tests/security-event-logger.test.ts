import { describe, expect, it } from "vitest";
import {
  createSafeSecurityEventLog,
  createSecurityHash
} from "../src/utils/security-event-logger.js";

describe("Security event logger", () => {
  it("membuat hash identifier tanpa menyimpan nilai asli", () => {
    const identifier = "User@Test.com";
    const hash = createSecurityHash(identifier);

    expect(hash).toHaveLength(64);
    expect(hash).not.toBe(identifier);
    expect(hash).toBe(createSecurityHash("user@test.com"));
  });

  it("menghapus metadata sensitif dari security event log", () => {
    const log = createSafeSecurityEventLog({
      eventType: "auth.login_failed",
      requestId: "request-123",
      method: "POST",
      path: "/api/auth/login",
      status: 401,
      metadata: {
        reason: "invalid_credentials",
        identifierHash: createSecurityHash("user@example.com"),
        password: "SuperSecret123",
        token: "jwt-token-value",
        authorization: "Bearer sensitive-token",
        rawEmail: "user@example.com",
        requestBody: "raw-body-content",
        sessionCookie: "session-cookie-value"
      }
    });

    const serializedLog = JSON.stringify(log);

    expect(log.metadata.password).toBe("[REDACTED]");
    expect(log.metadata.token).toBe("[REDACTED]");
    expect(log.metadata.authorization).toBe("[REDACTED]");
    expect(log.metadata.rawEmail).toBe("[REDACTED]");
    expect(log.metadata.requestBody).toBe("[REDACTED]");
    expect(log.metadata.sessionCookie).toBe("[REDACTED]");

    expect(serializedLog).not.toContain("SuperSecret123");
    expect(serializedLog).not.toContain("jwt-token-value");
    expect(serializedLog).not.toContain("sensitive-token");
    expect(serializedLog).not.toContain("user@example.com");
    expect(serializedLog).not.toContain("raw-body-content");
    expect(serializedLog).not.toContain("session-cookie-value");
  });

  it("menyimpan metadata non-sensitif yang diperlukan untuk debugging", () => {
    const log = createSafeSecurityEventLog({
      eventType: "rate_limit.hit",
      requestId: "request-456",
      method: "POST",
      path: "/api/auth/login",
      status: 429,
      metadata: {
        limiter: "auth:login",
        limit: 10,
        retryAfterSeconds: 60
      }
    });

    expect(log.metadata).toEqual({
      limiter: "auth:login",
      limit: 10,
      retryAfterSeconds: 60
    });
  });
});