import { Link } from "react-router-dom";
import { AlertTriangle, CalendarDays, Loader2, PiggyBank } from "lucide-react";
import type { Goal } from "../goals/goal.types";
import {
  formatCompactRupiah,
  formatGoalDeadline,
  getGoalProgress,
  getPriorityGoal
} from "./dashboard-utils";

export function DashboardGoalsCard({
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
