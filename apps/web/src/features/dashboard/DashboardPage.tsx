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
  Loader2,
  MessageSquare,
  PiggyBank,
  Plus,
  Settings
} from "lucide-react";
import { AppShell } from "../../components/layout/AppShell";
import { Button } from "../../components/ui/button";
import { ApiClientError } from "../../lib/api-client";
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
  MonthlyTrendItem,
  SafeToSpendData,
  SummaryTransaction
} from "../summary/summary.types";
import { AddTransactionModal } from "../transactions/AddTransactionModal";
import { QuickTransactionModal } from "../transactions/QuickTransactionModal";
import { getUserProfile } from "../profile/profile.service";

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
      card: "border-emerald-200 bg-emerald-50",
      badge: "bg-emerald-100 text-emerald-700 ring-emerald-200",
      icon: "bg-emerald-600 text-white",
      text: "text-emerald-900",
      muted: "text-emerald-700"
    };
  }

  if (status === "WATCH") {
    return {
      card: "border-amber-200 bg-amber-50",
      badge: "bg-amber-100 text-amber-800 ring-amber-200",
      icon: "bg-amber-500 text-white",
      text: "text-amber-950",
      muted: "text-amber-800"
    };
  }

  if (status === "HOLD") {
    return {
      card: "border-rose-200 bg-rose-50",
      badge: "bg-rose-100 text-rose-700 ring-rose-200",
      icon: "bg-rose-600 text-white",
      text: "text-rose-950",
      muted: "text-rose-800"
    };
  }

  return {
    card: "border-slate-200 bg-slate-50",
    badge: "bg-slate-100 text-slate-700 ring-slate-200",
    icon: "bg-slate-700 text-white",
    text: "text-slate-950",
    muted: "text-slate-600"
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
    <div className="flex min-h-[14rem] items-center justify-center rounded-[1.75rem] bg-slate-950 p-6 text-white shadow-xl shadow-slate-950/10 sm:min-h-[16rem] sm:rounded-[2rem] sm:p-8">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
        <p className="text-sm font-semibold text-slate-300">
          Memuat ringkasan keuangan...
        </p>
      </div>
    </div>
  );
}

