import { getLocalDateKey, isDailyReviewCompletedToday } from "./daily-review";

export type TransactionReminderFrequency =
  | "EVENING"
  | "EVERY_1_HOUR"
  | "EVERY_2_HOURS"
  | "EVERY_4_HOURS";

export type TransactionReminderSettings = {
  enabled: boolean;
  frequency: TransactionReminderFrequency;
  eveningHour: number;
  quietStartHour: number;
  quietEndHour: number;
  maxPerDay: number;
};

type ReminderDeliveryState = {
  dateKey: string;
  count: number;
  lastSentAt: string | null;
};

const REMINDER_SETTINGS_PREFIX = "sakuin_transaction_reminder_settings_v1";
const REMINDER_DELIVERY_PREFIX = "sakuin_transaction_reminder_delivery_v1";

export const DEFAULT_TRANSACTION_REMINDER_SETTINGS: TransactionReminderSettings = {
  enabled: false,
  frequency: "EVENING",
  eveningHour: 20,
  quietStartHour: 21,
  quietEndHour: 7,
  maxPerDay: 1
};

const frequencyMinutes: Record<TransactionReminderFrequency, number | null> = {
  EVENING: null,
  EVERY_1_HOUR: 60,
  EVERY_2_HOURS: 120,
  EVERY_4_HOURS: 240
};

function getReminderSettingsKey(userId: string | null | undefined) {
  return `${REMINDER_SETTINGS_PREFIX}:${userId ?? "anonymous"}`;
}

function getReminderDeliveryKey(userId: string | null | undefined) {
  return `${REMINDER_DELIVERY_PREFIX}:${userId ?? "anonymous"}`;
}

function clampHour(value: unknown, fallback: number) {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue)) {
    return fallback;
  }

  return Math.min(23, Math.max(0, numberValue));
}

function clampMaxPerDay(value: unknown, fallback: number) {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue)) {
    return fallback;
  }

  return Math.min(3, Math.max(1, numberValue));
}

function normalizeReminderSettings(
  value: Partial<TransactionReminderSettings> | null
): TransactionReminderSettings {
  const fallback = DEFAULT_TRANSACTION_REMINDER_SETTINGS;
  const frequency = value?.frequency ?? fallback.frequency;
  const allowedFrequencies: TransactionReminderFrequency[] = [
    "EVENING",
    "EVERY_1_HOUR",
    "EVERY_2_HOURS",
    "EVERY_4_HOURS"
  ];

  return {
    enabled: Boolean(value?.enabled),
    frequency: allowedFrequencies.includes(frequency)
      ? frequency
      : fallback.frequency,
    eveningHour: clampHour(value?.eveningHour, fallback.eveningHour),
    quietStartHour: clampHour(value?.quietStartHour, fallback.quietStartHour),
    quietEndHour: clampHour(value?.quietEndHour, fallback.quietEndHour),
    maxPerDay: clampMaxPerDay(value?.maxPerDay, fallback.maxPerDay)
  };
}

function getDeliveryState(userId: string | null | undefined) {
  const today = getLocalDateKey();

  try {
    const rawValue = localStorage.getItem(getReminderDeliveryKey(userId));

    if (!rawValue) {
      return {
        dateKey: today,
        count: 0,
        lastSentAt: null
      };
    }

    const parsedValue = JSON.parse(rawValue) as Partial<ReminderDeliveryState>;

    if (parsedValue.dateKey !== today) {
      return {
        dateKey: today,
        count: 0,
        lastSentAt: null
      };
    }

    return {
      dateKey: today,
      count: Number(parsedValue.count ?? 0),
      lastSentAt: parsedValue.lastSentAt ?? null
    };
  } catch {
    return {
      dateKey: today,
      count: 0,
      lastSentAt: null
    };
  }
}

function setDeliveryState(
  userId: string | null | undefined,
  state: ReminderDeliveryState
) {
  try {
    localStorage.setItem(getReminderDeliveryKey(userId), JSON.stringify(state));
  } catch {
    // Ignore storage failures; reminder delivery should never break the app.
  }
}

