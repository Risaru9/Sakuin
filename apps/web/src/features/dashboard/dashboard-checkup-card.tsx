import { Link } from "react-router-dom";
import { Activity, AlertTriangle, CheckCircle2, Loader2, MessageSquare } from "lucide-react";
import type { FinancialCheckupData } from "../summary/summary.types";
import {
  formatCompactRupiah,
  formatFinancialCheckupStatus,
  getFinancialCheckupStatusStyle
} from "./dashboard-utils";

export function FinancialCheckupCard({
  financialCheckup,
  isLoading
}: {
  financialCheckup: FinancialCheckupData | undefined;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="rounded-3xl border border-[var(--sakuin-border)] bg-white p-3.5 shadow-sm sm:p-6">
        <div className="flex min-h-28 items-center justify-center rounded-2xl bg-slate-50 sm:min-h-40">
          <div className="flex items-center gap-2 text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <p className="text-xs font-bold">Mengecek kondisi keuangan...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!financialCheckup) {
    return (
      <div className="rounded-3xl border border-[var(--sakuin-border)] bg-white p-3.5 shadow-sm sm:p-6">
        <div className="rounded-2xl bg-slate-50 p-3.5 sm:p-4">
          <p className="text-sm font-black text-slate-950">
            Checkup Keuangan belum tersedia
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Data checkup belum bisa dimuat. Coba refresh dashboard.
          </p>
        </div>
      </div>
    );
  }

  const style = getFinancialCheckupStatusStyle(financialCheckup.status);
  const primaryWarning = financialCheckup.warnings[0] ?? null;

  const shouldShowWarning =
    financialCheckup.status !== "GOOD" && Boolean(primaryWarning);

  const focusLabel =
    financialCheckup.focusCategoryName ?? "Belum ada fokus";

  return (
    <div
      className={[
        "rounded-3xl border p-3.5 shadow-sm sm:p-5",
        style.card
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className={["text-sm font-black sm:text-base", style.text].join(" ")}>
              Checkup Keuangan
            </p>

            <span
              className={[
                "inline-flex rounded-full px-2 py-0.5 text-[10px] font-black ring-1 sm:px-2.5 sm:py-1 sm:text-[11px]",
                style.badge
              ].join(" ")}
            >
              {formatFinancialCheckupStatus(financialCheckup.status)}
            </span>
          </div>

          <p className={["mt-1.5 text-xs font-semibold leading-5", style.muted].join(" ")}>
            {financialCheckup.headline}
          </p>
        </div>

        <div
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 animate-[sakuinFloat_3.6s_ease-in-out_infinite]",
            style.icon
          ].join(" ")}
        >
          {financialCheckup.status === "GOOD" ? (
            <CheckCircle2 className="sakuin-icon-bounce h-4.5 w-4.5 sm:h-5 sm:w-5" />
          ) : financialCheckup.status === "RISK" ? (
            <AlertTriangle className="sakuin-icon-shake h-4.5 w-4.5 sm:h-5 sm:w-5" />
          ) : (
            <Activity className="sakuin-icon-bounce h-4.5 w-4.5 sm:h-5 sm:w-5" />
          )}
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-[var(--sakuin-primary-soft)] p-3 ring-1 ring-[var(--sakuin-border)]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase text-zinc-500">
              Fokus checkup
            </p>
            <p className="mt-1 truncate text-base font-black tracking-tight text-[var(--sakuin-text)] sm:text-lg">
              {focusLabel}
            </p>
          </div>

          <p className="shrink-0 text-right text-xs font-black text-[var(--sakuin-text)]">
            {financialCheckup.focusCategoryName
              ? formatCompactRupiah(financialCheckup.focusCategoryAmount)
              : "-"}
          </p>
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2.5">
        <div className="sakuin-card-lift sakuin-stagger-enter rounded-2xl bg-white px-3 py-2.5 ring-1 ring-[var(--sakuin-border)]">
          <p className="text-[10px] font-black uppercase text-zinc-500">
            Rasio
          </p>
          <p className="mt-1 text-xs font-black text-[var(--sakuin-text)]">
            {financialCheckup.metrics.expenseToIncomeRatio === null
              ? "-"
              : `${financialCheckup.metrics.expenseToIncomeRatio}%`}
          </p>
        </div>

        <div className="sakuin-card-lift sakuin-stagger-enter rounded-2xl bg-white px-3 py-2.5 ring-1 ring-[var(--sakuin-border)]">
          <p className="text-[10px] font-black uppercase text-zinc-500">
            Cashflow
          </p>
          <p className="mt-1 truncate text-xs font-black text-[var(--sakuin-text)]">
            {formatCompactRupiah(financialCheckup.metrics.netCashflow)}
          </p>
        </div>

        <div className="sakuin-card-lift sakuin-stagger-enter rounded-2xl bg-white px-3 py-2.5 ring-1 ring-[var(--sakuin-border)]">
          <p className="text-[10px] font-black uppercase text-zinc-500">
            Sisa aman
          </p>
          <p className="mt-1 truncate text-xs font-black text-[var(--sakuin-text)]">
            {formatCompactRupiah(financialCheckup.metrics.availableToSpend)}
          </p>
        </div>

        <div className="sakuin-card-lift sakuin-stagger-enter rounded-2xl bg-white px-3 py-2.5 ring-1 ring-[var(--sakuin-border)]">
          <p className="text-[10px] font-black uppercase text-zinc-500">
            Limit
          </p>
          <p className="mt-1 truncate text-xs font-black text-[var(--sakuin-text)]">
            {financialCheckup.metrics.suggestedDailyLimit === null
              ? "-"
              : formatCompactRupiah(financialCheckup.metrics.suggestedDailyLimit)}
          </p>
        </div>
      </div>

      <div className="mt-2.5 rounded-2xl bg-zinc-50 p-3 ring-1 ring-[var(--sakuin-border)]">
        <p className="text-[10px] font-black uppercase text-zinc-500">Aksi utama</p>
        <p className="mt-1.5 text-xs font-semibold leading-5 text-[var(--sakuin-text)]">
          {financialCheckup.action}
        </p>
      </div>

      <div className="mt-2.5 rounded-2xl bg-white p-3 ring-1 ring-[var(--sakuin-border)]">
        <p className="text-[10px] font-black uppercase text-zinc-500">Kenapa status ini?</p>
        <p className="mt-1.5 text-xs font-medium leading-5 text-zinc-700">
          {financialCheckup.reason}
        </p>
      </div>

      {shouldShowWarning ? (
        <div className="mt-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3">
          <div className="flex items-start gap-2 text-xs leading-5 text-zinc-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-black text-[var(--sakuin-text)]">Perlu diperhatikan</p>
              <p className="mt-0.5 font-semibold">{primaryWarning}</p>
            </div>
          </div>
        </div>
      ) : null}

      <Link
        className="sakuin-ripple sakuin-press mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[var(--sakuin-secondary)] px-4 text-xs font-semibold text-white transition hover:bg-[var(--sakuin-secondary)] focus:outline-none focus:ring-4 focus:ring-[var(--sakuin-focus)]/25"
        to="/asisten"
      >
        <MessageSquare className="sakuin-icon-bounce h-4 w-4 text-white" />
        <span className="text-white">Bahas dengan Asisten</span>
      </Link>
    </div>
  );
}
