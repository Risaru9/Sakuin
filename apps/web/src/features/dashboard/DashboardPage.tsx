import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarDays,
  CheckCircle2,
  Loader2,
  PiggyBank,
  Plus,
  Settings
} from "lucide-react";
import { AppShell } from "../../components/layout/AppShell";
import { Button } from "../../components/ui/button";
import { ApiClientError } from "../../lib/api-client";
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
  SummaryData,
  SummaryTransaction
} from "../summary/summary.types";
import { AddTransactionModal } from "../transactions/AddTransactionModal";
import { getUserProfile } from "../profile/profile.service";
import type { UserProfile } from "../profile/profile.types";

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

    return Math.max(1, ...values);
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-2xl bg-slate-50 px-4 text-center text-sm font-medium text-slate-500">
        Belum ada data trend bulanan.
      </div>
    );
  }

  return (
    <div className="rounded-[1.5rem] bg-slate-50 p-4 sm:p-5">
      <div className="flex h-36 items-end justify-between gap-2 sm:h-44 sm:gap-4">
        {items.map((item) => {
          const incomeHeight = Math.max(
            6,
            (toNumber(item.income) / maxValue) * 100
          );
          const expenseHeight = Math.max(
            6,
            (toNumber(item.expense) / maxValue) * 100
          );

          return (
            <div
              className="group flex flex-1 flex-col items-center justify-end"
              key={item.month}
            >
              <div className="flex h-28 w-full max-w-[26px] items-end justify-center gap-1 sm:h-36 sm:max-w-[34px]">
                <div
                  className="w-full rounded-t-lg bg-emerald-500 transition group-hover:bg-emerald-600"
                  style={{
                    height: `${incomeHeight}%`
                  }}
                  title={`Income ${formatRupiah(item.income)}`}
                />
                <div
                  className="w-full rounded-t-lg bg-rose-500 transition group-hover:bg-rose-600"
                  style={{
                    height: `${expenseHeight}%`
                  }}
                  title={`Expense ${formatRupiah(item.expense)}`}
                />
              </div>

              <p className="mt-3 text-xs font-bold text-slate-500">
                {getMonthLabel(item.month)}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-4 border-t border-slate-200 pt-4 text-xs font-bold text-slate-600">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          Pemasukan
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
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

export function DashboardPage() {
  const { user } = useAuth();

  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dashboardPriorityGoalId, setDashboardPriorityGoalIdState] =
    useState<string | null>(() => getDashboardPriorityGoalId());

  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isLoadingGoals, setIsLoadingGoals] = useState(true);

  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [goalsError, setGoalsError] = useState<string | null>(null);

  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);

  async function loadSummaryData() {
    setIsLoadingSummary(true);
    setSummaryError(null);

    try {
      const data = await getSummary();
      setSummary(data);
    } catch (error) {
      setSummaryError(getErrorMessage(error));
    } finally {
      setIsLoadingSummary(false);
    }
  }

  async function loadGoalsData() {
    setIsLoadingGoals(true);
    setGoalsError(null);

    try {
      const data = await getGoals();
      const storedPriorityGoalId = getDashboardPriorityGoalId();

      if (
        storedPriorityGoalId &&
        !data.some((goal) => goal.id === storedPriorityGoalId)
      ) {
        clearDashboardPriorityGoalId();
        setDashboardPriorityGoalIdState(null);
      } else {
        setDashboardPriorityGoalIdState(storedPriorityGoalId);
      }

      setGoals(data);
    } catch (error) {
      setGoalsError(getErrorMessage(error));
    } finally {
      setIsLoadingGoals(false);
    }
  }

  async function loadProfileData() {
    try {
      const data = await getUserProfile();
      setProfile(data);
    } catch {
      // Profile fallback tetap memakai data dari auth context.
    }
  }

  async function loadDashboardData() {
    await Promise.all([loadSummaryData(), loadGoalsData(), loadProfileData()]);
  }

  useEffect(() => {
    void loadDashboardData();
  }, []);

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

          <Button
            className="hidden rounded-2xl bg-slate-950 text-white hover:bg-black sm:inline-flex"
            onClick={() => setIsAddTransactionOpen(true)}
            size="md"
          >
            <Plus className="h-4 w-4" />
            Transaksi
          </Button>

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
                  onClick={() => void loadSummaryData()}
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
                      {formatCompactRupiah(summary?.totalIncome)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-xs font-semibold text-slate-300">
                      Pengeluaran
                    </p>
                    <p className="mt-1.5 text-lg font-black text-rose-300">
                      {formatCompactRupiah(summary?.totalExpense)}
                    </p>
                  </div>

                  <div className="col-span-2 rounded-2xl bg-white/10 p-4 sm:col-span-1">
                    <p className="text-xs font-semibold text-slate-300">
                      Batas Aman
                    </p>
                    <p className="mt-1.5 text-lg font-black text-white">
                      {formatCompactRupiah(summary?.safeBalanceLimit)}
                    </p>
                  </div>
                </div>

                <button
                  className="relative z-10 mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white text-sm font-black text-slate-950 shadow-sm transition hover:bg-slate-100 sm:hidden"
                  onClick={() => setIsAddTransactionOpen(true)}
                  type="button"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Transaksi
                </button>
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
                    {formatCompactRupiah(summary?.incomeThisMonth)}
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
                    {formatCompactRupiah(summary?.expenseThisMonth)}
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

            <DashboardGoalsCard
              goals={goals}
              isLoading={isLoadingGoals}
              error={goalsError}
              priorityGoalId={dashboardPriorityGoalId}
            />
          </aside>
        </div>
      </AppShell>

      <AddTransactionModal
        open={isAddTransactionOpen}
        onClose={() => setIsAddTransactionOpen(false)}
        onSuccess={loadDashboardData}
      />
    </>
  );
}