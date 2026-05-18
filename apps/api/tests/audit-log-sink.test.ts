import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "../src/db/prisma.js";
import { createAuditEvent } from "../src/utils/audit-event.js";
import { databaseAuditEventSink } from "../src/utils/audit-log-sink.js";
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
    const event = createAuditEvent({
      eventType: "profile.updated",
      status: "success",
      requestId: `audit-sink-fail-open-${Date.now()}`,
      actorType: "user",
      actorUserId: "user-yang-tidak-ada",
      targetType: "profile",
      targetId: "profile-test-target",
      metadata: {
        changedFields: "name"
      }
    });

    await expect(databaseAuditEventSink(event)).resolves.toBeUndefined();
  });
});