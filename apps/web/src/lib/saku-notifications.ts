import { LocalNotifications } from "@capacitor/local-notifications";
import type { RecurringRule } from "../features/recurring/recurring.types";
import { isNativePlatform } from "./transaction-reminder";

/**
 * The three "Kabar lain dari Saku" notifications (APK 2.1). Budget alerts and bill reminders
 * are scheduled here through Capacitor; the weekly summary runs natively because it must fetch
 * fresh numbers on Sunday evening, so this module only hands it the on/off switch.
 */
export type SakuNotificationPrefs = {
  budget: boolean;
  bills: boolean;
  weekly: boolean;
};

export type BudgetAlert = {
  categoryId: string;
  categoryName: string;
  level: 80 | 100;
  title: string;
  body: string;
};

export type PlannedReminder = {
  id: number;
  at: Date;
  title: string;
  body: string;
};

export const DEFAULT_SAKU_NOTIFICATION_PREFS: SakuNotificationPrefs = {
  budget: true,
  bills: true,
  weekly: true
};

export const SAKU_NOTIFICATION_PREFS_EVENT = "sakuin:saku-notification-prefs";

const PREFS_KEY = "sakuin_saku_notifications_v1";
const BILL_ID_START = 2000;
const BILL_ID_END = 2999;
const BUDGET_ID_START = 3000;
const BILL_REMINDER_HOUR = 9;
const BILL_LOOKAHEAD_DAYS = 62;
const MAX_OCCURRENCES_PER_RULE = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

// Ids shared with the native side (res/values/strings.xml) so both use one channel per kind.
const CHANNELS = [
  { id: "sakuin_budget", name: "Batas kategori", description: "Saat kategori sudah 80% dan saat batasnya habis" },
  { id: "sakuin_bills", name: "Tagihan besok", description: "Sehari sebelum transaksi berulang" }
];

/** Stored per phone, not per account: they decide what this phone shows. */
export function getSakuNotificationPrefs(): SakuNotificationPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<SakuNotificationPrefs>) : {};

    return {
      budget: parsed.budget ?? DEFAULT_SAKU_NOTIFICATION_PREFS.budget,
      bills: parsed.bills ?? DEFAULT_SAKU_NOTIFICATION_PREFS.bills,
      weekly: parsed.weekly ?? DEFAULT_SAKU_NOTIFICATION_PREFS.weekly
    };
  } catch {
    return DEFAULT_SAKU_NOTIFICATION_PREFS;
  }
}

/** True in APK 2.1+, which runs the weekly summary on the phone. */
export function hasNativeWeeklySummary() {
  return typeof window !== "undefined" && typeof window.AndroidWidgetBridge?.setNotificationPrefs === "function";
}

export function pushSakuNotificationPrefsToNative(prefs: SakuNotificationPrefs) {
  try {
    window.AndroidWidgetBridge?.setNotificationPrefs?.(JSON.stringify(prefs));
  } catch {
    // An older APK without the bridge simply keeps its defaults.
  }
}

export function setSakuNotificationPrefs(prefs: SakuNotificationPrefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Storage can be blocked; the switch still applies for this session.
  }

  pushSakuNotificationPrefsToNative(prefs);
  window.dispatchEvent(new Event(SAKU_NOTIFICATION_PREFS_EVENT));
}

/** "18 rb", "1,2 jt": the same short amounts the server writes in its notifications. */
export function formatShortRupiah(value: number) {
  const amount = Math.max(0, Math.round(value));

  if (amount >= 1_000_000) {
    return `${String(Math.round(amount / 100_000) / 10).replace(".", ",")} jt`;
  }

  if (amount >= 1_000) {
    return `${Math.round(amount / 1_000)} rb`;
  }

  return `${amount}`;
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Mirrors advanceOccurrenceDate in the API's recurring service.
function nextOccurrence(rule: RecurringRule, date: Date) {
  const interval = Math.max(1, rule.interval || 1);

  if (rule.frequency === "WEEKLY") {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 7 * interval);
  }

  return new Date(date.getFullYear(), date.getMonth() + interval, Math.min(rule.dayOfMonth ?? 1, 28));
}

/**
 * "Tagihan besok": one reminder at 09.00 the day before each upcoming run of an active
 * expense rule, a few runs ahead so they still fire if the app stays closed for a while.
 */
