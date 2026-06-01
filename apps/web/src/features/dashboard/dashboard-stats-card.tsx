import { useId, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { MonthlyTrendItem, SummaryCategoryItem } from "../summary/summary.types";
import {
  formatCompactRupiah,
  getMonthLabel,
  getMonthNet,
  toNumber
} from "./dashboard-utils";
import { CategoryBreakdown, TrendChart } from "./dashboard-summary-widgets";

export type StatsRange = 3 | 6 | 12;
export type StatsMode = "cashflow" | "net";
export type StatsValueType = "nominal" | "percent";

export const DEFAULT_STATS_RANGE: StatsRange = 6;
export const DEFAULT_STATS_MODE: StatsMode = "cashflow";
export const DEFAULT_STATS_VALUE_TYPE: StatsValueType = "nominal";

export function SixMonthStatsCard({
  items,
  expenseByCategory,
  incomeByCategory,
  isLoading,
  selectedRange,
  selectedMode,
  selectedValueType,
  onRangeChange,
  onModeChange,
  onValueTypeChange
}: {
  items: MonthlyTrendItem[];
  expenseByCategory: SummaryCategoryItem[];
  incomeByCategory: SummaryCategoryItem[];
  isLoading: boolean;
  selectedRange: StatsRange;
  selectedMode: StatsMode;
  selectedValueType: StatsValueType;
  onRangeChange: (value: StatsRange) => void;
  onModeChange: (value: StatsMode) => void;
  onValueTypeChange: (value: StatsValueType) => void;
}) {
  const controlsId = useId();
  const [isControlsOpen, setIsControlsOpen] = useState(false);

  const rangedItems = useMemo(() => {
    if (items.length === 0) {
      return [];
    }

    return items.slice(-selectedRange);
  }, [items, selectedRange]);

  const analytics = useMemo(() => {
    if (rangedItems.length === 0) {
      return null;
    }

    const totalIncome = rangedItems.reduce(
      (sum, item) => sum + toNumber(item.income),
      0
    );
    const totalExpense = rangedItems.reduce(
      (sum, item) => sum + toNumber(item.expense),
      0
    );
    const totalNet = totalIncome - totalExpense;
    const positiveMonths = rangedItems.filter((item) => getMonthNet(item) >= 0).length;
    const averageExpense = totalExpense / rangedItems.length;

    const worstExpenseMonth = rangedItems.reduce((worst, current) =>
      toNumber(current.expense) > toNumber(worst.expense) ? current : worst
    );
    const bestNetMonth = rangedItems.reduce((best, current) =>
      getMonthNet(current) > getMonthNet(best) ? current : best
    );

    const firstNet = getMonthNet(rangedItems[0]);
    const latestNet = getMonthNet(rangedItems[rangedItems.length - 1]);
    const momentum =
      latestNet > firstNet ? "Membaik" : latestNet < firstNet ? "Melemah" : "Stabil";

    const recommendation =
      totalNet < 0
        ? `Arus kas ${rangedItems.length} bulan masih negatif. Prioritaskan memangkas kategori pengeluaran tertinggi.`
        : positiveMonths < Math.ceil(rangedItems.length * 0.7)
          ? "Arus kas total positif, tetapi belum konsisten. Fokus jaga pengeluaran agar bulan negatif berkurang."
          : "Arus kas sehat dan cukup konsisten. Pertahankan ritme, lalu alokasikan surplus ke goals.";

    return {
      totalNet,
      averageExpense,
      positiveMonths,
      totalMonths: rangedItems.length,
      worstExpenseMonth,
      bestNetMonth,
      momentum,
      recommendation
    };
  }, [rangedItems]);

  const maxAbsNet = useMemo(() => {
    if (rangedItems.length === 0) {
      return 1;
    }

    return Math.max(1, ...rangedItems.map((item) => Math.abs(getMonthNet(item))));
  }, [rangedItems]);

  const selectedModeLabel =
    selectedMode === "cashflow" ? "Income/Expense" : "Net";
  const selectedValueTypeLabel =
    selectedValueType === "nominal" ? "Nominal" : "Persen";

  return (
    <div className="rounded-3xl border border-[var(--sakuin-border)] bg-white p-3.5 shadow-sm sm:p-6">
      <div className="mb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-black text-[var(--sakuin-text)] sm:text-lg">
            Statistik Transaksi
          </h2>
          <span className="rounded-full bg-[var(--sakuin-primary-soft)] px-2.5 py-1 text-[10px] font-black uppercase text-[var(--sakuin-text)]">
            {rangedItems.length} bulan
          </span>
        </div>
        <p className="mt-1 text-xs font-medium text-zinc-600 sm:text-sm">
          Dashboard analitik untuk membaca pola transaksi dan arah cashflow.
        </p>
      </div>

      <div className="mb-4 rounded-2xl border border-[var(--sakuin-border)] bg-[var(--sakuin-primary-soft)] p-2">
        <button
          aria-controls={controlsId}
          aria-expanded={isControlsOpen}
          className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl bg-white px-3 text-left shadow-sm transition hover:bg-white/90 focus:outline-none focus:ring-4 focus:ring-[var(--sakuin-focus)]/25"
          onClick={() => setIsControlsOpen((current) => !current)}
          type="button"
        >
          <span className="min-w-0">
            <span className="block text-sm font-black text-[var(--sakuin-text)]">
              Pengaturan statistik
            </span>
            <span className="block truncate text-xs font-semibold text-zinc-600">
              {selectedRange} bulan - {selectedModeLabel} - {selectedValueTypeLabel}
            </span>
          </span>

          <span className="flex shrink-0 items-center gap-2">
            <span className="hidden rounded-full bg-[var(--sakuin-secondary)] px-2.5 py-1 text-[10px] font-black uppercase text-white sm:inline-flex">
              Filter
            </span>
            <ChevronDown
              className={[
                "h-4 w-4 text-[var(--sakuin-primary)] transition-transform duration-300 motion-reduce:transition-none",
                isControlsOpen ? "rotate-180" : "rotate-0"
              ].join(" ")}
            />
          </span>
        </button>

        <div
          aria-hidden={!isControlsOpen}
          className={[
            "grid overflow-hidden transition-[grid-template-rows,opacity,margin] duration-300 ease-out motion-reduce:transition-none",
            isControlsOpen
              ? "mt-2 grid-rows-[1fr] opacity-100"
              : "mt-0 grid-rows-[0fr] opacity-0"
          ].join(" ")}
          id={controlsId}
        >
          <div className="min-h-0">
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-2xl bg-white p-2 ring-1 ring-[var(--sakuin-border)]">
                <p className="mb-1 px-1 text-[10px] font-black uppercase text-zinc-500">
                  Periode
                </p>
                <div className="grid grid-cols-3 gap-1">
                  {[3, 6, 12].map((range) => (
                    <button
                      className={[
                        "rounded-lg px-2 py-1.5 text-[11px] font-black transition disabled:cursor-not-allowed disabled:opacity-60",
                        selectedRange === range
                          ? "bg-[var(--sakuin-primary)] text-white shadow-sm"
                          : "text-zinc-500 hover:bg-[var(--sakuin-primary-soft)]"
                      ].join(" ")}
                      disabled={!isControlsOpen}
                      key={range}
                      onClick={() => onRangeChange(range as StatsRange)}
                      type="button"
                    >
                      {range}M
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-2 ring-1 ring-[var(--sakuin-border)]">
                <p className="mb-1 px-1 text-[10px] font-black uppercase text-zinc-500">
                  Mode grafik
                </p>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    className={[
                      "rounded-lg px-2 py-1.5 text-[11px] font-black transition disabled:cursor-not-allowed disabled:opacity-60",
                      selectedMode === "cashflow"
                        ? "bg-[var(--sakuin-primary)] text-white shadow-sm"
                        : "text-zinc-500 hover:bg-[var(--sakuin-primary-soft)]"
                    ].join(" ")}
                    disabled={!isControlsOpen}
                    onClick={() => onModeChange("cashflow")}
                    type="button"
                  >
                    Income/Expense
                  </button>
                  <button
                    className={[
                      "rounded-lg px-2 py-1.5 text-[11px] font-black transition disabled:cursor-not-allowed disabled:opacity-60",
                      selectedMode === "net"
                        ? "bg-[var(--sakuin-primary)] text-white shadow-sm"
                        : "text-zinc-500 hover:bg-[var(--sakuin-primary-soft)]"
                    ].join(" ")}
                    disabled={!isControlsOpen}
                    onClick={() => onModeChange("net")}
                    type="button"
                  >
                    Net
                  </button>
                </div>
              </div>

              <div className="rounded-2xl bg-white p-2 ring-1 ring-[var(--sakuin-border)]">
                <p className="mb-1 px-1 text-[10px] font-black uppercase text-zinc-500">
                  Tampilan angka
                </p>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    className={[
                      "rounded-lg px-2 py-1.5 text-[11px] font-black transition disabled:cursor-not-allowed disabled:opacity-60",
                      selectedValueType === "nominal"
                        ? "bg-[var(--sakuin-primary)] text-white shadow-sm"
                        : "text-zinc-500 hover:bg-[var(--sakuin-primary-soft)]"
                    ].join(" ")}
                    disabled={!isControlsOpen}
                    onClick={() => onValueTypeChange("nominal")}
                    type="button"
                  >
                    Nominal
                  </button>
                  <button
                    className={[
                      "rounded-lg px-2 py-1.5 text-[11px] font-black transition disabled:cursor-not-allowed disabled:opacity-60",
                      selectedValueType === "percent"
                        ? "bg-[var(--sakuin-primary)] text-white shadow-sm"
                        : "text-zinc-500 hover:bg-[var(--sakuin-primary-soft)]"
                    ].join(" ")}
                    disabled={!isControlsOpen}
                    onClick={() => onValueTypeChange("percent")}
                    type="button"
                  >
                    Persen
                  </button>
                </div>
              </div>
            </div>

            <p className="mt-2 px-1 text-xs font-semibold leading-5 text-zinc-600">
              Gunakan 3M untuk kondisi terbaru, 6M untuk tren sedang, dan 12M
              untuk melihat pola setahun.
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              className="sakuin-skeleton h-[72px] rounded-2xl bg-zinc-100 ring-1 ring-[var(--sakuin-border)]"
              key={index}
            />
          ))}
        </div>
      ) : null}

      {analytics ? (
        <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
          <div className="sakuin-card-lift sakuin-stagger-enter rounded-2xl bg-[var(--sakuin-primary-soft)] p-3 ring-1 ring-[var(--sakuin-border)]">
            <p className="text-[10px] font-black uppercase text-zinc-500">
              Net {analytics.totalMonths} bulan
            </p>
            <p
              className={[
                "mt-1 text-sm font-black sm:text-base",
                analytics.totalNet >= 0 ? "text-[var(--sakuin-green)]" : "text-[var(--sakuin-red)]"
              ].join(" ")}
            >
              {formatCompactRupiah(analytics.totalNet)}
            </p>
          </div>

          <div className="sakuin-card-lift sakuin-stagger-enter rounded-2xl bg-white p-3 ring-1 ring-[var(--sakuin-border)]">
            <p className="text-[10px] font-black uppercase text-zinc-500">
              Rata-rata expense
            </p>
            <p className="mt-1 text-sm font-black text-[var(--sakuin-text)] sm:text-base">
              {formatCompactRupiah(analytics.averageExpense)}
            </p>
          </div>

          <div className="sakuin-card-lift sakuin-stagger-enter rounded-2xl bg-white p-3 ring-1 ring-[var(--sakuin-border)]">
            <p className="text-[10px] font-black uppercase text-zinc-500">Bulan positif</p>
            <p className="mt-1 text-sm font-black text-[var(--sakuin-text)] sm:text-base">
              {analytics.positiveMonths}/{analytics.totalMonths}
            </p>
          </div>

          <div className="sakuin-card-lift sakuin-stagger-enter rounded-2xl bg-white p-3 ring-1 ring-[var(--sakuin-border)]">
            <p className="text-[10px] font-black uppercase text-zinc-500">Momentum</p>
            <p className="mt-1 text-sm font-black text-[var(--sakuin-text)] sm:text-base">
              {analytics.momentum}
            </p>
          </div>
        </div>
      ) : null}

      {!isLoading && selectedMode === "cashflow" ? (
        <TrendChart items={rangedItems} />
      ) : null}
      {!isLoading && selectedMode === "cashflow" && rangedItems.length === 0 ? (
        <div className="rounded-2xl border border-[var(--sakuin-border)] bg-zinc-50 px-4 py-5 text-sm font-semibold text-zinc-600">
          Belum ada data transaksi pada periode ini.
        </div>
      ) : null}
      {selectedMode === "net" ? (
        <div className="rounded-2xl border border-[var(--sakuin-border)] bg-white p-3.5 shadow-sm sm:p-6">
          <div className="mb-4">
            <p className="text-sm font-black text-[var(--sakuin-text)]">Net Cashflow per Bulan</p>
            <p className="mt-1 text-xs font-medium text-zinc-600">
              Fokus melihat surplus/defisit tiap bulan.
            </p>
          </div>
          <div className="space-y-2">
            {!isLoading &&
              [...rangedItems].reverse().map((item) => {
              const net = getMonthNet(item);
              const percent = Math.round((Math.abs(net) / maxAbsNet) * 100);
              return (
                <div
                  className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2"
                  key={item.month}
                >
                  <p className="text-[11px] font-black text-zinc-500">
                    {getMonthLabel(item.month)}
                  </p>
                  <div className="relative h-2.5 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className={[
                        "sakuin-progress-fill relative h-full overflow-hidden rounded-full",
                        net >= 0 ? "bg-[var(--sakuin-green)]" : "bg-[var(--sakuin-red)]"
                      ].join(" ")}
                      style={{ width: `${Math.max(10, percent)}%` }}
                    >
                      <span className="sakuin-progress-shine" />
                    </div>
                  </div>
                  <p
                    className={[
                      "text-[11px] font-black",
                      net >= 0 ? "text-[var(--sakuin-green)]" : "text-[var(--sakuin-red)]"
                    ].join(" ")}
                  >
                    {selectedValueType === "nominal"
                      ? formatCompactRupiah(net)
                      : `${percent}%`}
                  </p>
                </div>
              );
            })}
            {!isLoading && rangedItems.length === 0 ? (
              <p className="text-xs font-medium text-zinc-500">
                Belum ada data net cashflow pada periode ini.
              </p>
            ) : null}
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div className="h-6 animate-pulse rounded-lg bg-zinc-100" key={index} />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {analytics ? (
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          <div className="rounded-2xl bg-white p-3 ring-1 ring-[var(--sakuin-border)]">
            <p className="text-[10px] font-black uppercase text-zinc-500">Bulan expense tertinggi</p>
            <p className="mt-1 text-sm font-black text-[var(--sakuin-text)]">
              {getMonthLabel(analytics.worstExpenseMonth.month)} -{" "}
              {formatCompactRupiah(analytics.worstExpenseMonth.expense)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-3 ring-1 ring-[var(--sakuin-border)]">
            <p className="text-[10px] font-black uppercase text-zinc-500">Bulan net terbaik</p>
            <p className="mt-1 text-sm font-black text-[var(--sakuin-text)]">
              {getMonthLabel(analytics.bestNetMonth.month)} -{" "}
              {formatCompactRupiah(getMonthNet(analytics.bestNetMonth))}
            </p>
          </div>

          <div className="rounded-2xl bg-zinc-50 p-3 ring-1 ring-[var(--sakuin-border)] sm:col-span-2">
            <p className="text-[10px] font-black uppercase text-zinc-500">Insight otomatis</p>
            <p className="mt-1.5 text-xs font-semibold leading-5 text-[var(--sakuin-text)]">
              {analytics.recommendation}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        <CategoryBreakdown
          emptyMessage="Belum ada data pengeluaran per kategori."
          items={isLoading ? [] : expenseByCategory}
          title="Kategori pengeluaran terbesar"
          tone="expense"
        />
        <CategoryBreakdown
          emptyMessage="Belum ada data pemasukan per kategori."
          items={isLoading ? [] : incomeByCategory}
          title="Sumber pemasukan terbesar"
          tone="income"
        />
      </div>

      <div className="mt-3 rounded-2xl border border-[var(--sakuin-border)] bg-white p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[10px] font-black uppercase text-zinc-500">
            Timeline Net Cashflow
          </p>
          <span className="text-[10px] font-bold text-zinc-500">
            {rangedItems.length} bulan terakhir
          </span>
        </div>
        {!isLoading && rangedItems.length > 0 ? (
          <div className="space-y-2">
            {[...rangedItems].reverse().map((item) => {
              const net = getMonthNet(item);
              const percent = Math.round((Math.abs(net) / maxAbsNet) * 100);
              return (
                <div
                  className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2"
                  key={item.month}
                >
                  <p className="text-[11px] font-black text-zinc-500">
                    {getMonthLabel(item.month)}
                  </p>
                  <div className="relative h-2.5 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className={[
                        "sakuin-progress-fill relative h-full overflow-hidden rounded-full",
                        net >= 0 ? "bg-[var(--sakuin-green)]" : "bg-[var(--sakuin-red)]"
                      ].join(" ")}
                      style={{ width: `${Math.max(10, percent)}%` }}
                    >
                      <span className="sakuin-progress-shine" />
                    </div>
                  </div>
                  <p
                    className={[
                      "text-[11px] font-black",
                      net >= 0 ? "text-[var(--sakuin-green)]" : "text-[var(--sakuin-red)]"
                    ].join(" ")}
                  >
                    {selectedValueType === "nominal"
                      ? formatCompactRupiah(net)
                      : `${percent}%`}
                  </p>
                </div>
              );
            })}
          </div>
        ) : null}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="h-6 animate-pulse rounded-lg bg-zinc-100" key={index} />
            ))}
          </div>
        ) : rangedItems.length === 0 ? (
          <p className="text-xs font-medium text-zinc-500">
            Belum ada data timeline cashflow.
          </p>
        ) : null}
      </div>
    </div>
  );
}
