import { z } from "zod";

const reminderFrequencySchema = z.enum([
  "EVENING",
  "EVERY_1_HOUR",
  "EVERY_2_HOURS",
  "EVERY_4_HOURS"
]);

export const updateReminderSettingsSchema = z.object({
  enabled: z.boolean(),
  frequency: reminderFrequencySchema,
  eveningHour: z.number().int().min(0).max(23),
  quietStartHour: z.number().int().min(0).max(23),
  quietEndHour: z.number().int().min(0).max(23),
  maxPerDay: z.number().int().min(1).max(3),
  timezoneOffsetMinutes: z.number().int().min(-840).max(720)
});

export const savePushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1)
  }),
  userAgent: z.string().max(300).optional()
});

export const deletePushSubscriptionSchema = z.object({
  endpoint: z.string().url()
});

export const completeDailyReviewSchema = z.object({
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});
