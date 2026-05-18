import { afterEach, describe, expect, it } from "vitest";
import {
  recordAuditEvent,
  resetAuditEventSink,
  setAuditEventSink,
  type AuditEventSink
} from "../src/utils/audit-event-recorder.js";
import { REDACTED_VALUE } from "../src/utils/safe-metadata.js";

describe("Audit event recorder", () => {
  afterEach(() => {
    resetAuditEventSink();
  });

  it("mengembalikan audit event walaupun belum ada sink", async () => {
    const event = await recordAuditEvent({
      eventType: "profile.updated",
      status: "success",
      requestId: "request-123",
      actorType: "user",
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
      actorType: "user",
      actorUserId: "user-123",
      targetType: "profile",
      targetId: "user-123",
      metadata: {
        changedField: "safeBalanceLimit"
      }
    });

    expect(event.createdAt).toBeTruthy();
  });

  it("mengirim audit event yang sudah disanitasi ke sink", async () => {
    const capturedEvents: Awaited<ReturnType<typeof recordAuditEvent>>[] = [];

    const sink: AuditEventSink = (event) => {
      capturedEvents.push(event);
    };

    setAuditEventSink(sink);

    await recordAuditEvent({
      eventType: "integration.gmail.connected",
      status: "success",
      requestId: "request-456",
      actorType: "user",
      actorUserId: "user-456",
      targetType: "integration",
      targetId: "gmail",
      metadata: {
        provider: "gmail",
        accessToken: "access-token-value",
        refreshToken: "refresh-token-value",
        rawEmail: "user@example.com",
        password: "SuperSecret123"
      }
    });

    expect(capturedEvents).toHaveLength(1);

    const [event] = capturedEvents;
    const serializedEvent = JSON.stringify(event);

    expect(event.metadata.provider).toBe("gmail");
    expect(event.metadata.accessToken).toBe(REDACTED_VALUE);
    expect(event.metadata.refreshToken).toBe(REDACTED_VALUE);
    expect(event.metadata.rawEmail).toBe(REDACTED_VALUE);
    expect(event.metadata.password).toBe(REDACTED_VALUE);

    expect(serializedEvent).not.toContain("access-token-value");
    expect(serializedEvent).not.toContain("refresh-token-value");
    expect(serializedEvent).not.toContain("user@example.com");
    expect(serializedEvent).not.toContain("SuperSecret123");
  });

  it("menunggu async sink selesai sebelum mengembalikan event", async () => {
    const executionOrder: string[] = [];

    setAuditEventSink(async () => {
      executionOrder.push("sink-start");
      await Promise.resolve();
      executionOrder.push("sink-end");
    });

    executionOrder.push("before-record");

    await recordAuditEvent({
      eventType: "export.transactions_generated",
      status: "success",
      requestId: "request-789",
      actorType: "user",
      actorUserId: "user-789",
      targetType: "export",
      metadata: {
        format: "xlsx"
      }
    });

    executionOrder.push("after-record");

    expect(executionOrder).toEqual([
      "before-record",
      "sink-start",
      "sink-end",
      "after-record"
    ]);
  });

  it("resetAuditEventSink mengembalikan recorder ke mode no-op", async () => {
    const capturedEvents: Awaited<ReturnType<typeof recordAuditEvent>>[] = [];

    setAuditEventSink((event) => {
      capturedEvents.push(event);
    });

    resetAuditEventSink();

    await recordAuditEvent({
      eventType: "auth.logout",
      status: "success",
      requestId: "request-000",
      actorType: "user",
      actorUserId: "user-000",
      targetType: "auth"
    });

    expect(capturedEvents).toHaveLength(0);
  });
});