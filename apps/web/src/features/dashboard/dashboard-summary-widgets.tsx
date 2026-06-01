import { useMemo } from "react";
import { ArrowDownCircle, ArrowUpCircle, Loader2 } from "lucide-react";
import type {
  MonthlyTrendItem,
  SummaryCategoryItem,
  SummaryTransaction
} from "../summary/summary.types";
import {
  formatCompactRupiah,
  formatDate,
  getMonthLabel,
  toNumber
} from "./dashboard-utils";

export function SummarySkeleton() {
  return (
    <div className="flex min-h-[11rem] items-center justify-center rounded-3xl border border-[var(--sakuin-border)] bg-white p-4 text-[var(--sakuin-text)] shadow-sm sm:min-h-[16rem] sm:p-8">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--sakuin-text)]" />
        <p className="text-sm font-semibold text-zinc-600">
          Memuat ringkasan keuangan...
        </p>
      </div>
    </div>
  );
}

export function TransactionItem({
  transaction
}: {
  transaction: SummaryTransaction;
}) {
  const isIncome = transaction.type === "INCOME";

  return (
    <div className="sakuin-card-lift sakuin-stagger-enter flex items-center justify-between gap-3 rounded-2xl border border-[var(--sakuin-border)] bg-white p-3 shadow-sm transition hover:bg-[var(--sakuin-primary-soft)] sm:gap-4 sm:p-4">
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <div
          className={
            isIncome
              ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--sakuin-green-soft)] text-[var(--sakuin-green)] ring-1 ring-[var(--sakuin-green)]/15"
              : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--sakuin-red-soft)] text-[var(--sakuin-red)] ring-1 ring-[var(--sakuin-red)]/15"
          }
        >
          {isIncome ? (
            <ArrowUpCircle className="h-5 w-5" />
          ) : (
            <ArrowDownCircle className="h-5 w-5" />
          )}
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-black text-[var(--sakuin-text)]">
            {transaction.note || transaction.category.name}
          </p>
          <p className="mt-0.5 text-xs font-medium text-zinc-500">
            {transaction.category.name} - {formatDate(transaction.date)}
          </p>
        </div>
      </div>

      <p
        className={
          isIncome
            ? "shrink-0 text-right text-xs font-black text-[var(--sakuin-green)] sm:text-sm"
            : "shrink-0 text-right text-xs font-black text-[var(--sakuin-red)] sm:text-sm"
        }
      >
        {isIncome ? "+" : "-"} {formatCompactRupiah(transaction.amount)}
      </p>
    </div>
  );
}