export function planBillReminders(rules: RecurringRule[], now: Date = new Date()): PlannedReminder[] {
  const reminders: PlannedReminder[] = [];
  const horizon = now.getTime() + BILL_LOOKAHEAD_DAYS * DAY_MS;

  for (const rule of rules) {
    if (!rule.isActive || rule.type !== "EXPENSE") {
      continue;
    }

    const endDate = rule.endDate ? startOfLocalDay(new Date(rule.endDate)) : null;
    let occurrence = startOfLocalDay(new Date(rule.nextRunAt));

    for (let count = 0; count < MAX_OCCURRENCES_PER_RULE; count += 1) {
      if (Number.isNaN(occurrence.getTime()) || (endDate && occurrence > endDate)) {
        break;
      }

      const at = new Date(occurrence.getFullYear(), occurrence.getMonth(), occurrence.getDate() - 1, BILL_REMINDER_HOUR);

      if (at.getTime() > horizon) {
        break;
      }

      if (at.getTime() > now.getTime() && reminders.length < BILL_ID_END - BILL_ID_START) {
        reminders.push({
          id: BILL_ID_START + reminders.length,
          at,
          title: `Besok: ${rule.note?.trim() || rule.category.name} ${formatShortRupiah(Number(rule.amount))}`,
          body: rule.autoPost
            ? "Dari transaksi berulang. Besok Sakuin mencatatnya otomatis."
            : "Dari transaksi berulang. Jangan lupa dibayar, ya."
        });
      }

      occurrence = nextOccurrence(rule, occurrence);
    }
  }

  return reminders;
}

async function canNotify() {
  if (!isNativePlatform()) {
    return false;
  }

  try {
    return (await LocalNotifications.checkPermissions()).display === "granted";
  } catch {
    return false;
  }
}

let channelsReady: Promise<void> | null = null;

function ensureChannels() {
  channelsReady ??= Promise.all(
    CHANNELS.map((channel) =>
      LocalNotifications.createChannel({ ...channel, importance: 4, visibility: 1 }).catch(() => undefined)
    )
  ).then(() => undefined);

  return channelsReady;
}

// APK 2.1 ships these as PNGs; an older APK falls back to its default icons.
const ICONS = { smallIcon: "ic_stat_saku", iconColor: "#2B63E0" };

export async function syncBillReminders(rules: RecurringRule[], enabled: boolean) {
  if (!(await canNotify())) {
    return;
  }

  try {
    const pending = await LocalNotifications.getPending();
    const stale = pending.notifications.filter((item) => item.id >= BILL_ID_START && item.id <= BILL_ID_END);

    if (stale.length > 0) {
      await LocalNotifications.cancel({ notifications: stale.map((item) => ({ id: item.id })) });
    }

    const planned = enabled ? planBillReminders(rules) : [];

    if (planned.length === 0) {
      return;
    }

    await ensureChannels();
    await LocalNotifications.schedule({
      notifications: planned.map((reminder) => ({
        id: reminder.id,
        title: reminder.title,
        body: reminder.body,
        schedule: { at: reminder.at, allowWhileIdle: true },
        channelId: "sakuin_bills",
        largeIcon: "saku_notif_happy",
        extra: { route: "/lainnya/berulang" },
        ...ICONS
      }))
    });
  } catch (error) {
    console.error("Gagal menjadwalkan pengingat tagihan", error);
  }
}

function budgetNotificationId(alert: BudgetAlert) {
  let hash = 0;

  for (const char of `${alert.categoryId}:${alert.level}`) {
    hash = (hash * 31 + char.charCodeAt(0)) % 900;
  }

  return BUDGET_ID_START + hash;
}

export async function showBudgetAlerts(alerts: BudgetAlert[]) {
  if (alerts.length === 0 || !(await canNotify())) {
    return;
  }

  try {
    await ensureChannels();
    await LocalNotifications.schedule({
      notifications: alerts.map((alert) => ({
        id: budgetNotificationId(alert),
        title: alert.title,
        body: alert.body,
        channelId: "sakuin_budget",
        largeIcon: alert.level === 100 ? "saku_notif_worried" : "saku_notif_wow",
        extra: { route: "/laporan" },
        ...ICONS
      }))
    });
  } catch (error) {
    console.error("Gagal menampilkan peringatan batas", error);
  }
}
