import { apiRequest } from "../../lib/api-client";
import type { TransactionReminderSettings } from "../../lib/transaction-reminder";

export type ReminderSettingsResponse = TransactionReminderSettings & {
  dailyReviewCompletedDate: string | null;
  hasActiveSubscription: boolean;
};

type VapidPublicKeyResponse = {
  publicKey: string;
};

type PushSubscriptionPayload = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
};

export function getVapidPublicKey() {
  return apiRequest<VapidPublicKeyResponse>("/api/reminders/vapid-public-key");
}

export function getRemoteReminderSettings() {
  return apiRequest<ReminderSettingsResponse>("/api/reminders/settings");
}

export function updateRemoteReminderSettings(
  input: TransactionReminderSettings
) {
  return apiRequest<ReminderSettingsResponse>("/api/reminders/settings", {
    method: "PUT",
    body: input
  });
}

export function savePushSubscription(input: PushSubscriptionPayload) {
  return apiRequest<ReminderSettingsResponse>("/api/reminders/subscriptions", {
    method: "POST",
    body: input
  });
}

export function deletePushSubscription(endpoint: string) {
  return apiRequest<ReminderSettingsResponse>("/api/reminders/subscriptions", {
    method: "DELETE",
    body: {
      endpoint
    }
  });
}

export function completeRemoteDailyReview(dateKey: string) {
  return apiRequest<ReminderSettingsResponse>("/api/reminders/daily-review", {
    method: "POST",
    body: {
      dateKey
    }
  });
}
