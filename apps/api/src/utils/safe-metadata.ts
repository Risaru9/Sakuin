import { createHash } from "node:crypto";

export type SafeMetadataValue = string | number | boolean | null;

export type SafeMetadata = Record<string, SafeMetadataValue | undefined>;

export const REDACTED_VALUE = "[REDACTED]";

const SENSITIVE_METADATA_KEY_PATTERN =
  /password|token|authorization|secret|cookie|body|raw|email|credential|session|otp|pin|key/i;

export function createSecurityHash(value: string) {
  return createHash("sha256")
    .update(value.trim().toLowerCase())
    .digest("hex");
}

export function sanitizeSafeMetadata(metadata: SafeMetadata = {}) {
  const safeMetadata: Record<string, SafeMetadataValue> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined) {
      continue;
    }

    if (SENSITIVE_METADATA_KEY_PATTERN.test(key)) {
      safeMetadata[key] = REDACTED_VALUE;
      continue;
    }

    safeMetadata[key] = value;
  }

  return safeMetadata;
}