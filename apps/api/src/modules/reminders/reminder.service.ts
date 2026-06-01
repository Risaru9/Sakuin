import webpush from "web-push";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { HttpError } from "../../utils/http-error.js";
import { getAiFinancialContext } from "../ai/ai-financial-context.js";
import type {
  CompleteDailyReviewInput,
  DeletePushSubscriptionInput,
  ReminderFrequency,
  ReminderSettingsResponse,
  RunReminderCronResult,
  SavePushSubscriptionInput,
  UpdateReminderSettingsInput
} from "./reminder.types.js";

const DEFAULT_REMINDER_SETTINGS = {
  enabled: false,
  frequency: "EVENING" as ReminderFrequency,
  eveningHour: 20,
  quietStartHour: 21,
  quietEndHour: 7,
  maxPerDay: 1,
  timezoneOffsetMinutes: -420
};

const REMINDER_POLICY = {
  frequency: "EVENING" as ReminderFrequency,
  eveningHour: 20,
  maxPerDay: 1
};

const reminderFrequencyMinutes: Record<ReminderFrequency, number | null> = {
  EVENING: null,
  EVERY_1_HOUR: 60,
  EVERY_2_HOURS: 120,
  EVERY_4_HOURS: 240
};

type ReminderPreferenceLike = {
  userId: string;
  enabled: boolean;
  frequency: string;
  eveningHour: number;
  quietStartHour: number;
  quietEndHour: number;
  maxPerDay: number;
  timezoneOffsetMinutes: number;
  dailyReviewCompletedDate: string | null;
  lastReminderDate: string | null;
  reminderCountToday: number;
  lastReminderSentAt: Date | null;
};

function getVapidSubject() {
  if (!env.VAPID_SUBJECT) {
    return undefined;
  }

  if (env.VAPID_SUBJECT.startsWith("mailto:")) {
    return env.VAPID_SUBJECT;
  }

  if (env.VAPID_SUBJECT.includes("@")) {
    return `mailto:${env.VAPID_SUBJECT}`;
  }

  return env.VAPID_SUBJECT;
}

function ensureVapidConfigured() {
  const subject = getVapidSubject();

  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !subject) {
    throw new HttpError("VAPID belum dikonfigurasi", 503);
  }

  webpush.setVapidDetails(
    subject,
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  );
}

function normalizeFrequency(value: string): ReminderFrequency {
  if (
    value === "EVENING" ||
    value === "EVERY_1_HOUR" ||
    value === "EVERY_2_HOURS" ||
    value === "EVERY_4_HOURS"
  ) {
    return value;
  }

  return DEFAULT_REMINDER_SETTINGS.frequency;
}

function getLocalNow(input: {
  now: Date;
  timezoneOffsetMinutes: number;
}) {
  return new Date(
    input.now.getTime() - input.timezoneOffsetMinutes * 60 * 1000
  );
}

