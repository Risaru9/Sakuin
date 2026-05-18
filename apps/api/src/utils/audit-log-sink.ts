import type { Prisma } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import {
  setAuditEventSink,
  type AuditEventSink
} from "./audit-event-recorder.js";
import type { AuditEvent } from "./audit-event.js";

type AuditLogCreateInput = {
  data: {
    eventType: string;
    status: string;
    requestId: string | null;
    actorType: string;
    actorUserId: string | null;
    targetType: string;
    targetId: string | null;
    metadata: Prisma.InputJsonObject;
    createdAt: Date;
  };
};

type AuditLogRepository = {
  auditLog: {
    create: (input: AuditLogCreateInput) => Promise<unknown>;
  };
};

type AuditLogSinkLogger = {
  error: (message: string) => void;
};

function toJsonMetadata(
  metadata: Record<string, string | number | boolean | null>
): Prisma.InputJsonObject {
  return { ...metadata };
}

function logAuditPersistenceFailure({
  logger,
  requestId,
  eventType,
  targetType
}: {
  logger: AuditLogSinkLogger;
  requestId: string | null;
  eventType: string;
  targetType: string;
}) {
  logger.error(
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

export function createDatabaseAuditEventSink({
  repository,
  logger = console
}: {
  repository: AuditLogRepository;
  logger?: AuditLogSinkLogger;
}): AuditEventSink {
  return async (event: AuditEvent) => {
    try {
      await repository.auditLog.create({
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
        logger,
        requestId: event.requestId,
        eventType: event.eventType,
        targetType: event.targetType
      });
    }
  };
}

export const databaseAuditEventSink = createDatabaseAuditEventSink({
  repository: prisma
});

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