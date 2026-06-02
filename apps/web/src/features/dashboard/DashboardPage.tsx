import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronDown,
  CheckCircle2,
  Download,
  MessageSquare,
  PiggyBank,
  Plus,
  Settings
} from "lucide-react";
import { AppShell } from "../../components/layout/AppShell";
import { Button } from "../../components/ui/button";
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
  SummaryData
} from "../summary/summary.types";
import { AddTransactionModal } from "../transactions/AddTransactionModal";
import { QuickTransactionModal } from "../transactions/QuickTransactionModal";
import { getUserProfile } from "../profile/profile.service";
import { completeRemoteDailyReview } from "../reminders/reminder.service";
import {
  subscribeToInstallPrompt,
  isStandaloneMode,
  type BeforeInstallPromptEvent
} from "../../lib/pwa";
import {
  formatRupiah,
  getErrorMessage
} from "./dashboard-utils";
import {
  SummarySkeleton,
  TransactionItem
} from "./dashboard-summary-widgets";
import {
  DEFAULT_STATS_MODE,
  DEFAULT_STATS_RANGE,
  DEFAULT_STATS_VALUE_TYPE,
  SixMonthStatsCard,
  type StatsMode,
  type StatsRange,
  type StatsValueType
} from "./dashboard-stats-card";
import { FinancialRhythmCard } from "./dashboard-rhythm-card";
import { DashboardGoalsCard } from "./dashboard-goals-card";
import { FinancialCheckupCard } from "./dashboard-checkup-card";
import { DailyReviewCard, TodayViewCard } from "./dashboard-daily-cards";

const DASHBOARD_SUMMARY_STALE_TIME = 60_000;
const DASHBOARD_GOALS_STALE_TIME = 60_000;
const DASHBOARD_PROFILE_STALE_TIME = 5 * 60_000;

