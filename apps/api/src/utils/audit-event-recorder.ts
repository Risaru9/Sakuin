import {
  createAuditEvent,
  type AuditEvent,
  type AuditEventInput
} from "./audit-event.js";

export type AuditEventSink = (event: AuditEvent) => void | Promise<void>;

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