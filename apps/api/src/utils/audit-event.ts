import { sanitizeSafeMetadata, type SafeMetadata, type SafeMetadataValue } from "./safe-metadata.js";

export type AuditEventType =
  | "auth.login_failed"
  | "auth.auth_failed"
  | "auth.logout"
  | "profile.updated"
  | "transaction.created"
  | "transaction.updated"
  | "transaction.deleted"
  | "category.created"
  | "category.updated"
  | "category.deleted"
  | "goal.created"
  | "goal.updated"
  | "goal.deleted"
  | "export.transactions_generated"
  | "integration.gmail.connected"
  | "integration.gmail.disconnected"
  | "integration.gmail.sync_started"
  | "integration.gmail.sync_completed"
  | "integration.gmail.sync_failed"
  | "oauth.token_revoked"
  | "rate_limit.hit";

export type AuditEventStatus = "success" | "failure";

export type AuditActorType = "user" | "system";

export type AuditTargetType =
  | "auth"
  | "profile"
  | "transaction"
  | "category"
  | "goal"
  | "export"
  | "integration"
  | "oauth"
  | "rate_limit"
  | "system";

export type AuditEventInput = {
  eventType: AuditEventType;
  status: AuditEventStatus;
  requestId?: string;
  actorType?: AuditActorType;
  actorUserId?: string;
  targetType?: AuditTargetType;
  targetId?: string;
  metadata?: SafeMetadata;
};

export type AuditEvent = {
  eventType: AuditEventType;
  status: AuditEventStatus;
  requestId: string | null;
  actorType: AuditActorType;
  actorUserId: string | null;
  targetType: AuditTargetType;
  targetId: string | null;
  metadata: Record<string, SafeMetadataValue>;
  createdAt: string;
};

export function createAuditEvent(input: AuditEventInput): AuditEvent {
  return {
    eventType: input.eventType,
    status: input.status,
    requestId: input.requestId ?? null,
    actorType: input.actorType ?? "system",
    actorUserId: input.actorUserId ?? null,
    targetType: input.targetType ?? "system",
    targetId: input.targetId ?? null,
    metadata: sanitizeSafeMetadata(input.metadata),
    createdAt: new Date().toISOString()
  };
}