function getLocalDateKey(input: {
  now: Date;
  timezoneOffsetMinutes: number;
}) {
  const localNow = getLocalNow(input);
  const year = localNow.getUTCFullYear();
  const month = String(localNow.getUTCMonth() + 1).padStart(2, "0");
  const day = String(localNow.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getLocalHour(input: {
  now: Date;
  timezoneOffsetMinutes: number;
}) {
  return getLocalNow(input).getUTCHours();
}

function isWithinQuietHours(input: {
  preference: ReminderPreferenceLike;
  now: Date;
}) {
  const currentHour = getLocalHour({
    now: input.now,
    timezoneOffsetMinutes: input.preference.timezoneOffsetMinutes
  });

  if (input.preference.quietStartHour === input.preference.quietEndHour) {
    return false;
  }

  if (input.preference.quietStartHour < input.preference.quietEndHour) {
    return (
      currentHour >= input.preference.quietStartHour &&
      currentHour < input.preference.quietEndHour
    );
  }

  return (
    currentHour >= input.preference.quietStartHour ||
    currentHour < input.preference.quietEndHour
  );
}

function isHourWithinQuietHours(
  preference: ReminderPreferenceLike,
  currentHour: number
) {
  if (preference.quietStartHour === preference.quietEndHour) {
    return false;
  }

  if (preference.quietStartHour < preference.quietEndHour) {
    return (
      currentHour >= preference.quietStartHour &&
      currentHour < preference.quietEndHour
    );
  }

  return (
    currentHour >= preference.quietStartHour ||
    currentHour < preference.quietEndHour
  );
}

function hasReachedReminderDelay(input: {
  preference: ReminderPreferenceLike;
  now: Date;
}) {
  const frequency = normalizeFrequency(input.preference.frequency);
  const intervalMinutes = reminderFrequencyMinutes[frequency];

  if (intervalMinutes === null) {
    const currentHour = getLocalHour({
      now: input.now,
      timezoneOffsetMinutes: input.preference.timezoneOffsetMinutes
    });

    return (
      currentHour >= input.preference.eveningHour ||
      isHourWithinQuietHours(input.preference, input.preference.eveningHour)
    );
  }

  if (!input.preference.lastReminderSentAt) {
    return true;
  }

  const elapsedMinutes =
    (input.now.getTime() - input.preference.lastReminderSentAt.getTime()) /
    (1000 * 60);

  return elapsedMinutes >= intervalMinutes;
}

function mapPreferenceToResponse(input: {
  preference: ReminderPreferenceLike;
  hasActiveSubscription: boolean;
}): ReminderSettingsResponse {
  return {
    enabled: input.preference.enabled,
    frequency: REMINDER_POLICY.frequency,
    eveningHour: REMINDER_POLICY.eveningHour,
    quietStartHour: input.preference.quietStartHour,
    quietEndHour: input.preference.quietEndHour,
    maxPerDay: REMINDER_POLICY.maxPerDay,
    timezoneOffsetMinutes: input.preference.timezoneOffsetMinutes,
    dailyReviewCompletedDate: input.preference.dailyReviewCompletedDate,
    hasActiveSubscription: input.hasActiveSubscription
  };
}

function applyReminderPolicy<T extends UpdateReminderSettingsInput>(input: T): T {
  return {
    ...input,
    frequency: REMINDER_POLICY.frequency,
    eveningHour: REMINDER_POLICY.eveningHour,
    maxPerDay: REMINDER_POLICY.maxPerDay
  };
}

function getEffectivePreference(
  preference: ReminderPreferenceLike
): ReminderPreferenceLike {
  return {
    ...preference,
    frequency: REMINDER_POLICY.frequency,
    eveningHour: REMINDER_POLICY.eveningHour,
    maxPerDay: REMINDER_POLICY.maxPerDay
  };
}

async function getOrCreatePreference(userId: string) {
  return prisma.reminderPreference.upsert({
    where: {
      userId
    },
    update: {},
    create: {
      userId,
      ...DEFAULT_REMINDER_SETTINGS
    }
  });
}

export function getVapidPublicKey() {
  if (!env.VAPID_PUBLIC_KEY) {
    throw new HttpError("VAPID public key belum dikonfigurasi", 503);
  }

  return {
    publicKey: env.VAPID_PUBLIC_KEY
  };
}

export async function getReminderSettings(
  userId: string
): Promise<ReminderSettingsResponse> {
  const [preference, activeSubscriptionCount] = await Promise.all([
    getOrCreatePreference(userId),
    prisma.pushSubscription.count({
      where: {
        userId,
        isActive: true
      }
    })
  ]);

  return mapPreferenceToResponse({
    preference,
    hasActiveSubscription: activeSubscriptionCount > 0
  });
}

export async function updateReminderSettings(
  userId: string,
  input: UpdateReminderSettingsInput
): Promise<ReminderSettingsResponse> {
  const policyInput = applyReminderPolicy(input);
  const preference = await prisma.reminderPreference.upsert({
    where: {
      userId
    },
    update: policyInput,
    create: {
      userId,
      ...policyInput
    }
  });

  const activeSubscriptionCount = await prisma.pushSubscription.count({
    where: {
      userId,
      isActive: true
    }
  });

  return mapPreferenceToResponse({
    preference,
    hasActiveSubscription: activeSubscriptionCount > 0
  });
}

export async function savePushSubscription(
  userId: string,
  input: SavePushSubscriptionInput
) {
  await prisma.pushSubscription.upsert({
    where: {
      endpoint: input.endpoint
    },
    update: {
      userId,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      userAgent: input.userAgent,
      isActive: true
    },
    create: {
      userId,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      userAgent: input.userAgent,
      isActive: true
    }
  });

  return getReminderSettings(userId);
}

export async function deletePushSubscription(
  userId: string,
  input: DeletePushSubscriptionInput
) {
  await prisma.pushSubscription.updateMany({
    where: {
      userId,
      endpoint: input.endpoint
    },
    data: {
      isActive: false
    }
  });

  return getReminderSettings(userId);
}

export async function completeDailyReview(
  userId: string,
  input: CompleteDailyReviewInput
) {
  const preference = await prisma.reminderPreference.upsert({
    where: {
      userId
    },
    update: {
      dailyReviewCompletedDate: input.dateKey
    },
    create: {
      userId,
      ...DEFAULT_REMINDER_SETTINGS,
      dailyReviewCompletedDate: input.dateKey
    }
  });

  const activeSubscriptionCount = await prisma.pushSubscription.count({
    where: {
      userId,
      isActive: true
    }
  });

  return mapPreferenceToResponse({
    preference,
    hasActiveSubscription: activeSubscriptionCount > 0
  });
}

function shouldSendReminder(input: {
  preference: ReminderPreferenceLike;
  now: Date;
}) {
  const preference = getEffectivePreference(input.preference);

  if (!preference.enabled) {
    return false;
  }

  const today = getLocalDateKey({
    now: input.now,
    timezoneOffsetMinutes: preference.timezoneOffsetMinutes
  });

  if (preference.dailyReviewCompletedDate === today) {
    return false;
  }

  const reminderCountToday =
    preference.lastReminderDate === today
      ? preference.reminderCountToday
      : 0;

  if (reminderCountToday >= preference.maxPerDay) {
    return false;
  }

  if (isWithinQuietHours({ preference, now: input.now })) {
    return false;
  }

  return hasReachedReminderDelay({ preference, now: input.now });
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value);
}

async function buildDynamicNotificationPayload(
  userId: string,
  timezoneOffsetMinutes: number,
  now: Date
) {
  const timezoneOffsetMs = timezoneOffsetMinutes * 60 * 1000;
  const localNow = new Date(now.getTime() - timezoneOffsetMs);
  const startOfLocalToday = new Date(Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate(), 0, 0, 0));
  const endOfLocalToday = new Date(Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate(), 23, 59, 59, 999));

  const startOfUtcToday = new Date(startOfLocalToday.getTime() + timezoneOffsetMs);
  const endOfUtcToday = new Date(endOfLocalToday.getTime() + timezoneOffsetMs);

  const todayTransactions = await prisma.transaction.findMany({
    where: {
      userId,
      date: {
        gte: startOfUtcToday,
        lte: endOfUtcToday
      }
    }
  });

  // Jika user sudah mencatat minimal 1 transaksi hari ini, BATALKAN notifikasi
  if (todayTransactions.length > 0) {
    return null;
  }

  const todayExpenseSum = todayTransactions
    .filter((transaction) => transaction.type === "EXPENSE")
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  let availableToSpend = 0;
  try {
    const finContext = await getAiFinancialContext(userId, now);
    availableToSpend = finContext.safeToSpend.availableToSpend;
  } catch (error) {
    console.error(`Failed to fetch safe-to-spend for user ${userId}:`, error);
  }

  const formattedExpense = formatRupiah(todayExpenseSum);
  const formattedSafeToSpend = formatRupiah(availableToSpend);

  return JSON.stringify({
    title: "Review transaksi hari ini",
    body:
      todayExpenseSum > 0
        ? `Hari ini kamu belanja ${formattedExpense}, sisa Safe-to-Spend ${formattedSafeToSpend}. Catat transaksi lainnya malam ini?`
        : `Sisa Safe-to-Spend kamu ${formattedSafeToSpend}. Ada pengeluaran yang belum dicatat hari ini?`,
    icon: "/icons/pwa-192.png",
    badge: "/icons/maskable-192.png",
    tag: "sakuin-transaction-reminder",
    url: "/dashboard",
    actions: [
      {
        action: "open-review",
        title: "Review sekarang"
      },
      {
        action: "remind-later",
        title: "Nanti"
      }
    ]
  });
}

