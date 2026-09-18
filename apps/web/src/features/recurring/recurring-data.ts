import type { RecurringRule } from "./recurring.types";

export const WEEKDAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

const WEEKS_PER_MONTH = 52 / 12;
const DAY_MS = 24 * 60 * 60 * 1000;
const monthDayFormatter = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" });
const weekdayDateFormatter = new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short" });

/** "Internet rumah" from the note, or the category name when there is no note. */
export function ruleTitle(rule: Pick<RecurringRule, "note" | "category">) {
  return rule.note?.trim() || rule.category.name;
}

/** "Tiap bulan, tanggal 5", "Tiap 2 bulan, tanggal 1", "Tiap Senin", "Tiap 2 minggu, Senin". */
export function describeSchedule(rule: Pick<RecurringRule, "frequency" | "interval" | "dayOfMonth" | "dayOfWeek">) {
  const interval = Math.max(1, rule.interval || 1);

  if (rule.frequency === "WEEKLY") {
    const day = WEEKDAY_NAMES[rule.dayOfWeek ?? 1];
    return interval === 1 ? `Tiap ${day}` : `Tiap ${interval} minggu, ${day}`;
  }

  const every = interval === 1 ? "Tiap bulan" : `Tiap ${interval} bulan`;
  return `${every}, tanggal ${rule.dayOfMonth ?? 1}`;
}

export function describeNextRun(rule: Pick<RecurringRule, "isActive" | "frequency" | "nextRunAt">) {
  if (!rule.isActive) {
    return "Dijeda";
  }

  const next = new Date(rule.nextRunAt);
  return rule.frequency === "WEEKLY" ? weekdayDateFormatter.format(next) : monthDayFormatter.format(next);
}

/** Expected money in and out per month from active rules; weekly ones count about 4,3 times. */
export function monthlyEstimate(rules: RecurringRule[]) {
  let expense = 0;
  let income = 0;

  for (const rule of rules) {
    if (!rule.isActive) {
      continue;
    }

    const interval = Math.max(1, rule.interval || 1);
    const perMonth =
      (Number(rule.amount) || 0) * (rule.frequency === "WEEKLY" ? WEEKS_PER_MONTH / interval : 1 / interval);

    if (rule.type === "INCOME") {
      income += perMonth;
    } else {
      expense += perMonth;
    }
  }

  return { expense: Math.round(expense), income: Math.round(income) };
}

/** Active rules due within the next seven days, soonest first. */
export function dueThisWeek(rules: RecurringRule[], now: Date = new Date()) {
  const until = now.getTime() + 7 * DAY_MS;

  return rules
    .filter((rule) => rule.isActive && new Date(rule.nextRunAt).getTime() <= until)
    .sort((first, second) => first.nextRunAt.localeCompare(second.nextRunAt));
}

export function weekdayOf(isoDate: string) {
  return WEEKDAY_NAMES[new Date(isoDate).getDay()];
}
