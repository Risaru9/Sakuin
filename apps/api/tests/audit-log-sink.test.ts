import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/db/prisma.js";
import { createAuditEvent } from "../src/utils/audit-event.js";
import {
  createDatabaseAuditEventSink,
  databaseAuditEventSink
} from "../src/utils/audit-log-sink.js";
import { REDACTED_VALUE } from "../src/utils/safe-metadata.js";

const auditRequestIds: string[] = [];

async function cleanupAuditLogs() {
  if (auditRequestIds.length === 0) {
    return;
  }

  await prisma.auditLog.deleteMany({
    where: {
      requestId: {
        in: auditRequestIds
      }
    }
  });

  auditRequestIds.length = 0;
}

describe("Audit log database sink", () => {
  afterEach(async () => {
    await cleanupAuditLogs();
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await cleanupAuditLogs();
    await prisma.$disconnect();
  }, 30000);

  it("menyimpan audit event ke database dengan metadata aman", async () => {
    const requestId = `audit-sink-${Date.now()}`;

    auditRequestIds.push(requestId);

    const event = createAuditEvent({
      eventType: "profile.updated",
      status: "success",
      requestId,
      actorType: "system",
      targetType: "profile",
      targetId: "profile-test-target",
      metadata: {
        changedFields: "name,safeBalanceLimit",
        password: "SuperSecret123",
        token: "jwt-token-value",
        authorization: "Bearer sensitive-token",
        rawBody: "raw-body-content",
        email: "user@example.com"
      }
    });

    await databaseAuditEventSink(event);

    const auditLog = await prisma.auditLog.findFirst({
      where: {
        requestId
      }
    });

    expect(auditLog).not.toBeNull();
    expect(auditLog).toMatchObject({
      eventType: "profile.updated",
      status: "success",
      requestId,
      actorType: "system",
      actorUserId: null,
      targetType: "profile",
      targetId: "profile-test-target"
    });

    const metadata = auditLog?.metadata as Record<string, unknown>;
    const serializedMetadata = JSON.stringify(metadata);

    expect(metadata.changedFields).toBe("name,safeBalanceLimit");
    expect(metadata.password).toBe(REDACTED_VALUE);
    expect(metadata.token).toBe(REDACTED_VALUE);
    expect(metadata.authorization).toBe(REDACTED_VALUE);
    expect(metadata.rawBody).toBe(REDACTED_VALUE);
    expect(metadata.email).toBe(REDACTED_VALUE);

    expect(serializedMetadata).not.toContain("SuperSecret123");
    expect(serializedMetadata).not.toContain("jwt-token-value");
    expect(serializedMetadata).not.toContain("sensitive-token");
    expect(serializedMetadata).not.toContain("raw-body-content");
    expect(serializedMetadata).not.toContain("user@example.com");
  });

  it("tidak melempar error jika audit persistence gagal", async () => {
    const logger = {
      error: vi.fn()
    };

    const failingRepository = {
      auditLog: {
        create: vi.fn(async () => {
          throw new Error("Simulated audit persistence failure");
        })
      }
    };

    const sink = createDatabaseAuditEventSink({
      repository: failingRepository,
      logger
    });

    const event = createAuditEvent({
      eventType: "profile.updated",
      status: "success",
      requestId: `audit-sink-fail-open-${Date.now()}`,
      actorType: "user",
      actorUserId: "user-test",
      targetType: "profile",
      targetId: "profile-test-target",
      metadata: {
        changedFields: "name",
        token: "sensitive-token-value",
        rawBody: "raw-body-content"
      }
    });

    await expect(sink(event)).resolves.toBeUndefined();

    expect(failingRepository.auditLog.create).toHaveBeenCalledOnce();
    expect(logger.error).toHaveBeenCalledOnce();

    const loggedMessage = logger.error.mock.calls[0]?.[0] ?? "";

    expect(loggedMessage).toContain("audit_log_persist_failed");
    expect(loggedMessage).toContain(event.requestId);
    expect(loggedMessage).toContain(event.eventType);
    expect(loggedMessage).toContain(event.targetType);

    expect(loggedMessage).not.toContain("sensitive-token-value");
    expect(loggedMessage).not.toContain("raw-body-content");
    expect(loggedMessage).not.toContain("changedFields");
    expect(loggedMessage).not.toContain("metadata");
  });
});