function isWithinQuietHours(settings: TransactionReminderSettings, date: Date) {
  const currentHour = date.getHours();

  if (settings.quietStartHour === settings.quietEndHour) {
    return false;
  }

  if (settings.quietStartHour < settings.quietEndHour) {
    return (
      currentHour >= settings.quietStartHour &&
      currentHour < settings.quietEndHour
    );
  }

  return (
    currentHour >= settings.quietStartHour ||
    currentHour < settings.quietEndHour
  );
}

function hasReachedFrequencyDelay(input: {
  settings: TransactionReminderSettings;
  deliveryState: ReminderDeliveryState;
  now: Date;
}) {
  const intervalMinutes = frequencyMinutes[input.settings.frequency];

  if (intervalMinutes === null) {
    return input.now.getHours() >= input.settings.eveningHour;
  }

  if (!input.deliveryState.lastSentAt) {
    return true;
  }

  const lastSentAt = new Date(input.deliveryState.lastSentAt);

  if (Number.isNaN(lastSentAt.getTime())) {
    return true;
  }

  const elapsedMinutes =
    (input.now.getTime() - lastSentAt.getTime()) / (1000 * 60);

  return elapsedMinutes >= intervalMinutes;
}

export function getTransactionReminderSettings(
  userId: string | null | undefined
) {
  try {
    const rawValue = localStorage.getItem(getReminderSettingsKey(userId));

    if (!rawValue) {
      return DEFAULT_TRANSACTION_REMINDER_SETTINGS;
    }

    return normalizeReminderSettings(
      JSON.parse(rawValue) as Partial<TransactionReminderSettings>
    );
  } catch {
    return DEFAULT_TRANSACTION_REMINDER_SETTINGS;
  }
}

export function setTransactionReminderSettings(
  userId: string | null | undefined,
  settings: TransactionReminderSettings
) {
  const previousSettings = getTransactionReminderSettings(userId);
  const normalizedSettings = normalizeReminderSettings(settings);

  localStorage.setItem(
    getReminderSettingsKey(userId),
    JSON.stringify(normalizedSettings)
  );

  if (normalizedSettings.enabled && !previousSettings.enabled) {
    const deliveryState = getDeliveryState(userId);

    setDeliveryState(userId, {
      ...deliveryState,
      lastSentAt: new Date().toISOString()
    });
  }

  window.dispatchEvent(new Event("sakuin:transaction-reminder-settings"));
}

export function canUseBrowserNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getBrowserNotificationPermission() {
  if (!canUseBrowserNotifications()) {
    return "unsupported" as const;
  }

  return Notification.permission;
}

export async function requestBrowserNotificationPermission() {
  if (!canUseBrowserNotifications()) {
    return "unsupported" as const;
  }

  return Notification.requestPermission();
}

export function shouldSendTransactionReminder(input: {
  userId: string | null | undefined;
  settings: TransactionReminderSettings;
  now?: Date;
}) {
  const now = input.now ?? new Date();

  if (!input.settings.enabled) {
    return false;
  }

  if (getBrowserNotificationPermission() !== "granted") {
    return false;
  }

  if (isDailyReviewCompletedToday(input.userId)) {
    return false;
  }

  if (isWithinQuietHours(input.settings, now)) {
    return false;
  }

  const deliveryState = getDeliveryState(input.userId);

  if (deliveryState.count >= input.settings.maxPerDay) {
    return false;
  }

  return hasReachedFrequencyDelay({
    settings: input.settings,
    deliveryState,
    now
  });
}

export async function sendTransactionReminder(
  userId: string | null | undefined
) {
  const title = "Review transaksi hari ini";
  const options: NotificationOptions = {
    body: "Ada transaksi yang belum dicatat? Cek 30 detik supaya dashboard tetap akurat.",
    icon: "/icons/pwa-192.png",
    badge: "/icons/maskable-192.png",
    tag: "sakuin-transaction-reminder",
    data: {
      url: "/dashboard"
    }
  };

  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();

    if (registration?.showNotification) {
      await registration.showNotification(title, options);
      markTransactionReminderSent(userId);
      return;
    }
  }

  new Notification(title, options);
  markTransactionReminderSent(userId);
}

function markTransactionReminderSent(userId: string | null | undefined) {
  const deliveryState = getDeliveryState(userId);

  setDeliveryState(userId, {
    dateKey: getLocalDateKey(),
    count: deliveryState.count + 1,
    lastSentAt: new Date().toISOString()
  });
}
