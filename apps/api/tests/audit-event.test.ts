import { describe, expect, it } from "vitest";
import { createAuditEvent } from "../src/utils/audit-event.js";
import { createSecurityHash, REDACTED_VALUE } from "../src/utils/safe-metadata.js";

describe("Audit event contract", () => {
  it("membuat audit event dengan default field yang aman", () => {
    const event = createAuditEvent({
      eventType: "profile.updated",
      status: "success",
      requestId: "request-123",
      actorUserId: "user-123",
      targetType: "profile",
      targetId: "user-123",
      metadata: {
        changedField: "safeBalanceLimit"
      }
    });

    expect(event).toMatchObject({
      eventType: "profile.updated",
      status: "success",
      requestId: "request-123",
      actorType: "system",
      actorUserId: "user-123",
      targetType: "profile",
      targetId: "user-123",
      metadata: {
        changedField: "safeBalanceLimit"
      }
    });

    expect(event.createdAt).toBeTruthy();
  });

  it("meredact metadata sensitif sebelum audit event dipakai", () => {
    const event = createAuditEvent({
      eventType: "integration.gmail.sync_failed",
      status: "failure",
      requestId: "request-456",
      actorType: "user",
      actorUserId: "user-456",
      targetType: "integration",
      targetId: "gmail",
      metadata: {
        reason: "provider_error",
        password: "SuperSecret123",
        token: "access-token-value",
        refreshToken: "refresh-token-value",
        authorization: "Bearer token-value",
        rawEmail: "user@example.com",
        emailBody: "Isi email transaksi sensitif",
        otp: "123456",
        pin: "123456",
        apiKey: "api-key-value"
      }
    });

    const serializedEvent = JSON.stringify(event);

    expect(event.metadata.password).toBe(REDACTED_VALUE);
    expect(event.metadata.token).toBe(REDACTED_VALUE);
    expect(event.metadata.refreshToken).toBe(REDACTED_VALUE);
    expect(event.metadata.authorization).toBe(REDACTED_VALUE);
    expect(event.metadata.rawEmail).toBe(REDACTED_VALUE);
    expect(event.metadata.emailBody).toBe(REDACTED_VALUE);
    expect(event.metadata.otp).toBe(REDACTED_VALUE);
    expect(event.metadata.pin).toBe(REDACTED_VALUE);
    expect(event.metadata.apiKey).toBe(REDACTED_VALUE);

    expect(serializedEvent).not.toContain("SuperSecret123");
    expect(serializedEvent).not.toContain("access-token-value");
    expect(serializedEvent).not.toContain("refresh-token-value");
    expect(serializedEvent).not.toContain("Bearer token-value");
    expect(serializedEvent).not.toContain("user@example.com");
    expect(serializedEvent).not.toContain("Isi email transaksi sensitif");
    expect(serializedEvent).not.toContain("123456");
    expect(serializedEvent).not.toContain("api-key-value");
  });

  it("boleh menyimpan hash identifier, bukan nilai asli", () => {
    const email = "User@Test.com";
    const identifierHash = createSecurityHash(email);

    const event = createAuditEvent({
      eventType: "auth.login_failed",
      status: "failure",
      requestId: "request-789",
      targetType: "auth",
      metadata: {
        reason: "invalid_credentials",
        identifierHash
      }
    });

    const serializedEvent = JSON.stringify(event);

    expect(identifierHash).toHaveLength(64);
    expect(identifierHash).toBe(createSecurityHash("user@test.com"));
    expect(serializedEvent).toContain(identifierHash);
    expect(serializedEvent).not.toContain(email);
    expect(serializedEvent).not.toContain("user@test.com");
  });
});