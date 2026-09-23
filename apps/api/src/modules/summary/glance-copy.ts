// Pure helpers behind the Android widget, the quick-entry window and the new notifications.
// The phone sends its UTC offset the way Date#getTimezoneOffset reports it (WIB = -420),
// because transactions are stored at local midnight of their day.

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

export const DEFAULT_TZ_OFFSET_MINUTES = -420;

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember"
];

function splitDateKey(dateKey: string) {
  const match = DATE_KEY_PATTERN.exec(dateKey);

  if (!match) {
    throw new Error(`Tanggal tidak valid: ${dateKey}`);
  }

  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/** The instant a local calendar day starts. */
export function localDayStart(dateKey: string, tzOffsetMinutes: number) {
  const { year, month, day } = splitDateKey(dateKey);

  return new Date(Date.UTC(year, month - 1, day) + tzOffsetMinutes * MINUTE_MS);
}

/** The local calendar day ("YYYY-MM-DD") an instant falls on. */
export function localDateKey(instant: Date, tzOffsetMinutes: number) {
  const local = new Date(instant.getTime() - tzOffsetMinutes * MINUTE_MS);

  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`;
}

export type LocalRange = { start: Date; end: Date };

export type LocalPeriods = {
  day: LocalRange;
  /** Monday to Sunday, so Sunday evening's summary covers the whole week. */
  week: LocalRange;
  month: LocalRange;
  monthLabel: string;
  /** Days left in the month after this one. */
  daysLeftInMonth: number;
};

export function getLocalPeriods(dateKey: string, tzOffsetMinutes: number): LocalPeriods {
  const { year, month, day } = splitDateKey(dateKey);
  const dayStart = localDayStart(dateKey, tzOffsetMinutes);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const daysSinceMonday = (weekday + 6) % 7;
  const weekStart = new Date(dayStart.getTime() - daysSinceMonday * DAY_MS);
  const monthStart = new Date(Date.UTC(year, month - 1, 1) + tzOffsetMinutes * MINUTE_MS);
  const nextMonthStart = new Date(Date.UTC(year, month, 1) + tzOffsetMinutes * MINUTE_MS);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return {
    day: { start: dayStart, end: new Date(dayStart.getTime() + DAY_MS) },
    week: { start: weekStart, end: new Date(weekStart.getTime() + 7 * DAY_MS) },
    month: { start: monthStart, end: nextMonthStart },
    monthLabel: MONTH_NAMES[month - 1] ?? "",
    daysLeftInMonth: daysInMonth - day
  };
}

/** "18 rb", "1,2 jt": the short amounts Saku uses in notifications. */
export function formatShortRupiah(value: number) {
  const amount = Math.max(0, Math.round(value));

  if (amount >= 1_000_000) {
    const millions = Math.round(amount / 100_000) / 10;

    return `${String(millions).replace(".", ",")} jt`;
  }

  if (amount >= 1_000) {
    return `${Math.round(amount / 1_000)} rb`;
  }

  return `${amount}`;
}

export type BudgetStatus = "ok" | "watch" | "over";

/** Same thresholds as the Laporan budget bars. */
export function getBudgetStatus(spent: number, limit: number): BudgetStatus {
  const ratio = limit > 0 ? spent / limit : 0;

  if (ratio > 1) {
    return "over";
  }

  return ratio >= 0.8 ? "watch" : "ok";
}

export type BudgetAlertLevel = 80 | 100;

/**
 * The threshold a new expense pushed the category over, if any. Using the crossing rather than
 * the current state means each threshold fires once per month without storing what was sent.
 */
export function getCrossedBudgetLevel(
  spentBefore: number,
  spentAfter: number,
  limit: number
): BudgetAlertLevel | null {
  if (limit <= 0 || spentAfter <= spentBefore) {
    return null;
  }

  if (spentBefore < limit && spentAfter >= limit) {
    return 100;
  }

  if (spentBefore < limit * 0.8 && spentAfter >= limit * 0.8) {
    return 80;
  }

  return null;
}

export type NotificationCopy = { title: string; body: string };

export function describeBudgetAlert(input: {
  categoryName: string;
  level: BudgetAlertLevel;
  spent: number;
  limit: number;
  daysLeftInMonth: number;
}): NotificationCopy {
  if (input.level === 100) {
    return {
      title: `Batas ${input.categoryName} sudah habis`,
      body: `Bulan ini ${formatShortRupiah(input.spent)} dari batas ${formatShortRupiah(input.limit)}.`
    };
  }

  const percent = Math.floor((input.spent / input.limit) * 100);
  const left = formatShortRupiah(input.limit - input.spent);

  return {
    title: `${input.categoryName} sudah ${percent}% dari batas`,
    body:
      input.daysLeftInMonth > 0
        ? `Sisa ${left} untuk ${input.daysLeftInMonth} hari lagi. Pelan-pelan, ya.`
        : `Sisa ${left} sampai akhir bulan. Pelan-pelan, ya.`
  };
}

export function describeWeeklySummary(input: {
  expense: number;
  count: number;
  topCategory: { categoryName: string; amount: number } | null;
}): NotificationCopy | null {
  if (input.count === 0 || input.expense <= 0) {
    return null;
  }

  return {
    title: `Minggu ini keluar ${formatShortRupiah(input.expense)}`,
    body: input.topCategory
      ? `Paling banyak buat ${input.topCategory.categoryName}: ${formatShortRupiah(input.topCategory.amount)}. Ketuk untuk lihat laporan.`
      : "Ketuk untuk lihat laporan."
  };
}
