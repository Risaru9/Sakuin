import { getLocalDateKey, isDailyReviewCompletedToday } from "./daily-review";
import {
  deletePushSubscription,
  getVapidPublicKey,
  savePushSubscription
} from "../features/reminders/reminder.service";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

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
  timezoneOffsetMinutes: number;
};

type ReminderDeliveryState = {
  dateKey: string;
  count: number;
  lastSentAt: string | null;
};

type ReminderNotificationOptions = NotificationOptions & {
  actions?: Array<{
    action: string;
    title: string;
  }>;
};

const REMINDER_SETTINGS_PREFIX = "sakuin_transaction_reminder_settings_v1";
const REMINDER_DELIVERY_PREFIX = "sakuin_transaction_reminder_delivery_v1";

export const DEFAULT_TRANSACTION_REMINDER_SETTINGS: TransactionReminderSettings = {
  enabled: false,
  frequency: "EVENING",
  eveningHour: 20,
  quietStartHour: 21,
  quietEndHour: 7,
  maxPerDay: 1,
  timezoneOffsetMinutes: new Date().getTimezoneOffset()
};

const frequencyMinutes: Record<TransactionReminderFrequency, number | null> = {
  EVENING: null,
  EVERY_1_HOUR: 60,
  EVERY_2_HOURS: 120,
  EVERY_4_HOURS: 240
};

const reminderNotificationActions = [
  {
    action: "open-review",
    title: "Review sekarang"
  },
  {
    action: "remind-later",
    title: "Nanti"
  }
];

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
    maxPerDay: clampMaxPerDay(value?.maxPerDay, fallback.maxPerDay),
    timezoneOffsetMinutes: Number.isInteger(value?.timezoneOffsetMinutes)
      ? Number(value?.timezoneOffsetMinutes)
      : new Date().getTimezoneOffset()
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

export function isNativePlatform() {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

export function canUseBrowserNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function getNotificationPermission() {
  if (isNativePlatform()) {
    try {
      const status = await LocalNotifications.checkPermissions();
      return status.display === "granted" ? "granted" : (status.display === "denied" ? "denied" : "default");
    } catch {
      return "unsupported";
    }
  }

  if (!canUseBrowserNotifications()) {
    return "unsupported" as const;
  }

  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (isNativePlatform()) {
    try {
      const status = await LocalNotifications.requestPermissions();
      return status.display === "granted" ? "granted" : (status.display === "denied" ? "denied" : "default");
    } catch {
      return "unsupported";
    }
  }

  if (!canUseBrowserNotifications()) {
    return "unsupported" as const;
  }

  return Notification.requestPermission();
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

function getPushSubscriptionPayload(subscription: PushSubscription) {
  const subscriptionJson = subscription.toJSON();

  if (
    !subscriptionJson.endpoint ||
    !subscriptionJson.keys?.p256dh ||
    !subscriptionJson.keys.auth
  ) {
    throw new Error("Push subscription browser tidak lengkap.");
  }

  return {
    endpoint: subscriptionJson.endpoint,
    keys: {
      p256dh: subscriptionJson.keys.p256dh,
      auth: subscriptionJson.keys.auth
    },
    userAgent: navigator.userAgent
  };
}

async function getReadyServiceWorkerRegistration() {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Browser belum mendukung service worker.");
  }

  const existingRegistration = await navigator.serviceWorker.getRegistration();

  if (!existingRegistration) {
    await navigator.serviceWorker.register("/sw.js", {
      scope: "/"
    });
  }

  return navigator.serviceWorker.ready;
}

export async function subscribeBrowserToPushReminder() {
  if (isNativePlatform()) {
    const permission = await requestNotificationPermission();
    if (permission !== "granted") {
      throw new Error("Izin notifikasi belum diberikan.");
    }
    return; // Fallback ke Local Notifications, tak butuh langganan VAPID
  }

  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Browser belum mendukung Web Push.");
  }

  const permission = await requestNotificationPermission();

  if (permission !== "granted") {
    throw new Error("Izin notifikasi belum diberikan.");
  }

  const { publicKey } = await getVapidPublicKey();
  const registration = await getReadyServiceWorkerRegistration();
  const existingSubscription =
    await registration.pushManager.getSubscription();

  const subscription =
    existingSubscription ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    }));

  return savePushSubscription(getPushSubscriptionPayload(subscription));
}

