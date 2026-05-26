export type ReminderFrequency =
  | "EVENING"
  | "EVERY_1_HOUR"
  | "EVERY_2_HOURS"
  | "EVERY_4_HOURS";

export type ReminderSettingsResponse = {
  enabled: boolean;
  frequency: ReminderFrequency;
  eveningHour: number;
  quietStartHour: number;
  quietEndHour: number;
  maxPerDay: number;
  timezoneOffsetMinutes: number;
  dailyReviewCompletedDate: string | null;
  hasActiveSubscription: boolean;
};

export type UpdateReminderSettingsInput = {
  enabled: boolean;
  frequency: ReminderFrequency;
  eveningHour: number;
  quietStartHour: number;
  quietEndHour: number;
  maxPerDay: number;
  timezoneOffsetMinutes: number;
};

export type SavePushSubscriptionInput = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
};

export type DeletePushSubscriptionInput = {
  endpoint: string;
};

export type CompleteDailyReviewInput = {
  dateKey: string;
};

export type RunReminderCronResult = {
  checkedUsers: number;
  sentCount: number;
  skippedCount: number;
  deactivatedCount: number;
};
