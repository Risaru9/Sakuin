import {
  Activity,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  PiggyBank
} from "lucide-react";
import { formatRupiah } from "./dashboard-utils";
import {
  DASHBOARD_MONTH_OPTIONS,
  type DashboardPeriodMonth,
  type DashboardPeriodYear
} from "./dashboard-period";

type DashboardHeroCardProps = {
  availableYears: number[];
  balanceLabel: string;
  balanceAtRisk: boolean;
  belowSafeLimit: boolean;
  deficitAmount: number;
  displayedBalance: number;
  hasDeficit: boolean;
  isPeriodOpen: boolean;
  latestYear: number;
  onPeriodChange: (nextValues: {
    month?: DashboardPeriodMonth;
    year?: DashboardPeriodYear;
  }) => void;
  onTogglePeriod: () => void;
  periodLabel: string;
  safeBalanceLimit: string | number | null | undefined;
  selectedMonth: DashboardPeriodMonth;
  selectedYear: DashboardPeriodYear;
  totalExpense: string;
  totalIncome: string;
  transactionCount: number;
};

export function DashboardHeroCard({
  availableYears,
  balanceLabel,
  balanceAtRisk,
  belowSafeLimit,
  deficitAmount,
  displayedBalance,
  hasDeficit,
  isPeriodOpen,
  latestYear,
  onPeriodChange,
  onTogglePeriod,
  periodLabel,
  safeBalanceLimit,
  selectedMonth,
  selectedYear,
  totalExpense,
  totalIncome,
  transactionCount
}: DashboardHeroCardProps) {
  return (
    <section className="sakuin-enter relative overflow-hidden rounded-3xl border border-blue-400/25 bg-gradient-to-br from-[#173ea5] via-[var(--sakuin-primary)] to-[#3182f6] p-4 text-white shadow-[0_20px_48px_rgba(37,99,235,0.28)] sm:p-5">
      <div
        aria-hidden="true"
        className="absolute -right-16 -top-20 h-48 w-48 rounded-full border border-white/10 bg-white/[0.04]"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-20 -left-14 h-44 w-44 rounded-full bg-sky-300/10 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="absolute right-20 top-16 h-24 w-24 rounded-full bg-blue-200/10 blur-3xl"
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-white/70">
              {balanceLabel}
            </p>
            <span
              className={[
                "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black ring-1",
                balanceAtRisk
                  ? "bg-amber-300/20 text-amber-50 ring-amber-100/30"
                  : "bg-emerald-300/20 text-emerald-50 ring-emerald-100/30"
              ].join(" ")}
            >
              {balanceAtRisk ? (
                <AlertTriangle className="sakuin-icon-shake h-3 w-3" />
              ) : (
                <CheckCircle2 className="sakuin-icon-bounce h-3 w-3" />
              )}
              {balanceAtRisk ? "Waspada" : "Aman"}
            </span>
          </div>
        </div>

        <button
          aria-expanded={isPeriodOpen}
          className="sakuin-press flex min-h-9 shrink-0 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-2.5 text-left shadow-sm backdrop-blur-md transition hover:bg-white/15 focus:outline-none focus:ring-4 focus:ring-white/20 sm:min-h-10 sm:px-3"
          onClick={onTogglePeriod}
          type="button"
        >
          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-white" />
          <span className="min-w-0">
            <span className="hidden text-[9px] font-bold uppercase tracking-wide text-white/60 sm:block">
              Periode
            </span>
            <span className="block max-w-24 truncate text-[11px] font-black text-white sm:max-w-36">
              {periodLabel}
            </span>
          </span>
          <ChevronDown
            className={[
              "h-3.5 w-3.5 shrink-0 text-white/80 transition-transform duration-300 motion-reduce:transition-none",
              isPeriodOpen ? "rotate-180" : "rotate-0"
            ].join(" ")}
          />
        </button>
      </div>

      <p className="relative mt-3 truncate text-[2rem] font-black leading-none tracking-[-0.04em] text-white drop-shadow-sm sm:text-[2.6rem]">
        {formatRupiah(displayedBalance)}
      </p>
      <p
        className={[
          "relative mt-2 max-w-2xl text-xs font-semibold leading-5",
          hasDeficit ? "text-amber-100" : "text-white/70"
        ].join(" ")}
      >
        {hasDeficit
          ? `Defisit ${formatRupiah(deficitAmount)}. Pengeluaran lebih besar dari pemasukan.`
          : belowSafeLimit
            ? "Saldo berada di bawah batas aman yang kamu tentukan."
            : "Saldo masih berada di atas batas aman."}
      </p>

      {isPeriodOpen ? (
        <div className="sakuin-enter relative mt-3 rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-md">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[11px] font-black uppercase text-white/65">
                Bulan
              </span>
              <select
                className="min-h-11 w-full rounded-xl border border-white/20 bg-white px-3 text-sm font-black text-[var(--sakuin-text)] shadow-sm outline-none transition focus:ring-4 focus:ring-white/25"
                onChange={(event) => {
                  const nextMonth =
                    event.target.value === "all"
                      ? "all"
                      : (Number(event.target.value) as DashboardPeriodMonth);

                  onPeriodChange({
                    month: nextMonth,
                    year:
                      nextMonth === "all"
                        ? selectedYear
                        : selectedYear === "all"
                          ? latestYear
                          : selectedYear
                  });
                }}
                value={selectedMonth}
              >
                <option value="all">Semua bulan</option>
                {DASHBOARD_MONTH_OPTIONS.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] font-black uppercase text-white/65">
                Tahun
              </span>
              <select
                className="min-h-11 w-full rounded-xl border border-white/20 bg-white px-3 text-sm font-black text-[var(--sakuin-text)] shadow-sm outline-none transition focus:ring-4 focus:ring-white/25"
                onChange={(event) => {
                  const nextYear =
                    event.target.value === "all"
                      ? "all"
                      : Number(event.target.value);

                  onPeriodChange({
                    month: nextYear === "all" ? "all" : selectedMonth,
                    year: nextYear
                  });
                }}
                value={selectedYear}
              >
                <option value="all">Semua tahun</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <p className="mt-2 text-[11px] font-medium leading-4 text-white/65">
            Pilih semua bulan dan tahun untuk menampilkan seluruh transaksi.
          </p>
        </div>
      ) : null}

      <div className="relative mt-4 grid grid-cols-2 gap-3 border-t border-white/15 pt-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="h-4 w-4 shrink-0 text-emerald-200" />
            <p className="text-[10px] font-bold uppercase tracking-wide text-white/60">
              Pemasukan
            </p>
          </div>
          <p className="mt-1 truncate text-sm font-black text-white sm:text-base">
            {formatRupiah(totalIncome)}
          </p>
        </div>

        <div className="min-w-0 border-l border-white/15 pl-3">
          <div className="flex items-center gap-2">
            <ArrowDownCircle className="h-4 w-4 shrink-0 text-rose-200" />
            <p className="text-[10px] font-bold uppercase tracking-wide text-white/60">
              Pengeluaran
            </p>
          </div>
          <p className="mt-1 truncate text-sm font-black text-white sm:text-base">
            {formatRupiah(totalExpense)}
          </p>
        </div>
      </div>

      <div className="relative mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/15 pt-3 text-[11px] font-semibold text-white/70">
        <div className="inline-flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-blue-100" />
          <span>{transactionCount} transaksi</span>
        </div>
        <div className="inline-flex items-center gap-1.5">
          <PiggyBank className="h-3.5 w-3.5 text-blue-100" />
          <span>Batas aman {formatRupiah(safeBalanceLimit)}</span>
        </div>
      </div>
    </section>
  );
}