export async function unsubscribeBrowserFromPushReminder() {
  if (isNativePlatform()) {
    await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
    return;
  }

  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    return;
  }

  await deletePushSubscription(subscription.endpoint);
  await subscription.unsubscribe();
}

export async function syncLocalHabitReminder(hasTransactionsToday: boolean, settings: TransactionReminderSettings) {
  if (!isNativePlatform()) {
    return; // Backend Cron akan menangani Web Push
  }

  try {
    if (!settings.enabled) {
      await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
      return;
    }

    const status = await LocalNotifications.checkPermissions();
    if (status.display !== "granted") return;

    const now = new Date();
    const targetHour = settings.eveningHour;

    let scheduleDate = new Date();
    scheduleDate.setHours(targetHour, 0, 0, 0);

    // Geser ke besok jika hari ini sudah lewat jamnya ATAU jika sudah ada transaksi hari ini
    if (hasTransactionsToday || scheduleDate.getTime() <= now.getTime()) {
      scheduleDate.setDate(scheduleDate.getDate() + 1);
    }

    await LocalNotifications.cancel({ notifications: [{ id: 1 }] });

    await LocalNotifications.schedule({
      notifications: [
        {
          title: "Sakuin",
          body: "Jangan lupa catat transaksi hari ini agar ritme keuanganmu tetap terjaga.",
          id: 1,
          schedule: { at: scheduleDate },
          smallIcon: "ic_stat_icon_config_sample", 
          iconColor: "#10b981"
        }
      ]
    });
  } catch (error) {
    console.error("Gagal sinkronisasi Local Notification", error);
  }
}

function buildTransactionReminderOptions(): ReminderNotificationOptions {
  return {
    body: "Ada transaksi yang belum dicatat? Cek 30 detik supaya dashboard tetap akurat.",
    icon: "/icons/pwa-192.png",
    badge: "/icons/maskable-192.png",
    tag: "sakuin-transaction-reminder",
    data: {
      url: "/dashboard"
    },
    actions: reminderNotificationActions
  };
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
  const options = buildTransactionReminderOptions();

  if ("serviceWorker" in navigator) {
    const registration = await getReadyServiceWorkerRegistration();

    if (registration.showNotification) {
      await registration.showNotification(title, options);
      markTransactionReminderSent(userId);
      return;
    }
  }

  new Notification(title, options);
  markTransactionReminderSent(userId);
}

export async function sendTestTransactionReminder() {
  const title = "Tes notifikasi Sakuin";
  const body = "Notifikasi aktif. Sakuin siap mengingatkan review transaksi sesuai pengaturanmu.";
  const options = {
    ...buildTransactionReminderOptions(),
    body,
    tag: "sakuin-transaction-reminder-test"
  };

  const permission = await getNotificationPermission();
  if (permission !== "granted") {
    const requested = await requestNotificationPermission();

    if (requested !== "granted") {
      throw new Error("Izin notifikasi belum diberikan.");
    }
  }

  if (isNativePlatform()) {
    await LocalNotifications.schedule({
      notifications: [
        {
          title,
          body,
          id: 999,
          schedule: { at: new Date(Date.now() + 1000) },
          smallIcon: "ic_stat_icon_config_sample",
          iconColor: "#10b981"
        }
      ]
    });
    return;
  }

  if ("serviceWorker" in navigator) {
    const registration = await getReadyServiceWorkerRegistration();

    if (registration.showNotification) {
      await registration.showNotification(title, options);
      return;
    }
  }

  new Notification(title, options);
}

function markTransactionReminderSent(userId: string | null | undefined) {
  const deliveryState = getDeliveryState(userId);

  setDeliveryState(userId, {
    dateKey: getLocalDateKey(),
    count: deliveryState.count + 1,
    lastSentAt: new Date().toISOString()
  });
}