async function markReminderSent(input: {
  userId: string;
  now: Date;
  timezoneOffsetMinutes: number;
}) {
  const today = getLocalDateKey({
    now: input.now,
    timezoneOffsetMinutes: input.timezoneOffsetMinutes
  });

  const currentPreference = await getOrCreatePreference(input.userId);
  const nextCount =
    currentPreference.lastReminderDate === today
      ? currentPreference.reminderCountToday + 1
      : 1;

  await prisma.reminderPreference.update({
    where: {
      userId: input.userId
    },
    data: {
      lastReminderDate: today,
      reminderCountToday: nextCount,
      lastReminderSentAt: input.now
    }
  });
}

async function deactivateSubscription(endpoint: string) {
  await prisma.pushSubscription.updateMany({
    where: {
      endpoint
    },
    data: {
      isActive: false
    }
  });
}

function isSubscriptionGone(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const statusCode = (error as { statusCode?: unknown }).statusCode;

  return statusCode === 404 || statusCode === 410;
}

export async function runReminderCron(): Promise<RunReminderCronResult> {
  ensureVapidConfigured();

  const now = new Date();
  const preferences = await prisma.reminderPreference.findMany({
    where: {
      enabled: true
    },
    include: {
      user: {
        include: {
          pushSubscriptions: {
            where: {
              isActive: true
            }
          }
        }
      }
    }
  });

  let sentCount = 0;
  let skippedCount = 0;
  let deactivatedCount = 0;

  for (const preference of preferences) {
    if (!shouldSendReminder({ preference, now })) {
      skippedCount += 1;
      continue;
    }

    if (preference.user.pushSubscriptions.length === 0) {
      skippedCount += 1;
      continue;
    }

    const payload = await buildDynamicNotificationPayload(
      preference.userId,
      preference.timezoneOffsetMinutes,
      now
    );

    if (!payload) {
      skippedCount += 1;
      continue;
    }

    let userSentCount = 0;

    for (const subscription of preference.user.pushSubscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth
            }
          },
          payload
        );

        userSentCount += 1;
      } catch (error) {
        if (isSubscriptionGone(error)) {
          await deactivateSubscription(subscription.endpoint);
          deactivatedCount += 1;
        }
      }
    }

    if (userSentCount > 0) {
      await markReminderSent({
        userId: preference.userId,
        now,
        timezoneOffsetMinutes: preference.timezoneOffsetMinutes
      });

      sentCount += userSentCount;
    } else {
      skippedCount += 1;
    }
  }

  return {
    checkedUsers: preferences.length,
    sentCount,
    skippedCount,
    deactivatedCount
  };
}

export async function sendGenericPushNotification(
  userId: string,
  payload: { title: string; body: string; url?: string; tag?: string }
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { pushSubscriptions: true }
  });

  if (!user || user.pushSubscriptions.length === 0) {
    return false;
  }

  ensureVapidConfigured();

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: "/icons/pwa-192.png",
    badge: "/icons/maskable-192.png",
    tag: payload.tag ?? "sakuin-notification",
    url: payload.url ?? "/dashboard"
  });

  let sent = false;
  for (const subscription of user.pushSubscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth
          }
        },
        notificationPayload
      );
      sent = true;
    } catch (error) {
      if (isSubscriptionGone(error)) {
        await deactivateSubscription(subscription.endpoint);
      }
    }
  }

  return sent;
}
