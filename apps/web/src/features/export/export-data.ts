import { getLocalDateKey } from "../../lib/daily-review";

export type ExportPeriod = "month" | "quarter" | "year" | "all" | "custom";

export const EXPORT_PERIODS: Array<{ value: ExportPeriod; label: string }> = [
  { value: "month", label: "Bulan ini" },
  { value: "quarter", label: "3 bulan" },
  { value: "year", label: "Tahun ini" },
  { value: "all", label: "Semua" },
  { value: "custom", label: "Pilih tanggal" }
];

export type ExportRange = {
  /** Local YYYY-MM-DD keys; both empty means everything. */
  startKey: string | null;
  endKey: string | null;
  label: string;
};

const dayMonthFormatter = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" });
const fullFormatter = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" });

function fromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function describeRange(startKey: string, endKey: string) {
  const start = fromKey(startKey);
  const end = fromKey(endKey);

  if (startKey === endKey) {
    return fullFormatter.format(end);
  }

  const startLabel =
    start.getFullYear() === end.getFullYear() ? dayMonthFormatter.format(start) : fullFormatter.format(start);
  return `${startLabel} – ${fullFormatter.format(end)}`;
}

/** The dates a period covers, ending today; null when a custom range is not complete yet. */
export function getExportRange(
  period: ExportPeriod,
  todayKey: string,
  custom: { startKey: string; endKey: string } = { startKey: "", endKey: "" }
): ExportRange | null {
  const today = fromKey(todayKey);

  if (period === "all") {
    return { startKey: null, endKey: null, label: "Sejak mulai memakai Sakuin" };
  }

  if (period === "custom") {
    if (!custom.startKey || !custom.endKey || custom.startKey > custom.endKey) {
      return null;
    }

    return { ...custom, label: describeRange(custom.startKey, custom.endKey) };
  }

  const start =
    period === "month"
      ? new Date(today.getFullYear(), today.getMonth(), 1)
      : period === "year"
        ? new Date(today.getFullYear(), 0, 1)
        : new Date(today.getFullYear(), today.getMonth() - 3, today.getDate() + 1);
  const startKey = getLocalDateKey(start);

  return { startKey, endKey: todayKey, label: describeRange(startKey, todayKey) };
}

/** Local midnight and end of day, for counting entries the way the list shows them. */
export function rangeToIsoBounds(range: ExportRange) {
  return {
    startDate: range.startKey ? fromKey(range.startKey).toISOString() : undefined,
    endDate: range.endKey
      ? new Date(fromKey(range.endKey).getTime() + 24 * 60 * 60 * 1000 - 1).toISOString()
      : undefined
  };
}