export function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const isAndroid =
    typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
  const isCapacitor =
    typeof window !== "undefined" && !!(window as any).Capacitor;

  const [dashboardPriorityGoalId, setDashboardPriorityGoalIdState] =
    useState<string | null>(() => getDashboardPriorityGoalId());
  const [activeMobileTab, setActiveMobileTab] = useState<
    "overview" | "transactions" | "stats"
  >("overview");
  const mobileTabItems = [
    { id: "overview", label: "Ringkasan" },
    { id: "transactions", label: "Transaksi" },
    { id: "stats", label: "Ritme" }
  ] as const;
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isQuickTransactionOpen, setIsQuickTransactionOpen] = useState(false);
  const [isSummaryActionOpen, setIsSummaryActionOpen] = useState(false);
  const [quickTransactionInitialText, setQuickTransactionInitialText] = useState("");
  const [dailyReviewCompletedDate, setDailyReviewCompletedDate] = useState<
    string | null
  >(null);

  const selectedStatsRange = useMemo<StatsRange>(() => {
    const value = searchParams.get("statsRange");
    if (value === "3" || value === "6" || value === "12") {
      return Number(value) as StatsRange;
    }
    return DEFAULT_STATS_RANGE;
  }, [searchParams]);

  const selectedStatsMode = useMemo<StatsMode>(() => {
    const value = searchParams.get("statsMode");
    if (value === "cashflow" || value === "net") {
      return value;
    }
    return DEFAULT_STATS_MODE;
  }, [searchParams]);

  const selectedStatsValueType = useMemo<StatsValueType>(() => {
    const value = searchParams.get("statsValue");
    if (value === "nominal" || value === "percent") {
      return value;
    }
    return DEFAULT_STATS_VALUE_TYPE;
  }, [searchParams]);

  function updateStatsSearchParams(nextValues: {
    range?: StatsRange;
    mode?: StatsMode;
    valueType?: StatsValueType;
  }) {
    const next = new URLSearchParams(searchParams);
    const nextRange = nextValues.range ?? selectedStatsRange;
    const nextMode = nextValues.mode ?? selectedStatsMode;
    const nextValueType = nextValues.valueType ?? selectedStatsValueType;

    if (nextRange === DEFAULT_STATS_RANGE) {
      next.delete("statsRange");
    } else {
      next.set("statsRange", String(nextRange));
    }

    if (nextMode === DEFAULT_STATS_MODE) {
      next.delete("statsMode");
    } else {
      next.set("statsMode", nextMode);
    }

    if (nextValueType === DEFAULT_STATS_VALUE_TYPE) {
      next.delete("statsValue");
    } else {
      next.set("statsValue", nextValueType);
    }

    setSearchParams(next, { replace: true });
  }

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

  const [milestoneToShow, setMilestoneToShow] = useState<number | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (summary?.habit?.currentStreakDays) {
      const currentStreak = summary.habit.currentStreakDays;
      const milestones = [3, 7, 30];
      const matchingMilestone = milestones.find((m) => currentStreak === m);

      if (matchingMilestone) {
        const storageKey = `sakuin_streak_milestone_${user?.id ?? "default"}_${matchingMilestone}`;
        const hasShown = localStorage.getItem(storageKey);
        if (!hasShown) {
          setMilestoneToShow(matchingMilestone);
          localStorage.setItem(storageKey, "true");
        }
      }
    }
  }, [summary?.habit?.currentStreakDays, user?.id]);

  function completeDailyReview() {
    setStoredDailyReviewDate(dailyReviewStorageKey, todayReviewDate);
    setDailyReviewCompletedDate(todayReviewDate);
    window.dispatchEvent(new Event("sakuin:daily-review-completed"));
    completeRemoteDailyReview(todayReviewDate).catch(() => {
      // Local review state still keeps the dashboard experience responsive.
    });
  }

  function openDailyQuickTransaction() {
    setQuickTransactionInitialText("");
    setIsQuickTransactionOpen(true);
  }

  useEffect(() => {
    let isCancelled = false;

    function consumeWidgetQuickAction() {
      const bridge = window.AndroidWidgetBridge;
      if (
        isCancelled ||
        !bridge?.consumePendingWidgetQuickAction ||
        !bridge.consumePendingWidgetQuickAction()
      ) {
        return;
      }

      setQuickTransactionInitialText("");
      setIsQuickTransactionOpen(true);
    }

    consumeWidgetQuickAction();
    const retryTimer = window.setTimeout(consumeWidgetQuickAction, 700);
    window.addEventListener("sakuin:widget-quick-transaction", consumeWidgetQuickAction);
    window.addEventListener("focus", consumeWidgetQuickAction);

    return () => {
      isCancelled = true;
      window.clearTimeout(retryTimer);
      window.removeEventListener("sakuin:widget-quick-transaction", consumeWidgetQuickAction);
      window.removeEventListener("focus", consumeWidgetQuickAction);
    };
  }, []);

  useEffect(() => {
    if (searchParams.get("widgetAction") !== "quick") {
      return;
    }

    setQuickTransactionInitialText("");
    setIsQuickTransactionOpen(true);

    const next = new URLSearchParams(searchParams);
    next.delete("widgetAction");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  function refreshDashboardData() {
  // Mutation handlers already update transaction and summary caches optimistically.
  // Heavy derived data is marked stale in the background by transaction-cache.ts.
  }

  function handleTransactionSuccess() {
    completeDailyReview();
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

        {/* WeeklyCheckinCard removed */}

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
            {/* Kartu biru utama (saldo + aksi) - tidak diubah */}
            {isLoadingSummary ? (
              <SummarySkeleton />
            ) : (
              <div className="sakuin-enter relative overflow-hidden rounded-3xl border border-transparent bg-gradient-to-br from-[var(--sakuin-primary)] to-[var(--sakuin-secondary)] p-4 text-white shadow-[0_22px_55px_rgba(37,99,235,0.18)] sm:p-8">
                <div aria-hidden="true" className="absolute -right-20 -top-20 h-56 w-56 rounded-full border border-white/15 animate-[sakuinFloat_7s_ease-in-out_infinite]" />
                <div aria-hidden="true" className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full border border-white/15 animate-[sakuinFloat_8s_ease-in-out_infinite]" />
                <div className="relative flex items-start justify-between gap-4">
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
                      <AlertTriangle className="sakuin-icon-shake h-3.5 w-3.5" />
                    ) : (
                      <CheckCircle2 className="sakuin-icon-bounce h-3.5 w-3.5" />
                    )}
                    {summary?.isBelowSafeLimit ? "Waspada" : "Aman"}
                  </div>
                </div>

                <div className="relative mt-5 grid grid-cols-2 gap-2.5 border-t border-white/25 pt-4 sm:mt-8 sm:grid-cols-3 sm:gap-4 sm:pt-6">
                  <div className="sakuin-card-lift sakuin-stagger-enter rounded-2xl border border-white/20 bg-white/95 p-3 sm:p-4">
                    <p className="text-xs font-semibold text-zinc-500">
                      Pemasukan
                    </p>
                    <p className="mt-1.5 text-base font-black text-[var(--sakuin-text)] sm:text-lg">
                      {formatRupiah(summary?.totalIncome)}
                    </p>
                  </div>

                  <div className="sakuin-card-lift sakuin-stagger-enter rounded-2xl border border-white/20 bg-white/95 p-3 sm:p-4">
                    <p className="text-xs font-semibold text-zinc-500">
                      Pengeluaran
                    </p>
                    <p className="mt-1.5 text-base font-black text-[var(--sakuin-text)] sm:text-lg">
                      {formatRupiah(summary?.totalExpense)}
                    </p>
                  </div>

                  <div className="sakuin-card-lift sakuin-stagger-enter col-span-2 rounded-2xl border border-white/20 bg-white/95 p-3 sm:col-span-1 sm:p-4">
                    <p className="text-xs font-semibold text-zinc-500">
                      Batas Aman
                    </p>
                    <p className="mt-1.5 text-base font-black text-[var(--sakuin-text)] sm:text-lg">
                      {formatRupiah(summary?.safeBalanceLimit)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 sm:hidden">
                  <button
                    aria-expanded={isSummaryActionOpen}
                    className="sakuin-ripple sakuin-press flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-white/12 px-3 text-sm font-black text-white ring-1 ring-white/25 transition hover:bg-white/18 focus:outline-none focus:ring-4 focus:ring-white/25"
                    onClick={() =>
                      setIsSummaryActionOpen((current) => !current)
                    }
                    type="button"
                  >
                    <span>Aksi dashboard</span>
                    <ChevronDown
                      className={[
                        "h-4 w-4 transition-transform duration-300 motion-reduce:transition-none",
                        isSummaryActionOpen ? "rotate-180" : "rotate-0"
                      ].join(" ")}
                    />
                  </button>

                  {isSummaryActionOpen ? (
                    <div className="sakuin-enter mt-2 grid gap-2 rounded-2xl bg-white/10 p-2 ring-1 ring-white/15">
                      <button
                        className="sakuin-press inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-black text-[var(--sakuin-text)] shadow-sm transition hover:bg-gray-100"
                        onClick={() => setIsQuickTransactionOpen(true)}
                        type="button"
                      >
                        <MessageSquare className="sakuin-icon-bounce h-4 w-4" />
                        Catat Cepat
                      </button>

                      <button
                        className="sakuin-press inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-black text-[var(--sakuin-text)] shadow-sm transition hover:bg-gray-100"
                        onClick={() => setIsAddTransactionOpen(true)}
                        type="button"
                      >
                        <Plus className="sakuin-icon-bounce h-4 w-4" />
                        Tambah Manual
                      </button>

                      <Link
                        className="sakuin-press inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl !bg-[var(--sakuin-secondary)] text-sm font-black !text-white shadow-sm ring-1 ring-white/40 transition hover:!bg-[var(--sakuin-primary)] focus:outline-none focus:ring-4 focus:ring-white/25"
                        to="/export"
                      >
                        <Download className="sakuin-icon-shake h-4 w-4" />
                        Export Laporan
                      </Link>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* Tab ringkas untuk mobile agar tidak perlu scroll panjang */}
            <div className="relative mt-1 flex gap-2 overflow-hidden rounded-2xl bg-[var(--sakuin-primary-soft)] p-1.5 text-xs font-bold text-[var(--sakuin-text)] sm:text-sm xl:hidden">
              {mobileTabItems.map((item) => (
                <button
                  className={[
                    "sakuin-press relative z-10 flex-1 rounded-xl px-2 py-2 transition sm:px-3",
                    activeMobileTab === item.id
                      ? "bg-white text-[var(--sakuin-text)] shadow-sm"
                      : "text-zinc-600"
                  ].join(" ")}
                  key={item.id}
                  onClick={() => setActiveMobileTab(item.id)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Konten untuk layar lebar: ritme utama tetap ringkas, detail dibuka saat perlu */}
            <div className="hidden flex-col gap-4 xl:flex">
              <FinancialRhythmCard
                goals={goals}
                isLoading={isLoadingSummary}
                onOpenAddTransaction={() => setIsAddTransactionOpen(true)}
                onOpenQuickTransaction={() => setIsQuickTransactionOpen(true)}
                summary={summary}
              />

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

            {/* Konten mobile per tab: fokus supaya tidak perlu scroll panjang */}
            <div
              className="sakuin-tab-panel space-y-4 xl:hidden"
              key={activeMobileTab}
            >
              {activeMobileTab === "overview" ? (
                <>
                  {/* Ringkasan cepat: income, expense, total transaksi */}
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
                    <div className="sakuin-card-lift sakuin-stagger-enter flex items-center gap-3 rounded-2xl border border-[var(--sakuin-border)] bg-white p-3.5 shadow-sm sm:gap-4 sm:p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--sakuin-green-soft)] text-[var(--sakuin-green)] ring-1 ring-[var(--sakuin-green)]/15 sm:h-11 sm:w-11">
                        <ArrowUpCircle className="sakuin-icon-bounce h-5 w-5" />
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

                    <div className="sakuin-card-lift sakuin-stagger-enter flex items-center gap-3 rounded-2xl border border-[var(--sakuin-border)] bg-white p-3.5 shadow-sm sm:gap-4 sm:p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--sakuin-red-soft)] text-[var(--sakuin-red)] ring-1 ring-[var(--sakuin-red)]/15 sm:h-11 sm:w-11">
                        <ArrowDownCircle className="sakuin-icon-bounce h-5 w-5" />
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

                    <div className="sakuin-card-lift sakuin-stagger-enter flex items-center gap-3 rounded-2xl border border-[var(--sakuin-border)] bg-white p-3.5 shadow-sm sm:gap-4 sm:p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--sakuin-primary-soft)] text-[var(--sakuin-primary)] ring-1 ring-[var(--sakuin-primary)]/15 sm:h-11 sm:w-11">
                        <Activity className="sakuin-icon-bounce h-5 w-5" />
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
                  <DashboardGoalsCard
                    goals={goals}
                    isLoading={isLoadingGoals}
                    error={goalsError}
                    priorityGoalId={dashboardPriorityGoalId}
                  />
                </>
              ) : null}

              {activeMobileTab === "transactions" ? (
                <>
                  <TodayViewCard
                    summary={summary}
                    isLoading={isLoadingSummary}
                    onOpenQuickTransaction={() => setIsQuickTransactionOpen(true)}
                  />

                  <div className="rounded-3xl border border-[var(--sakuin-border)] bg-white p-3.5 shadow-sm sm:p-6">
                    <div className="mb-4 flex items-center justify-between gap-2">
                      <div>
                        <h2 className="text-base font-black text-[var(--sakuin-text)] sm:text-lg">
                          Transaksi Terbaru (Semua)
                        </h2>
                        <p className="mt-1 text-xs font-medium text-zinc-600 sm:text-sm">
                          Aktivitas terakhir dari akunmu secara keseluruhan.
                        </p>
                      </div>

                      <Link
                        className="rounded-xl border border-[var(--sakuin-border)] bg-white px-3 py-1.5 text-[11px] font-black text-[var(--sakuin-text)] shadow-sm transition hover:bg-[var(--sakuin-primary-soft)]"
                        to="/transactions"
                      >
                        Lihat semua
                      </Link>
                    </div>

                    <div className="grid gap-3">
                      {(summary?.recentTransactions ?? []).length > 0 ? (
                        summary?.recentTransactions.slice(0, 5).map((transaction) => (
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
                </>
              ) : null}

              {activeMobileTab === "stats" ? (
                <FinancialRhythmCard
                  goals={goals}
                  isLoading={isLoadingSummary}
                  onOpenAddTransaction={() => setIsAddTransactionOpen(true)}
                  onOpenQuickTransaction={() => setIsQuickTransactionOpen(true)}
                  summary={summary}
                />
              ) : null}

            </div>
          </div>

          <aside className="space-y-4 sm:space-y-5">
            {/* Grid highlight disembunyikan di mobile karena sudah muncul di tab Ringkasan */}
            <div className="hidden grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:grid:grid-cols-1">
              <div className="flex items-center gap-3 rounded-2xl border border-[var(--sakuin-border)] bg-white p-3.5 shadow-sm sm:gap-4 sm:p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--sakuin-green-soft)] text-[var(--sakuin-green)] ring-1 ring-[var(--sakuin-green)]/15 sm:h-11 sm:w-11">
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
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--sakuin-red-soft)] text-[var(--sakuin-red)] ring-1 ring-[var(--sakuin-red)]/15 sm:h-11 sm:w-11">
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
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--sakuin-primary-soft)] text-[var(--sakuin-primary)] ring-1 ring-[var(--sakuin-primary)]/15 sm:h-11 sm:w-11">
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

            {/* Kartu insight utama tetap ada di desktop, dipindah ke tab Ringkasan di mobile */}
            <div className="hidden xl:block">
              <FinancialCheckupCard
                financialCheckup={summary?.financialCheckup}
                isLoading={isLoadingSummary}
              />
            </div>



            <div className="hidden xl:block">
              <DashboardGoalsCard
                goals={goals}
                isLoading={isLoadingGoals}
                error={goalsError}
                priorityGoalId={dashboardPriorityGoalId}
              />
            </div>
          </aside>
        </div>
      </AppShell>

      <QuickTransactionModal
        open={isQuickTransactionOpen}
        onClose={() => setIsQuickTransactionOpen(false)}
        onSuccess={handleTransactionSuccess}
        initialText={quickTransactionInitialText}
      />

      <AddTransactionModal
        open={isAddTransactionOpen}
        onClose={() => setIsAddTransactionOpen(false)}
        onSuccess={handleTransactionSuccess}
      />

      {/* Modal perayaan tengah layar telah dihapus untuk kenyamanan input transaksi ulang secara langsung */}

      {/* Modal Streak Milestone */}
      {milestoneToShow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="relative w-full max-w-sm scale-95 animate-in fade-in zoom-in-95 duration-300 rounded-[var(--sakuin-radius-card)] border border-[var(--sakuin-border)] bg-white p-6 shadow-2xl text-center overflow-hidden">
            {/* Confetti Particles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="confetti-particle red"></div>
              <div className="confetti-particle blue"></div>
              <div className="confetti-particle yellow"></div>
              <div className="confetti-particle green"></div>
              <div className="confetti-particle orange"></div>
            </div>
            
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600 ring-4 ring-amber-50">
              <PiggyBank className="h-9 w-9 animate-[sakuinFloat_3s_ease-in-out_infinite]" />
            </div>
            
            <h3 className="mt-5 text-xl font-black text-[var(--sakuin-text)]">
              Habit Streak {milestoneToShow} Hari! 🎉
            </h3>
            
            <p className="mt-2.5 text-xs font-semibold leading-5 text-zinc-600">
              {milestoneToShow === 3 && "Hebat! Kamu mulai konsisten mencatat keuangan selama 3 hari berturut-turut. Kebiasaan kecil membawa dampak besar!"}
              {milestoneToShow === 7 && "Luar biasa! 1 minggu penuh tanpa terlewat. Kamu selangkah lebih dekat dengan stabilitas keuangan jangka panjang!"}
              {milestoneToShow === 30 && "Super sekali! Streak 30 hari adalah pencapaian luar biasa. Kebiasaan mencatat uang kini sudah melekat padamu!"}
            </p>
            
            <div className="mt-6 flex flex-col gap-2">
              <button
                className="w-full rounded-[var(--sakuin-radius-control)] bg-[var(--sakuin-primary)] py-3 text-sm font-black text-white transition hover:opacity-95 active:scale-95 cursor-pointer"
                onClick={() => setMilestoneToShow(null)}
                type="button"
              >
                Keren, Lanjutkan!
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
