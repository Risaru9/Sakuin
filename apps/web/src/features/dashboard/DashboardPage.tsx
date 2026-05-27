import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  Loader2,
  MessageSquare,
  PiggyBank,
  Plus,
  Settings
} from "lucide-react";
import { AppShell } from "../../components/layout/AppShell";
import { Button } from "../../components/ui/button";
import { ApiClientError } from "../../lib/api-client";
import {
  getDailyReviewStorageKey,
  getLocalDateKey,
  getStoredDailyReviewDate,
  setStoredDailyReviewDate
} from "../../lib/daily-review";
import { queryKeys } from "../../lib/query-keys";
import { useAuth } from "../auth/auth-context";
import { getGoals } from "../goals/goal.service";
import type { Goal } from "../goals/goal.types";
import {
  clearDashboardPriorityGoalId,
  getDashboardPriorityGoalId
} from "../goals/dashboard-goal-priority";
import { getSummary } from "../summary/summary.service";
import type {
  FinancialCheckupData,
  MonthlyTrendItem,
  SafeToSpendData,
  SummaryHabitData,
  SummaryTransaction
} from "../summary/summary.types";
import { AddTransactionModal } from "../transactions/AddTransactionModal";
import { QuickTransactionModal } from "../transactions/QuickTransactionModal";
import { getUserProfile } from "../profile/profile.service";
import { completeRemoteDailyReview } from "../reminders/reminder.service";

function getErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Terjadi kesalahan.";
}

function toNumber(value: string | number | null | undefined) {
  const numberValue = Number(value ?? 0);

  if (Number.isNaN(numberValue)) {
    return 0;
  }

  return numberValue;
}

function formatRupiah(value: string | number | null | undefined) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(toNumber(value));
}

function formatCompactRupiah(value: string | number | null | undefined) {
  const numberValue = toNumber(value);

  if (numberValue >= 1_000_000) {
    return `Rp ${(numberValue / 1_000_000).toLocaleString("id-ID", {
      maximumFractionDigits: 1
    })} jt`;
  }

  if (numberValue >= 1_000) {
    return `Rp ${(numberValue / 1_000).toLocaleString("id-ID", {
      maximumFractionDigits: 0
    })} rb`;
  }

  return formatRupiah(numberValue);
}

function formatSafeToSpendStatus(status: SafeToSpendData["status"]) {
  if (status === "SAFE") {
    return "Aman";
  }

  if (status === "WATCH") {
    return "Waspada";
  }

  if (status === "HOLD") {
    return "Tahan";
  }

  return "Belum bisa dinilai";
}

function formatSpendingPaceStatus(status: SafeToSpendData["spendingPaceStatus"]) {
  if (status === "ON_TRACK") {
    return "Sesuai ritme";
  }

  if (status === "WATCH") {
    return "Perlu dipantau";
  }

  if (status === "FAST") {
    return "Terlalu cepat";
  }

  return "Belum bisa dinilai";
}

function getSafeToSpendStatusStyle(status: SafeToSpendData["status"]) {
  if (status === "SAFE") {
    return {
      card: "border-[var(--sakuin-border)] bg-white",
      badge: "bg-emerald-100 text-emerald-700 ring-emerald-200",
      icon: "bg-emerald-600 text-white",
      text: "text-[var(--sakuin-text)]",
      muted: "text-zinc-600"
    };
  }

  if (status === "WATCH") {
    return {
      card: "border-[var(--sakuin-border)] bg-white",
      badge: "bg-amber-100 text-amber-800 ring-amber-200",
      icon: "bg-[var(--sakuin-amber)] text-white",
      text: "text-[var(--sakuin-text)]",
      muted: "text-zinc-600"
    };
  }

  if (status === "HOLD") {
    return {
      card: "border-rose-200 bg-white",
      badge: "bg-rose-100 text-rose-700 ring-rose-200",
      icon: "bg-rose-600 text-white",
      text: "text-[var(--sakuin-text)]",
      muted: "text-zinc-600"
    };
  }

  return {
    card: "border-[var(--sakuin-border)] bg-white",
    badge: "bg-slate-100 text-slate-700 ring-slate-200",
    icon: "bg-slate-700 text-white",
    text: "text-[var(--sakuin-text)]",
    muted: "text-zinc-600"
  };
}

function formatFinancialCheckupStatus(status: FinancialCheckupData["status"]) {
  if (status === "GOOD") {
    return "Baik";
  }

  if (status === "WATCH") {
    return "Waspada";
  }

  if (status === "RISK") {
    return "Berisiko";
  }

  return "Belum lengkap";
}

