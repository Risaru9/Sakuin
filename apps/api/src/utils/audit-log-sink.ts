import type { Prisma } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import {
  setAuditEventSink,
  type AuditEventSink
} from "./audit-event-recorder.js";

function toJsonMetadata(
  metadata: Record<string, string | number | boolean | null>
): Prisma.InputJsonObject {
  return { ...metadata };
}

function logAuditPersistenceFailure({
  requestId,
  eventType,
  targetType
}: {
  requestId: string | null;
  eventType: string;
  targetType: string;
}) {
  console.error(
    JSON.stringify({
      level: "error",
      event: "audit_log_persist_failed",
      requestId,
      eventType,
      targetType,
      timestamp: new Date().toISOString()
    })
  );
}

export const databaseAuditEventSink: AuditEventSink = async (event) => {
  try {
    await prisma.auditLog.create({
      data: {
        eventType: event.eventType,
        status: event.status,
        requestId: event.requestId,
        actorType: event.actorType,
        actorUserId: event.actorUserId,
        targetType: event.targetType,
        targetId: event.targetId,
        metadata: toJsonMetadata(event.metadata),
        createdAt: new Date(event.createdAt)
      }
    });
  } catch {
    logAuditPersistenceFailure({
      requestId: event.requestId,
      eventType: event.eventType,
      targetType: event.targetType
    });
  }
};

let auditLogPersistenceConfigured = false;

export function configureAuditLogPersistence() {
  if (auditLogPersistenceConfigured) {
    return;
  }

  if (env.NODE_ENV === "test") {
    return;
  }

  setAuditEventSink(databaseAuditEventSink);
  auditLogPersistenceConfigured = true;
}