import type { Context } from "hono";
import {
  createAuditEvent,
  type AuditActorType,
  type AuditEvent,
  type AuditEventInput,
  type AuditEventStatus,
  type AuditEventType,
  type AuditTargetType
} from "./audit-event.js";
import {
  getRequestIdForRequest,
  REQUEST_ID_HEADER
} from "../middlewares/request-id.middleware.js";
import type { AppEnv } from "../types/app.js";
import type { SafeMetadata } from "./safe-metadata.js";

export type AuditEventSink = (event: AuditEvent) => void | Promise<void>;

type AuditEventContextInput = {
  eventType: AuditEventType;
  status: AuditEventStatus;
  actorType?: AuditActorType;
  actorUserId?: string;
  targetType?: AuditTargetType;
  targetId?: string;
  metadata?: SafeMetadata;
};

let auditEventSink: AuditEventSink | null = null;

export function setAuditEventSink(sink: AuditEventSink) {
  auditEventSink = sink;
}

export function resetAuditEventSink() {
  auditEventSink = null;
}

export async function recordAuditEvent(input: AuditEventInput) {
  const event = createAuditEvent(input);

  if (auditEventSink) {
    await auditEventSink(event);
  }

  return event;
}

export async function recordAuditEventFromContext(
  c: Context<AppEnv>,
  input: AuditEventContextInput
) {
  const actorUserId = input.actorUserId ?? c.get("userId");

  return recordAuditEvent({
    eventType: input.eventType,
    status: input.status,
    requestId: getRequestIdForRequest(
      c.req.raw,
      c.req.header(REQUEST_ID_HEADER)
    ),
    actorType: input.actorType ?? (actorUserId ? "user" : "system"),
    actorUserId,
    targetType: input.targetType,
    targetId: input.targetId,
    metadata: input.metadata
  });
}