function getFinancialCheckupStatusStyle(status: FinancialCheckupData["status"]) {
  if (status === "GOOD") {
    return {
      card: "border-[var(--sakuin-border)] bg-white",
      badge: "bg-emerald-100 text-emerald-700 ring-emerald-200",
      icon: "bg-emerald-600 text-white",
      text: "text-[var(--sakuin-text)]",
      muted: "text-zinc-600"
    };
  }

  if (status === "WATCH") {
    return {
      card: "border-[var(--sakuin-border)] bg-white",
      badge: "bg-amber-100 text-amber-800 ring-amber-200",
      icon: "bg-[var(--sakuin-amber)] text-white",
      text: "text-[var(--sakuin-text)]",
      muted: "text-zinc-600"
    };
  }

  if (status === "RISK") {
    return {
      card: "border-rose-200 bg-white",
      badge: "bg-rose-100 text-rose-700 ring-rose-200",
      icon: "bg-rose-600 text-white",
      text: "text-[var(--sakuin-text)]",
      muted: "text-zinc-600"
    };
  }

  return {
    card: "border-[var(--sakuin-border)] bg-white",
    badge: "bg-slate-100 text-slate-700 ring-slate-200",
    icon: "bg-slate-700 text-white",
    text: "text-[var(--sakuin-text)]",
    muted: "text-zinc-600"
  };
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function formatGoalDeadline(value: string | null) {
  if (!value) {
    return "Tanpa deadline";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Tanpa deadline";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function getMonthLabel(value: string) {
  const date = new Date(`${value}-01T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    month: "short"
  }).format(date);
}

function getGoalProgress(goal: Goal) {
  const targetAmount = toNumber(goal.targetAmount);
  const currentAmount = toNumber(goal.currentAmount);

  if (targetAmount <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((currentAmount / targetAmount) * 100));
}

function getPriorityGoal(goals: Goal[], priorityGoalId: string | null) {
  if (goals.length === 0) {
    return null;
  }

  if (priorityGoalId) {
    const selectedGoal = goals.find((goal) => goal.id === priorityGoalId);

    if (selectedGoal) {
      return selectedGoal;
    }
  }

  const unfinishedGoals = goals.filter((goal) => getGoalProgress(goal) < 100);
  const candidateGoals = unfinishedGoals.length > 0 ? unfinishedGoals : goals;

  return [...candidateGoals].sort((firstGoal, secondGoal) => {
    const firstDeadline = firstGoal.deadline
      ? new Date(firstGoal.deadline).getTime()
      : Number.POSITIVE_INFINITY;

    const secondDeadline = secondGoal.deadline
      ? new Date(secondGoal.deadline).getTime()
      : Number.POSITIVE_INFINITY;

    if (firstDeadline !== secondDeadline) {
      return firstDeadline - secondDeadline;
    }

    return getGoalProgress(secondGoal) - getGoalProgress(firstGoal);
  })[0];
}

function SummarySkeleton() {
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

function TransactionItem({ transaction }: { transaction: SummaryTransaction }) {
  const isIncome = transaction.type === "INCOME";

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--sakuin-border)] bg-white p-3 shadow-sm transition hover:bg-[var(--sakuin-primary-soft)] sm:gap-4 sm:p-4">
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <div
          className={
            isIncome
              ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--sakuin-green)] text-white"
              : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--sakuin-red)] text-white"
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

function TrendChart({ items }: { items: MonthlyTrendItem[] }) {
  const maxValue = useMemo(() => {
    const values = items.flatMap((item) => [
      Math.abs(toNumber(item.income)),
      Math.abs(toNumber(item.expense))
    ]);

    // Menambahkan ekstra ruang 15% di atas agar batang tertinggi tidak menyentuh atap
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
      
      {/* Garis Bantu (Grid) Latar Belakang */}
      <div className="absolute left-4 right-4 top-10 bottom-20 z-0 flex flex-col justify-between px-2 sm:left-6 sm:right-6">
        <div className="h-px w-full border-t border-dashed border-slate-200"></div>
        <div className="h-px w-full border-t border-dashed border-slate-200"></div>
        <div className="h-px w-full border-t border-dashed border-slate-200"></div>
      </div>

      <div className="relative z-10 mt-2 flex h-40 items-end justify-between gap-2 sm:h-56 sm:gap-4">
        {items.map((item) => {
          // Minimal height 4% agar data yang sangat kecil tetap terlihat
          const incomeHeight = Math.max(4, (toNumber(item.income) / maxValue) * 100);
          const expenseHeight = Math.max(4, (toNumber(item.expense) / maxValue) * 100);

          return (
            <div
              className="group relative flex h-full flex-1 flex-col items-center justify-end rounded-xl transition-colors hover:bg-slate-50/80"
              key={item.month}
            >
              {/* Tooltip Melayang Bergaya Glassmorphism */}
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

              {/* Area Bar (Batang) */}
              <div className="flex h-[85%] w-full max-w-[28px] items-end justify-center gap-1 sm:max-w-[36px] sm:gap-1.5">
                
                {/* Batang Pemasukan */}
                <div className="relative flex h-full w-full items-end justify-center">
                  <div
                    className="w-full rounded-t-md bg-[var(--sakuin-green)] opacity-90 transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:opacity-100"
                    style={{ height: `${incomeHeight}%` }}
                  />
                </div>

                {/* Batang Pengeluaran */}
                <div className="relative flex h-full w-full items-end justify-center">
                  <div
                    className="w-full rounded-t-md bg-[var(--sakuin-red)] opacity-90 transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:opacity-100"
                    style={{ height: `${expenseHeight}%` }}
                  />
                </div>

              </div>

              {/* Label Bulan */}
              <p className="mt-3 text-[11px] font-bold text-slate-400 transition-colors duration-300 group-hover:text-slate-800 sm:text-xs">
                {getMonthLabel(item.month)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Legend */}
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

function DashboardGoalsCard({
  goals,
  isLoading,
  error,
  priorityGoalId
}: {
  goals: Goal[];
  isLoading: boolean;
  error: string | null;
  priorityGoalId: string | null;
}) {
  const priorityGoal = getPriorityGoal(goals, priorityGoalId);
  const isUserSelectedPriority = Boolean(
    priorityGoalId && priorityGoal?.id === priorityGoalId
  );

  return (
    <div className="rounded-3xl border border-[var(--sakuin-border)] bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-[var(--sakuin-text)]">
            Goals Tabungan
          </h2>
          <p className="mt-1 text-xs font-medium text-zinc-600">
            Ringkasan target tabungan aktif.
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--sakuin-primary)] text-white">
          <PiggyBank className="h-5 w-5" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-32 items-center justify-center rounded-2xl bg-slate-50">
          <div className="flex items-center gap-2 text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <p className="text-xs font-bold">Mengambil goals...</p>
          </div>
        </div>
      ) : null}

      {!isLoading && error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          <div className="flex gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="text-sm font-black">Goals gagal dimuat</p>
              <p className="mt-1 text-xs font-medium">{error}</p>
            </div>
          </div>
        </div>
      ) : null}

      {!isLoading && !error && !priorityGoal ? (
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-black text-slate-950">
            Belum ada goal aktif
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Tambahkan target tabungan pertama kamu dari halaman Goals.
          </p>

          <Link
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--sakuin-secondary)] px-4 text-xs font-black shadow-sm transition hover:bg-[var(--sakuin-secondary)] focus:outline-none focus:ring-4 focus:ring-[var(--sakuin-focus)]/25"
            to="/goals"
          >
            <span className="text-white">Buka Goals</span>
          </Link>
        </div>
      ) : null}

      {!isLoading && !error && priorityGoal ? (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-950">
                {priorityGoal.name}
              </p>

              <p className="mt-1 text-[11px] font-black text-[var(--sakuin-text)]">
                {isUserSelectedPriority
                  ? "Prioritas pilihanmu"
                  : "Rekomendasi otomatis"}
              </p>

              <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatGoalDeadline(priorityGoal.deadline)}
              </p>
            </div>

            <span className="shrink-0 rounded-full bg-[var(--sakuin-primary-soft)] px-3 py-1 text-xs font-black text-[var(--sakuin-text)]">
              {getGoalProgress(priorityGoal)}%
            </span>
          </div>

          <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-500">
            <span>{formatCompactRupiah(priorityGoal.currentAmount)}</span>
            <span>{formatCompactRupiah(priorityGoal.targetAmount)}</span>
          </div>

          <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-[var(--sakuin-primary)]"
              style={{
                width: `${getGoalProgress(priorityGoal)}%`
              }}
            />
          </div>

          <Link
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--sakuin-secondary)] px-4 text-xs font-black shadow-sm transition hover:bg-[var(--sakuin-secondary)] focus:outline-none focus:ring-4 focus:ring-[var(--sakuin-focus)]/25"
            to="/goals"
          >
            <span className="text-white">Kelola Goals</span>
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function SafeToSpendCard({
  safeToSpend,
  isLoading
}: {
  safeToSpend: SafeToSpendData | undefined;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="rounded-3xl border border-[var(--sakuin-border)] bg-white p-3.5 shadow-sm sm:p-6">
        <div className="flex min-h-28 items-center justify-center rounded-2xl bg-slate-50 sm:min-h-40">
          <div className="flex items-center gap-2 text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <p className="text-xs font-bold">Menghitung aman dipakai...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!safeToSpend) {
    return (
      <div className="rounded-3xl border border-[var(--sakuin-border)] bg-white p-3.5 shadow-sm sm:p-6">
        <div className="rounded-2xl bg-slate-50 p-3.5 sm:p-4">
          <p className="text-sm font-black text-slate-950">
            Aman Dipakai belum tersedia
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Data safe-to-spend belum bisa dimuat. Coba refresh dashboard.
          </p>
        </div>
      </div>
    );
  }

  const style = getSafeToSpendStatusStyle(safeToSpend.status);
  const hasDailyLimit = safeToSpend.suggestedDailyLimit !== null;
  const primaryWarning = safeToSpend.warnings[0] ?? null;

  const headline =
    safeToSpend.status === "SAFE"
      ? "Masih aman dipakai dengan tetap menjaga batas aman."
      : safeToSpend.status === "WATCH"
        ? "Masih bisa dipakai, tapi perlu dipantau."
        : safeToSpend.status === "HOLD"
          ? "Tahan pengeluaran non-prioritas dulu."
          : "Catat transaksi dulu agar batas aman bisa dihitung.";

  const shouldShowWarning =
    safeToSpend.status !== "SAFE" && Boolean(primaryWarning);

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
              Aman Dipakai
            </p>

            <span
              className={[
                "inline-flex rounded-full px-2 py-0.5 text-[10px] font-black ring-1 sm:px-2.5 sm:py-1 sm:text-[11px]",
                style.badge
              ].join(" ")}
            >
              {formatSafeToSpendStatus(safeToSpend.status)}
            </span>
          </div>

          <p className={["mt-1.5 text-xs font-semibold leading-5", style.muted].join(" ")}>
            {headline}
          </p>
        </div>

        <div
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10",
            style.icon
          ].join(" ")}
        >
          {safeToSpend.status === "SAFE" ? (
            <CheckCircle2 className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
          ) : safeToSpend.status === "HOLD" ? (
            <AlertTriangle className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
          ) : (
            <Activity className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-[var(--sakuin-primary-soft)] p-3 ring-1 ring-[var(--sakuin-border)]">
          <p className="text-[10px] font-black uppercase text-zinc-500">
            Sisa aman
          </p>
          <p className="mt-1 truncate text-lg font-black tracking-tight text-[var(--sakuin-text)] sm:text-xl">
            {formatCompactRupiah(safeToSpend.availableToSpend)}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-3 ring-1 ring-[var(--sakuin-border)]">
          <p className="text-[10px] font-black uppercase text-zinc-500">
            Limit harian
          </p>
          <p className="mt-1 truncate text-lg font-black tracking-tight text-[var(--sakuin-text)] sm:text-xl">
            {hasDailyLimit
              ? formatCompactRupiah(safeToSpend.suggestedDailyLimit)
              : "-"}
          </p>
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-white px-3 py-2.5 ring-1 ring-[var(--sakuin-border)]">
          <p className="text-[10px] font-black uppercase text-zinc-500">
            Ritme
          </p>
          <p className="mt-1 truncate text-xs font-black text-[var(--sakuin-text)]">
            {formatSpendingPaceStatus(safeToSpend.spendingPaceStatus)}
          </p>
        </div>

        <div className="rounded-2xl bg-white px-3 py-2.5 ring-1 ring-[var(--sakuin-border)]">
          <p className="text-[10px] font-black uppercase text-zinc-500">
            Fokus
          </p>
          <p className="mt-1 truncate text-xs font-black text-[var(--sakuin-text)]">
            {safeToSpend.topRiskCategoryName ?? "Belum ada"}
          </p>
        </div>
      </div>

      <div className="mt-2.5 rounded-2xl bg-zinc-50 p-3 ring-1 ring-[var(--sakuin-border)]">
        <p className="text-[10px] font-black uppercase text-zinc-500">Aksi utama</p>
        <p className="mt-1.5 text-xs font-semibold leading-5 text-[var(--sakuin-text)]">
          {safeToSpend.action}
        </p>
      </div>

      <div className="mt-2.5 rounded-2xl bg-white p-3 ring-1 ring-[var(--sakuin-border)]">
        <p className="text-[10px] font-black uppercase text-zinc-500">Kenapa status ini?</p>
        <p className="mt-1.5 text-xs font-medium leading-5 text-zinc-700">
          {safeToSpend.reason}
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
        className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[var(--sakuin-secondary)] px-4 text-xs font-semibold text-white transition hover:bg-[var(--sakuin-secondary)] focus:outline-none focus:ring-4 focus:ring-[var(--sakuin-focus)]/25"
        to="/asisten"
      >
        <MessageSquare className="h-4 w-4 text-white" />
        <span className="text-white">Tanya Asisten</span>
      </Link>
    </div>
  );
}

function FinancialCheckupCard({
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
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10",
            style.icon
          ].join(" ")}
        >
          {financialCheckup.status === "GOOD" ? (
            <CheckCircle2 className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
          ) : financialCheckup.status === "RISK" ? (
            <AlertTriangle className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
          ) : (
            <Activity className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
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
        <div className="rounded-2xl bg-white px-3 py-2.5 ring-1 ring-[var(--sakuin-border)]">
          <p className="text-[10px] font-black uppercase text-zinc-500">
            Rasio
          </p>
          <p className="mt-1 text-xs font-black text-[var(--sakuin-text)]">
            {financialCheckup.metrics.expenseToIncomeRatio === null
              ? "-"
              : `${financialCheckup.metrics.expenseToIncomeRatio}%`}
          </p>
        </div>

        <div className="rounded-2xl bg-white px-3 py-2.5 ring-1 ring-[var(--sakuin-border)]">
          <p className="text-[10px] font-black uppercase text-zinc-500">
            Cashflow
          </p>
          <p className="mt-1 truncate text-xs font-black text-[var(--sakuin-text)]">
            {formatCompactRupiah(financialCheckup.metrics.netCashflow)}
          </p>
        </div>

        <div className="rounded-2xl bg-white px-3 py-2.5 ring-1 ring-[var(--sakuin-border)]">
          <p className="text-[10px] font-black uppercase text-zinc-500">
            Sisa aman
          </p>
          <p className="mt-1 truncate text-xs font-black text-[var(--sakuin-text)]">
            {formatCompactRupiah(financialCheckup.metrics.availableToSpend)}
          </p>
        </div>

        <div className="rounded-2xl bg-white px-3 py-2.5 ring-1 ring-[var(--sakuin-border)]">
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
        className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[var(--sakuin-secondary)] px-4 text-xs font-semibold text-white transition hover:bg-[var(--sakuin-secondary)] focus:outline-none focus:ring-4 focus:ring-[var(--sakuin-focus)]/25"
        to="/asisten"
      >
        <MessageSquare className="h-4 w-4 text-white" />
        <span className="text-white">Bahas dengan Asisten</span>
      </Link>
    </div>
  );
}

const DASHBOARD_SUMMARY_STALE_TIME = 60_000;
const DASHBOARD_GOALS_STALE_TIME = 60_000;
const DASHBOARD_PROFILE_STALE_TIME = 5 * 60_000;

function clampPercent(value: number | null | undefined) {
  return Math.min(Math.max(toNumber(value), 0), 100);
}

type DailyReviewPrimaryTarget = "quick" | "complete" | "assistant";

function formatCompletionStatus(
  status: SummaryHabitData["completionStatus"] | undefined
) {
  if (status === "STARTED") {
    return "Berjalan";
  }

  if (status === "REVIEW_READY") {
    return "Review";
  }

  if (status === "STRONG_DAY") {
    return "Kuat";
  }

  return "Mulai";
}

function getPrimaryActionTarget(
  action: SummaryHabitData["recommendedAction"] | undefined
): DailyReviewPrimaryTarget {
  if (action === "REVIEW_TODAY") {
    return "complete";
  }

  if (action === "ASK_ASSISTANT") {
    return "assistant";
  }

  return "quick";
}

function getDailyReviewActionLabel(
  action: SummaryHabitData["recommendedAction"] | undefined
) {
  if (action === "REVIEW_TODAY") {
    return "Review 30 detik";
  }

  if (action === "ASK_ASSISTANT") {
    return "Bahas dengan Asisten";
  }

  if (action === "CONTINUE_TRACKING") {
    return "Tambah lagi";
  }

  return "Catat transaksi";
}

function getFallbackHabitMessage(habit: SummaryHabitData) {
  if (habit.transactionsToday > 0) {
    return {
      title: `Hari ini kamu sudah mencatat ${habit.transactionsToday} transaksi.`,
      description:
        habit.expenseTransactionsToday > 0
          ? `${habit.expenseTransactionsToday} pengeluaran hari ini sudah tercatat. Cek sebentar, lalu tandai lengkap kalau tidak ada yang terlewat.`
          : "Data hari ini sudah mulai terisi. Cek sebentar, lalu tandai lengkap kalau tidak ada yang terlewat."
    };
  }

  if (habit.habitStatus === "STALE") {
    return {
      title: "Belum ada catatan hari ini.",
      description:
        habit.daysSinceLastTransaction === null
          ? "Catat 1 transaksi kecil dulu agar insight hari ini mulai terbentuk."
          : "Tidak apa-apa kalau sempat terlewat. Lanjutkan lagi hari ini dengan 1 catatan kecil."
    };
  }

  if (habit.habitStatus === "NO_DATA") {
    return {
      title: "Belum ada catatan hari ini.",
      description:
        "Catat 1 transaksi kecil dulu agar insight hari ini mulai terbentuk."
    };
  }

  return {
    title: "Review harian 30 detik",
    description:
      habit.habitMessage ||
      "Review sebentar agar dashboard tetap akurat dan mudah dibaca."
  };
}

function getDailyReviewContent(habit: SummaryHabitData | null | undefined) {
  if (!habit) {
    return {
      statusLabel: "Review",
      title: "Review harian 30 detik",
      message:
        "Ada transaksi hari ini yang belum masuk? Catat sekarang supaya dashboard tetap akurat.",
      primaryAction: "Catat transaksi",
      recommendedAction: "ADD_TRANSACTION" as const,
      primaryTarget: "quick" as const
    };
  }

  const message = habit.habitMessageDetail ?? getFallbackHabitMessage(habit);
  const recommendedAction = habit.recommendedAction ?? "ADD_TRANSACTION";

  return {
    statusLabel: formatCompletionStatus(habit.completionStatus),
    title: message.title,
    message: message.description,
    primaryAction: getDailyReviewActionLabel(recommendedAction),
    recommendedAction,
    primaryTarget: getPrimaryActionTarget(recommendedAction)
  };
}

function formatHabitMetric(value: number, suffix = "") {
  if (value <= 0) {
    return "-";
  }

  return `${value}${suffix}`;
}

function DailyReviewCard({
  completed,
  habit,
  onComplete,
  onOpenQuickTransaction
}: {
  completed: boolean;
  habit?: SummaryHabitData | null;
  onComplete: () => void;
  onOpenQuickTransaction: () => void;
}) {
  if (completed) {
    return null;
  }

  const content = getDailyReviewContent(habit);
  const completionPercent = clampPercent(
    habit?.currentMonthCompletenessPercent ?? 0
  );

  return (
    <section className="mb-4 rounded-3xl border border-[var(--sakuin-border)] bg-[var(--sakuin-primary-soft)] p-3.5 shadow-sm sm:mb-5 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
        <div className="flex min-w-0 flex-1 gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--sakuin-primary)] text-white">
            <Clock3 className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-black text-[var(--sakuin-text)]">
                {content.title}
              </p>
              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase text-[var(--sakuin-primary)] ring-1 ring-[var(--sakuin-border)]">
                {content.statusLabel}
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold leading-5 text-[var(--sakuin-muted)] sm:text-sm sm:leading-6">
              {content.message}
            </p>

            {habit ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="rounded-2xl bg-white/70 p-2.5 ring-1 ring-[var(--sakuin-border)]">
                  <div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase text-[var(--sakuin-muted)]">
                    <span>Hari tercatat</span>
                    <span>
                      {habit.currentMonthTransactionDays}/
                      {habit.currentMonthDaysElapsed}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-900/10">
                    <div
                      className="h-full rounded-full bg-[var(--sakuin-primary)] transition-[width]"
                      style={{ width: `${completionPercent}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:min-w-64">
                  <div className="rounded-2xl bg-white/70 px-3 py-2 ring-1 ring-[var(--sakuin-border)]">
                    <p className="text-[10px] font-black uppercase text-[var(--sakuin-muted)]">
                      Hari ini
                    </p>
                    <p className="mt-0.5 text-sm font-black text-[var(--sakuin-text)]">
                      {habit.todayTransactionCount ?? habit.transactionsToday}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/70 px-3 py-2 ring-1 ring-[var(--sakuin-border)]">
                    <p className="text-[10px] font-black uppercase text-[var(--sakuin-muted)]">
                      Streak
                    </p>
                    <p className="mt-0.5 text-sm font-black text-[var(--sakuin-text)]">
                      {formatHabitMetric(habit.currentStreakDays, "h")}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/70 px-3 py-2 ring-1 ring-[var(--sakuin-border)]">
                    <p className="text-[10px] font-black uppercase text-[var(--sakuin-muted)]">
                      Minggu
                    </p>
                    <p className="mt-0.5 text-sm font-black text-[var(--sakuin-text)]">
                      {formatHabitMetric(habit.weeklyActiveDays, "h")}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-2 sm:flex sm:shrink-0 sm:items-center">
          {content.primaryTarget === "assistant" ? (
            <Link
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--sakuin-primary)] px-4 text-sm font-bold text-white transition hover:bg-[var(--sakuin-secondary)] focus:outline-none focus:ring-4 focus:ring-[var(--sakuin-focus)]/25"
              to="/asisten"
            >
              <MessageSquare className="h-4 w-4" />
              {content.primaryAction}
            </Link>
          ) : (
            <Button
              className="rounded-xl bg-[var(--sakuin-primary)] text-white hover:bg-[var(--sakuin-secondary)] focus-visible:ring-[var(--sakuin-focus)]"
              onClick={
                content.primaryTarget === "complete"
                  ? onComplete
                  : onOpenQuickTransaction
              }
              size="md"
              type="button"
            >
              {content.primaryTarget === "complete" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <MessageSquare className="h-4 w-4" />
              )}
              {content.primaryAction}
            </Button>
          )}

          <Button
            className="rounded-xl border-[var(--sakuin-border)] bg-white text-[var(--sakuin-text)] hover:bg-[var(--sakuin-primary-soft)] focus-visible:ring-[var(--sakuin-focus)]"
            onClick={
              content.primaryTarget === "complete"
                ? onOpenQuickTransaction
                : onComplete
            }
            size="md"
            type="button"
            variant="secondary"
          >
            {content.primaryTarget === "complete" ? (
              <MessageSquare className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {content.primaryTarget === "complete" ? "Catat lagi" : "Sudah lengkap"}
          </Button>
        </div>
      </div>
    </section>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [dashboardPriorityGoalId, setDashboardPriorityGoalIdState] =
    useState<string | null>(() => getDashboardPriorityGoalId());
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isQuickTransactionOpen, setIsQuickTransactionOpen] = useState(false);
  const [dailyReviewCompletedDate, setDailyReviewCompletedDate] = useState<
    string | null
  >(null);

    const summaryQuery = useQuery({
  queryKey: queryKeys.summary,
  queryFn: getSummary,
  staleTime: DASHBOARD_SUMMARY_STALE_TIME,
  refetchOnWindowFocus: false
});

const goalsQuery = useQuery({
  queryKey: queryKeys.goals,
  queryFn: getGoals,
  staleTime: DASHBOARD_GOALS_STALE_TIME,
  refetchOnWindowFocus: false
});

const profileQuery = useQuery({
  queryKey: queryKeys.profile,
  queryFn: getUserProfile,
  staleTime: DASHBOARD_PROFILE_STALE_TIME,
  refetchOnWindowFocus: false
});

  const summary = summaryQuery.data ?? null;
  const goals = goalsQuery.data ?? [];
  const profile = profileQuery.data ?? null;

  const isLoadingSummary = summaryQuery.isLoading && !summaryQuery.data;
  const isLoadingGoals = goalsQuery.isLoading && !goalsQuery.data;

  const summaryError =
    summaryQuery.error && !summaryQuery.data
      ? getErrorMessage(summaryQuery.error)
      : null;

  const goalsError =
    goalsQuery.error && !goalsQuery.data
      ? getErrorMessage(goalsQuery.error)
      : null;

  useEffect(() => {
    if (!goalsQuery.data) {
      return;
    }

    const storedPriorityGoalId = getDashboardPriorityGoalId();

    if (
      storedPriorityGoalId &&
      !goalsQuery.data.some((goal) => goal.id === storedPriorityGoalId)
    ) {
      clearDashboardPriorityGoalId();
      setDashboardPriorityGoalIdState(null);
      return;
    }

    setDashboardPriorityGoalIdState(storedPriorityGoalId);
  }, [goalsQuery.data]);

  const todayReviewDate = getLocalDateKey();
  const dailyReviewStorageKey = getDailyReviewStorageKey(user?.id);
  const isDailyReviewCompleted = dailyReviewCompletedDate === todayReviewDate;

  useEffect(() => {
    setDailyReviewCompletedDate(getStoredDailyReviewDate(dailyReviewStorageKey));
  }, [dailyReviewStorageKey]);

  function completeDailyReview() {
    setStoredDailyReviewDate(dailyReviewStorageKey, todayReviewDate);
    setDailyReviewCompletedDate(todayReviewDate);
    completeRemoteDailyReview(todayReviewDate).catch(() => {
      // Local review state still keeps the dashboard experience responsive.
    });
  }

  function openDailyQuickTransaction() {
    setIsQuickTransactionOpen(true);
  }

  function refreshDashboardData() {
  // Mutation handlers already update transaction and summary caches optimistically.
  // Heavy derived data is marked stale in the background by transaction-cache.ts.
  }

  function handleTransactionSuccess() {
    completeDailyReview();
    refreshDashboardData();
  }

  function retrySummaryData() {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.summary
    });
  }

  const displayedName = profile?.name ?? user?.name ?? "User";
  const displayedEmail = profile?.email ?? user?.email ?? "-";

  return (
    <>
      <AppShell profileName={displayedName} profileEmail={displayedEmail}>
        <header className="mb-4 flex items-center justify-between gap-3 sm:mb-7 sm:gap-4">
          <div className="min-w-0">
            <p className="text-sm font-black text-zinc-500">
              Dashboard Sakuin
            </p>
            <h1 className="mt-1 truncate text-xl font-black tracking-tight text-[var(--sakuin-text)] sm:text-4xl">
              Ringkasan Hari Ini
            </h1>
            <p className="mt-1 hidden text-sm font-medium text-zinc-600 sm:block">
              Hai {displayedName}, ini gambaran ringan kondisi uangmu.
            </p>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <Button
              className="rounded-xl border-[var(--sakuin-border)] bg-white text-[var(--sakuin-text)] hover:bg-[var(--sakuin-primary-soft)]"
              onClick={() => setIsQuickTransactionOpen(true)}
              size="md"
              type="button"
              variant="secondary"
            >
              <MessageSquare className="h-4 w-4" />
              Catat Cepat
            </Button>

            <Button
              className="rounded-xl bg-[var(--sakuin-secondary)] text-white hover:bg-[var(--sakuin-secondary)] focus-visible:ring-[var(--sakuin-focus)]"
              onClick={() => setIsAddTransactionOpen(true)}
              size="md"
              type="button"
            >
              <Plus className="h-4 w-4" />
              Transaksi
            </Button>

            <Link
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--sakuin-border)] bg-white px-4 text-sm font-bold text-[var(--sakuin-text)] shadow-sm transition hover:bg-[var(--sakuin-primary-soft)] focus:outline-none focus:ring-4 focus:ring-[var(--sakuin-focus)]/25"
              to="/export"
            >
              <Download className="h-4 w-4" />
              Export
            </Link>
          </div>

          <Link
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--sakuin-border)] bg-white text-[var(--sakuin-text)] shadow-sm transition hover:bg-[var(--sakuin-primary-soft)] sm:hidden"
            to="/profile"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </header>

        <DailyReviewCard
          completed={isDailyReviewCompleted}
          habit={summary?.habit}
          onComplete={completeDailyReview}
          onOpenQuickTransaction={openDailyQuickTransaction}
        />

        {summaryError ? (
          <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-black">Gagal mengambil summary</p>
                <p className="mt-1 text-sm font-medium text-rose-700">
                  {summaryError}
                </p>
                <button
                  className="mt-2 text-sm font-black underline"
                  onClick={retrySummaryData}
                  type="button"
                >
                  Coba lagi
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-5">
          <div className="space-y-4 sm:space-y-5">
            {isLoadingSummary ? (
              <SummarySkeleton />
            ) : (
              <div className="rounded-3xl border border-transparent bg-gradient-to-br from-[var(--sakuin-green)] to-[#66bb6a] p-4 text-white shadow-[0_22px_55px_rgba(46,125,50,0.18)] sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white/85 sm:text-sm">
                      Total Saldo Aktif
                    </p>
                    <p className="mt-2 text-3xl font-black tracking-tight text-white sm:text-5xl">
                      {formatRupiah(summary?.balance)}
                    </p>
                    <p className="mt-2 max-w-xl text-xs leading-5 text-white/85 sm:text-sm sm:leading-6">
                      {summary?.isBelowSafeLimit
                        ? "Saldo kamu sedang di bawah batas aman."
                        : "Saldo kamu masih berada di atas batas aman."}
                    </p>
                  </div>

                  <div
                    className={
                      summary?.isBelowSafeLimit
                        ? "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--sakuin-border)] bg-white px-3 py-1.5 text-xs font-black text-[var(--sakuin-text)]"
                        : "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--sakuin-border)] bg-white px-3 py-1.5 text-xs font-black text-[var(--sakuin-text)]"
                    }
                  >
                    {summary?.isBelowSafeLimit ? (
                      <AlertTriangle className="h-3.5 w-3.5" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    {summary?.isBelowSafeLimit ? "Waspada" : "Aman"}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2.5 border-t border-white/25 pt-4 sm:mt-8 sm:grid-cols-3 sm:gap-4 sm:pt-6">
                  <div className="rounded-2xl border border-white/20 bg-white/95 p-3 sm:p-4">
                    <p className="text-xs font-semibold text-zinc-500">
                      Pemasukan
                    </p>
                    <p className="mt-1.5 text-base font-black text-[var(--sakuin-text)] sm:text-lg">
                      {formatRupiah(summary?.totalIncome)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/20 bg-white/95 p-3 sm:p-4">
                    <p className="text-xs font-semibold text-zinc-500">
                      Pengeluaran
                    </p>
                    <p className="mt-1.5 text-base font-black text-[var(--sakuin-text)] sm:text-lg">
                      {formatRupiah(summary?.totalExpense)}
                    </p>
                  </div>

                  <div className="col-span-2 rounded-2xl border border-white/20 bg-white/95 p-3 sm:col-span-1 sm:p-4">
                    <p className="text-xs font-semibold text-zinc-500">
                      Batas Aman
                    </p>
                    <p className="mt-1.5 text-base font-black text-[var(--sakuin-text)] sm:text-lg">
                      {formatRupiah(summary?.safeBalanceLimit)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:hidden">
                  <button
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--sakuin-secondary)] text-sm font-black text-white shadow-sm transition hover:bg-[var(--sakuin-primary)]"
                    onClick={() => setIsQuickTransactionOpen(true)}
                    type="button"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Catat Cepat
                  </button>

                  <button
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-black text-[var(--sakuin-text)] ring-1 ring-[var(--sakuin-border)] transition hover:bg-[var(--sakuin-primary-soft)]"
                    onClick={() => setIsAddTransactionOpen(true)}
                    type="button"
                  >
                    <Plus className="h-4 w-4" />
                    Tambah Manual
                  </button>

                  <Link
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-black text-[var(--sakuin-text)] ring-1 ring-[var(--sakuin-border)] transition hover:bg-[var(--sakuin-primary-soft)]"
                    to="/export"
                  >
                    <Download className="h-4 w-4" />
                    Export Laporan
                  </Link>
                </div>
              </div>
            )}

            <div className="rounded-3xl border border-[var(--sakuin-border)] bg-white p-3.5 shadow-sm sm:p-6">
              <div className="mb-4">
              <h2 className="text-base font-black text-[var(--sakuin-text)] sm:text-lg">
                Statistik 6 Bulan
              </h2>
              <p className="mt-1 text-xs font-medium text-zinc-600 sm:text-sm">
                Pergerakan arus kas bulanan.
              </p>
              </div>

              <TrendChart items={summary?.monthlyTrend ?? []} />
            </div>

            <div className="rounded-3xl border border-[var(--sakuin-border)] bg-white p-3.5 shadow-sm sm:p-6">
              <div className="mb-4">
                <h2 className="text-base font-black text-[var(--sakuin-text)] sm:text-lg">
                  Transaksi Terbaru
                </h2>
                <p className="mt-1 text-xs font-medium text-zinc-600 sm:text-sm">
                  Aktivitas terakhir dari akunmu.
                </p>
              </div>

              <div className="grid gap-3">
                {(summary?.recentTransactions ?? []).length > 0 ? (
                  summary?.recentTransactions.map((transaction) => (
                    <TransactionItem
                      key={transaction.id}
                      transaction={transaction}
                    />
                  ))
                ) : (
                  <div className="rounded-2xl bg-[var(--sakuin-primary-soft)] p-6 text-center text-sm font-semibold text-zinc-600">
                    Belum ada transaksi terbaru.
                  </div>
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-4 sm:space-y-5">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:grid-cols-1">
              <div className="flex items-center gap-3 rounded-2xl border border-[var(--sakuin-border)] bg-white p-3.5 shadow-sm sm:gap-4 sm:p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--sakuin-green)] text-white sm:h-11 sm:w-11">
                  <ArrowUpCircle className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-zinc-500">
                    Income Bulan Ini
                  </p>
                  <p className="mt-1 truncate text-base font-black text-[var(--sakuin-text)] sm:text-lg">
                    {formatRupiah(summary?.incomeThisMonth)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-[var(--sakuin-border)] bg-white p-3.5 shadow-sm sm:gap-4 sm:p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--sakuin-red)] text-white sm:h-11 sm:w-11">
                  <ArrowDownCircle className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-zinc-500">
                    Expense Bulan Ini
                  </p>
                  <p className="mt-1 truncate text-base font-black text-[var(--sakuin-text)] sm:text-lg">
                    {formatRupiah(summary?.expenseThisMonth)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-[var(--sakuin-border)] bg-white p-3.5 shadow-sm sm:gap-4 sm:p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--sakuin-primary)] text-white sm:h-11 sm:w-11">
                  <Activity className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-zinc-500">
                    Total Transaksi
                  </p>
                  <p className="mt-1 truncate text-base font-black text-[var(--sakuin-text)] sm:text-lg">
                    {summary?.transactionCount ?? 0}{" "}
                    <span className="text-sm font-semibold text-slate-500">
                      kali
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <FinancialCheckupCard
              financialCheckup={summary?.financialCheckup}
              isLoading={isLoadingSummary}
            />

            <SafeToSpendCard
              safeToSpend={summary?.safeToSpend}
              isLoading={isLoadingSummary}
            />

            <DashboardGoalsCard
              goals={goals}
              isLoading={isLoadingGoals}
              error={goalsError}
              priorityGoalId={dashboardPriorityGoalId}
            />
          </aside>
        </div>
      </AppShell>

      <QuickTransactionModal
        open={isQuickTransactionOpen}
        onClose={() => setIsQuickTransactionOpen(false)}
        onSuccess={handleTransactionSuccess}
      />

      <AddTransactionModal
        open={isAddTransactionOpen}
        onClose={() => setIsAddTransactionOpen(false)}
        onSuccess={handleTransactionSuccess}
      />
    </>
  );
}
