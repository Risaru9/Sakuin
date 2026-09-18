import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { BottomSheet } from "../../components/saku";
import { cn } from "../../lib/cn";
import type { MonthlyTrendItem } from "../summary/summary.types";
import {
  formatCompactAmount,
  makeMonthKey,
  MONTH_NAMES,
  MONTH_SHORT_NAMES,
  splitMonthKey
} from "./beranda-data";

type MonthPickerSheetProps = {
  open: boolean;
  onClose: () => void;
  selectedMonthKey: string;
  currentMonthKey: string;
  /** Earliest year that has data; the arrows stop there. */
  earliestYear: number;
  monthlyTrend: MonthlyTrendItem[];
  onSelect: (monthKey: string) => void;
};

function YearArrow({
  direction,
  disabled,
  onClick
}: {
  direction: "previous" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight;

  return (
    <button
      aria-label={direction === "previous" ? "Tahun sebelumnya" : "Tahun berikutnya"}
      className="saku-line-thin saku-press flex size-11 items-center justify-center rounded-full bg-white shadow-saku-xs focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30 disabled:opacity-35 disabled:shadow-none"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <Icon aria-hidden="true" className="size-[18px]" strokeWidth={2.6} />
    </button>
  );
}

export function MonthPickerSheet({
  open,
  onClose,
  selectedMonthKey,
  currentMonthKey,
  earliestYear,
  monthlyTrend,
  onSelect
}: MonthPickerSheetProps) {
  const selected = splitMonthKey(selectedMonthKey);
  const current = splitMonthKey(currentMonthKey);
  const [year, setYear] = useState(selected.year);

  useEffect(() => {
    if (open) {
      setYear(selected.year);
    }
  }, [open, selected.year]);

  const expenseByMonth = new Map(monthlyTrend.map((item) => [item.month, Number(item.expense)]));
  const firstYear = Math.min(earliestYear, selected.year, current.year);

  return (
    <BottomSheet
      onClose={onClose}
      open={open}
      subtitle="Angka kecil = total keluar bulan itu"
      title="Pilih bulan"
    >
      <div className="flex items-center justify-between">
        <YearArrow direction="previous" disabled={year <= firstYear} onClick={() => setYear(year - 1)} />
        <p aria-live="polite" className="font-saku-head text-2xl font-semibold">
          {year}
        </p>
        <YearArrow direction="next" disabled={year >= current.year} onClick={() => setYear(year + 1)} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2.5">
        {MONTH_SHORT_NAMES.map((shortName, index) => {
          const month = index + 1;
          const monthKey = makeMonthKey(year, month);
          const isFuture = monthKey > currentMonthKey;
          const isSelected = monthKey === selectedMonthKey;
          const isNow = monthKey === currentMonthKey;
          const expense = expenseByMonth.get(monthKey);
          const amountLabel = isFuture
            ? "belum"
            : expense === undefined
              ? "–"
              : expense > 0
                ? `−${formatCompactAmount(expense)}`
                : "0";

          return (
            <button
              aria-current={isNow ? "date" : undefined}
              aria-label={`${MONTH_NAMES[index]} ${year}${isFuture ? ", belum tiba" : ""}`}
              aria-pressed={isSelected}
              className={cn(
                "relative flex min-h-[70px] flex-col items-center justify-center gap-px rounded-[18px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30",
                isFuture
                  ? "cursor-default border-2 border-dashed border-saku-muted opacity-55"
                  : cn("saku-line-thin saku-press shadow-saku-xs", isSelected ? "bg-saku-coin" : "bg-saku-paper")
              )}
              disabled={isFuture}
              key={monthKey}
              onClick={() => {
                onSelect(monthKey);
                onClose();
              }}
              type="button"
            >
              <span className="font-saku-head text-[19px] font-semibold">{shortName}</span>
              <span className="text-xs font-extrabold text-saku-muted">{amountLabel}</span>
              {isNow ? (
                <span className="saku-line-hair absolute -top-2.5 left-1/2 -translate-x-1/2 -rotate-3 rounded-full bg-saku-accent px-1.5 text-[10px] font-black whitespace-nowrap text-white">
                  sekarang
                </span>
              ) : null}
              {isSelected ? (
                <span className="saku-line-hair absolute -top-2 -right-1.5 flex size-[22px] items-center justify-center rounded-full bg-saku-accent motion-safe:animate-saku-pop">
                  <Check aria-hidden="true" className="size-3 text-white" strokeWidth={3.6} />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-center text-xs font-bold text-saku-muted">
        Ketuk bulan untuk langsung membuka catatannya.
      </p>
    </BottomSheet>
  );
}