export function TrendChart({ items }: { items: MonthlyTrendItem[] }) {
  const maxValue = useMemo(() => {
    const values = items.flatMap((item) => [
      Math.abs(toNumber(item.income)),
      Math.abs(toNumber(item.expense))
    ]);

    return Math.max(1, ...values) * 1.15;
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-2xl bg-[var(--sakuin-primary-soft)] px-4 text-center text-sm font-medium text-zinc-600">
        Belum ada data trend bulanan.
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl border border-[var(--sakuin-border)] bg-white p-3.5 shadow-sm sm:p-6">
      <div className="absolute bottom-20 left-4 right-4 top-10 z-0 flex flex-col justify-between px-2 sm:left-6 sm:right-6">
        <div className="h-px w-full border-t border-dashed border-slate-200" />
        <div className="h-px w-full border-t border-dashed border-slate-200" />
        <div className="h-px w-full border-t border-dashed border-slate-200" />
      </div>

      <div className="relative z-10 mt-2 flex h-40 items-end justify-between gap-2 sm:h-56 sm:gap-4">
        {items.map((item) => {
          const incomeHeight = Math.max(4, (toNumber(item.income) / maxValue) * 100);
          const expenseHeight = Math.max(4, (toNumber(item.expense) / maxValue) * 100);

          return (
            <div
              className="group relative flex h-full flex-1 flex-col items-center justify-end rounded-xl transition-colors hover:bg-slate-50/80"
              key={item.month}
            >
              <div className="pointer-events-none absolute -top-16 left-1/2 z-50 mb-2 w-max -translate-x-1/2 scale-95 opacity-0 transition-all duration-300 ease-out group-hover:-translate-y-2 group-hover:scale-100 group-hover:opacity-100">
                <div className="rounded-xl border border-[var(--sakuin-border)] bg-white px-3 py-2 text-xs shadow-sm">
                  <p className="mb-1 border-b border-slate-100 pb-1 font-bold text-slate-700">
                    {getMonthLabel(item.month)}
                  </p>
                  <div className="flex flex-col gap-0.5 font-semibold">
                    <span className="text-emerald-600">
                      In: {formatCompactRupiah(item.income)}
                    </span>
                    <span className="text-rose-600">
                      Out: {formatCompactRupiah(item.expense)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex h-[85%] w-full max-w-[28px] items-end justify-center gap-1 sm:max-w-[36px] sm:gap-1.5">
                <div className="relative flex h-full w-full items-end justify-center">
                  <div
                    className="sakuin-progress-fill w-full rounded-t-md bg-[var(--sakuin-green)] opacity-75 transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:opacity-95"
                    style={{ height: `${incomeHeight}%` }}
                  />
                </div>

                <div className="relative flex h-full w-full items-end justify-center">
                  <div
                    className="sakuin-progress-fill w-full rounded-t-md bg-[var(--sakuin-red)] opacity-75 transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:opacity-95"
                    style={{ height: `${expenseHeight}%` }}
                  />
                </div>
              </div>

              <p className="mt-3 text-[11px] font-bold text-slate-400 transition-colors duration-300 group-hover:text-slate-800 sm:text-xs">
                {getMonthLabel(item.month)}
              </p>
            </div>
          );
        })}
      </div>

      <div className="relative z-10 mt-6 flex flex-wrap items-center justify-center gap-5 border-t border-slate-100 pt-5 text-xs font-bold text-slate-500">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--sakuin-green)] shadow-sm" />
          Pemasukan
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--sakuin-red)] shadow-sm" />
          Pengeluaran
        </span>
      </div>
    </div>
  );
}

export function CategoryBreakdown({
  title,
  items,
  emptyMessage,
  tone
}: {
  title: string;
  items: SummaryCategoryItem[];
  emptyMessage: string;
  tone: "expense" | "income";
}) {
  const topItems = useMemo(
    () =>
      [...items]
        .sort((first, second) => toNumber(second.totalAmount) - toNumber(first.totalAmount))
        .slice(0, 4),
    [items]
  );

  const maxAmount = useMemo(() => {
    if (topItems.length === 0) {
      return 1;
    }

    return Math.max(...topItems.map((item) => toNumber(item.totalAmount)), 1);
  }, [topItems]);

  const barToneClass =
    tone === "expense" ? "bg-[var(--sakuin-red)]" : "bg-[var(--sakuin-green)]";

  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-[var(--sakuin-border)]">
      <p className="text-[10px] font-black uppercase text-zinc-500">{title}</p>

      {topItems.length === 0 ? (
        <p className="mt-2 text-xs font-medium text-zinc-500">{emptyMessage}</p>
      ) : (
        <div className="mt-2.5 space-y-2.5">
          {topItems.map((item) => {
            const widthPercent = Math.max(
              8,
              Math.round((toNumber(item.totalAmount) / maxAmount) * 100)
            );

            return (
              <div key={item.categoryId}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-bold text-[var(--sakuin-text)]">
                    {item.categoryName}
                  </p>
                  <p className="shrink-0 text-[11px] font-black text-zinc-600">
                    {formatCompactRupiah(item.totalAmount)}
                  </p>
                </div>
                <div className="relative h-2 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className={["sakuin-progress-fill relative h-full overflow-hidden rounded-full", barToneClass].join(" ")}
                    style={{ width: `${widthPercent}%` }}
                  >
                    <span className="sakuin-progress-shine" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