function TransactionItem({ transaction }: { transaction: SummaryTransaction }) {
  const isIncome = transaction.type === "INCOME";

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 transition hover:border-slate-200 hover:bg-white hover:shadow-sm sm:gap-4 sm:p-4">
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <div
          className={
            isIncome
              ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"
              : "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700"
          }
        >
          {isIncome ? (
            <ArrowUpCircle className="h-5 w-5" />
          ) : (
            <ArrowDownCircle className="h-5 w-5" />
          )}
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">
            {transaction.note || transaction.category.name}
          </p>
          <p className="mt-0.5 text-xs font-medium text-slate-500">
            {transaction.category.name} · {formatDate(transaction.date)}
          </p>
        </div>
      </div>

      <p
        className={
          isIncome
            ? "shrink-0 text-right text-xs font-black text-emerald-700 sm:text-sm"
            : "shrink-0 text-right text-xs font-black text-rose-700 sm:text-sm"
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
      <div className="flex h-32 items-center justify-center rounded-[1.5rem] bg-slate-50 px-4 text-center text-sm font-medium text-slate-500">
        Belum ada data trend bulanan.
      </div>
    );
  }

  return (
    <div className="relative rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
      
      {/* Garis Bantu (Grid) Latar Belakang */}
      <div className="absolute left-4 right-4 top-10 bottom-20 z-0 flex flex-col justify-between px-2 sm:left-6 sm:right-6">
        <div className="h-px w-full border-t border-dashed border-slate-200"></div>
        <div className="h-px w-full border-t border-dashed border-slate-200"></div>
        <div className="h-px w-full border-t border-dashed border-slate-200"></div>
      </div>

      <div className="relative z-10 mt-2 flex h-48 items-end justify-between gap-2 sm:h-56 sm:gap-4">
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
                <div className="rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-xs shadow-xl backdrop-blur-md ring-1 ring-slate-900/5">
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
                    className="w-full rounded-t-md bg-gradient-to-t from-emerald-400 to-emerald-500 opacity-80 transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:opacity-100 group-hover:shadow-[0_4px_12px_rgba(16,185,129,0.4)]"
                    style={{ height: `${incomeHeight}%` }}
                  />
                </div>

                {/* Batang Pengeluaran */}
                <div className="relative flex h-full w-full items-end justify-center">
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-rose-400 to-rose-500 opacity-80 transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:opacity-100 group-hover:shadow-[0_4px_12px_rgba(244,63,94,0.4)]"
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
          <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-t from-emerald-400 to-emerald-500 shadow-sm" />
          Pemasukan
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-t from-rose-400 to-rose-500 shadow-sm" />
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
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[2rem] sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-slate-950">
            Goals Tabungan
          </h2>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Ringkasan target tabungan aktif.
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
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
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-indigo-700 px-4 text-xs font-black shadow-sm transition hover:bg-indigo-800 focus:outline-none focus:ring-4 focus:ring-indigo-700/20"
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

              <p className="mt-1 text-[11px] font-black text-indigo-700">
                {isUserSelectedPriority
                  ? "Prioritas pilihanmu"
                  : "Rekomendasi otomatis"}
              </p>

              <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatGoalDeadline(priorityGoal.deadline)}
              </p>
            </div>

            <span className="shrink-0 rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-700">
              {getGoalProgress(priorityGoal)}%
            </span>
          </div>

          <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-500">
            <span>{formatCompactRupiah(priorityGoal.currentAmount)}</span>
            <span>{formatCompactRupiah(priorityGoal.targetAmount)}</span>
          </div>

          <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-indigo-700"
              style={{
                width: `${getGoalProgress(priorityGoal)}%`
              }}
            />
          </div>

          <Link
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-indigo-700 px-4 text-xs font-black shadow-sm transition hover:bg-indigo-800 focus:outline-none focus:ring-4 focus:ring-indigo-700/20"
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
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[2rem] sm:p-6">
        <div className="flex min-h-40 items-center justify-center rounded-2xl bg-slate-50">
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
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[2rem] sm:p-6">
        <div className="rounded-2xl bg-slate-50 p-4">
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
      ? "Kamu masih punya ruang aman untuk pengeluaran bulan ini."
      : safeToSpend.status === "WATCH"
        ? "Masih bisa dipakai, tapi pengeluaran perlu dipantau."
        : safeToSpend.status === "HOLD"
          ? "Sebaiknya tahan pengeluaran non-prioritas dulu."
          : "Catat transaksi dulu agar batas aman bisa dihitung.";

  return (
    <div
      className={[
        "overflow-hidden rounded-[1.75rem] border p-5 shadow-sm sm:rounded-[2rem] sm:p-6",
        style.card
      ].join(" ")}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className={["text-base font-black", style.text].join(" ")}>
              Aman Dipakai
            </p>

            <span
              className={[
                "inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ring-1",
                style.badge
              ].join(" ")}
            >
              {formatSafeToSpendStatus(safeToSpend.status)}
            </span>
          </div>

          <p className={["mt-2 text-xs font-semibold leading-5", style.muted].join(" ")}>
            {headline}
          </p>
        </div>

        <div
          className={[
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
            style.icon
          ].join(" ")}
        >
          {safeToSpend.status === "SAFE" ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : safeToSpend.status === "HOLD" ? (
            <AlertTriangle className="h-5 w-5" />
          ) : (
            <Activity className="h-5 w-5" />
          )}
        </div>
      </div>

      <div className="rounded-[1.25rem] bg-white/80 p-4 ring-1 ring-white/80">
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
          Sisa aman bulan ini
        </p>
        <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">
          {formatRupiah(safeToSpend.availableToSpend)}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-slate-50 px-3 py-2.5">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
              Limit harian
            </p>
            <p className="mt-1 text-sm font-black text-slate-950">
              {hasDailyLimit
                ? `${formatCompactRupiah(safeToSpend.suggestedDailyLimit)} / hari`
                : "-"}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 px-3 py-2.5">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
              Sisa hari
            </p>
            <p className="mt-1 text-sm font-black text-slate-950">
              {safeToSpend.remainingDays} hari
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/70 px-3 py-2.5 ring-1 ring-white/80">
          <p className="text-xs font-bold text-slate-500">Ritme pengeluaran</p>
          <p className="shrink-0 text-right text-xs font-black text-slate-950">
            {formatSpendingPaceStatus(safeToSpend.spendingPaceStatus)}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/70 px-3 py-2.5 ring-1 ring-white/80">
          <p className="text-xs font-bold text-slate-500">Fokus kontrol</p>
          <p className="min-w-0 truncate text-right text-xs font-black text-slate-950">
            {safeToSpend.topRiskCategoryName ?? "Belum ada"}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-2xl bg-white/70 p-4 ring-1 ring-white/80">
        <p className="text-xs font-black text-slate-950">Aksi utama</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
          {safeToSpend.action}
        </p>
      </div>

      {primaryWarning ? (
        <div className="mt-3 flex items-start gap-2 rounded-2xl bg-white/70 p-3 text-xs font-semibold leading-5 text-slate-600 ring-1 ring-white/80">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{primaryWarning}</p>
        </div>
      ) : null}

      <Link
        className="group relative mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl border border-white/10 bg-black px-4 text-sm font-semibold !text-white transition-all duration-300 ease-out hover:-translate-y-1 hover:border-white/30 hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] focus:outline-none focus:ring-4 focus:ring-white/20"
        to="/asisten"
      >
        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 ease-in-out group-hover:translate-x-full" />

        <MessageSquare className="relative z-10 h-4 w-4 text-white transition-transform duration-300 ease-out group-hover:scale-110" />

        <span className="relative z-10 text-white">Tanya Asisten</span>
      </Link>
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [dashboardPriorityGoalId, setDashboardPriorityGoalIdState] =
    useState<string | null>(() => getDashboardPriorityGoalId());
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isQuickTransactionOpen, setIsQuickTransactionOpen] = useState(false);

  const summaryQuery = useQuery({
    queryKey: queryKeys.summary,
    queryFn: getSummary
  });

  const goalsQuery = useQuery({
    queryKey: queryKeys.goals,
    queryFn: getGoals
  });

  const profileQuery = useQuery({
    queryKey: queryKeys.profile,
    queryFn: getUserProfile
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

  function refreshDashboardData() {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.summary
    });

    void queryClient.invalidateQueries({
      queryKey: queryKeys.transactions.all
    });
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
        <header className="mb-5 flex items-center justify-between gap-4 sm:mb-7">
          <div className="min-w-0">
            <p className="text-sm font-black text-indigo-700">
              Dashboard Sakuin
            </p>
            <h1 className="mt-1 truncate text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Status Keuangan
            </h1>
            <p className="mt-1 hidden text-sm font-medium text-slate-500 sm:block">
              Ringkasan kondisi keuangan akun {displayedName}.
            </p>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <Button
              className="rounded-2xl"
              onClick={() => setIsQuickTransactionOpen(true)}
              size="md"
              type="button"
              variant="secondary"
            >
              <MessageSquare className="h-4 w-4" />
              Catat Cepat
            </Button>

            <Button
              className="rounded-2xl bg-slate-950 text-white hover:bg-black"
              onClick={() => setIsAddTransactionOpen(true)}
              size="md"
              type="button"
            >
              <Plus className="h-4 w-4" />
              Transaksi
            </Button>
          </div>

          <Link
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100 sm:hidden"
            to="/profile"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </header>

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

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            {isLoadingSummary ? (
              <SummarySkeleton />
            ) : (
              <div className="relative overflow-hidden rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-xl shadow-slate-950/15 sm:rounded-[2rem] sm:p-8">
                <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-28 -left-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

                <div className="relative z-10 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-300 sm:text-sm">
                      Total Saldo Aktif
                    </p>
                    <p className="mt-2 text-4xl font-black tracking-tight text-white sm:text-5xl">
                      {formatRupiah(summary?.balance)}
                    </p>
                    <p className="mt-2 max-w-xl text-xs leading-5 text-slate-300 sm:text-sm sm:leading-6">
                      {summary?.isBelowSafeLimit
                        ? "Saldo kamu sedang di bawah batas aman."
                        : "Saldo kamu masih berada di atas batas aman."}
                    </p>
                  </div>

                  <div
                    className={
                      summary?.isBelowSafeLimit
                        ? "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-rose-400/40 bg-rose-400/10 px-3 py-1.5 text-xs font-black text-rose-200"
                        : "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1.5 text-xs font-black text-emerald-200"
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

                <div className="relative z-10 mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-5 sm:mt-8 sm:grid-cols-3 sm:gap-4 sm:pt-6">
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-xs font-semibold text-slate-300">
                      Pemasukan
                    </p>
                    <p className="mt-1.5 text-lg font-black text-emerald-300">
                      {formatRupiah(summary?.totalIncome)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-xs font-semibold text-slate-300">
                      Pengeluaran
                    </p>
                    <p className="mt-1.5 text-lg font-black text-rose-300">
                      {formatRupiah(summary?.totalExpense)}
                    </p>
                  </div>

                  <div className="col-span-2 rounded-2xl bg-white/10 p-4 sm:col-span-1">
                    <p className="text-xs font-semibold text-slate-300">
                      Batas Aman
                    </p>
                    <p className="mt-1.5 text-lg font-black text-white">
                      {formatRupiah(summary?.safeBalanceLimit)}
                    </p>
                  </div>
                </div>

                <div className="relative z-10 mt-4 grid gap-2 sm:hidden">
                  <button
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white text-sm font-black text-slate-950 shadow-sm transition hover:bg-slate-100"
                    onClick={() => setIsQuickTransactionOpen(true)}
                    type="button"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Catat Cepat
                  </button>

                  <button
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white/10 text-sm font-black text-white ring-1 ring-white/20 transition hover:bg-white/15"
                    onClick={() => setIsAddTransactionOpen(true)}
                    type="button"
                  >
                    <Plus className="h-4 w-4" />
                    Tambah Manual
                  </button>
                </div>
              </div>
            )}

            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[2rem] sm:p-6">
              <div className="mb-4">
                <h2 className="text-lg font-black text-slate-950">
                  Statistik 6 Bulan
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Pergerakan arus kas bulanan.
                </p>
              </div>

              <TrendChart items={summary?.monthlyTrend ?? []} />
            </div>

            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[2rem] sm:p-6">
              <div className="mb-4">
                <h2 className="text-lg font-black text-slate-950">
                  Transaksi Terbaru
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
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
                  <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">
                    Belum ada transaksi terbaru.
                  </div>
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="flex items-center gap-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <ArrowUpCircle className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-500">
                    Income Bulan Ini
                  </p>
                  <p className="mt-1 truncate text-lg font-black text-slate-950">
                    {formatRupiah(summary?.incomeThisMonth)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
                  <ArrowDownCircle className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-500">
                    Expense Bulan Ini
                  </p>
                  <p className="mt-1 truncate text-lg font-black text-slate-950">
                    {formatRupiah(summary?.expenseThisMonth)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                  <Activity className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-500">
                    Total Transaksi
                  </p>
                  <p className="mt-1 truncate text-lg font-black text-slate-950">
                    {summary?.transactionCount ?? 0}{" "}
                    <span className="text-sm font-semibold text-slate-500">
                      kali
                    </span>
                  </p>
                </div>
              </div>
            </div>

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
        onSuccess={refreshDashboardData}
      />

      <AddTransactionModal
        open={isAddTransactionOpen}
        onClose={() => setIsAddTransactionOpen(false)}
        onSuccess={refreshDashboardData}
      />
    </>
  );
}