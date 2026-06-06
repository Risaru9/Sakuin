import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
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
import {
  clearDashboardPriorityGoalId,
  getDashboardPriorityGoalId
} from "../goals/dashboard-goal-priority";
import { getSummary } from "../summary/summary.service";
import { AddTransactionModal } from "../transactions/AddTransactionModal";
import { QuickTransactionModal } from "../transactions/QuickTransactionModal";
import { getUserProfile } from "../profile/profile.service";
import { completeRemoteDailyReview } from "../reminders/reminder.service";
import {
  getErrorMessage,
  toNumber
} from "./dashboard-utils";
import {
  SummarySkeleton,
  TransactionItem
} from "./dashboard-summary-widgets";
import { FinancialRhythmCard } from "./dashboard-rhythm-card";
import { DashboardGoalsCard } from "./dashboard-goals-card";
import { FinancialCheckupCard } from "./dashboard-checkup-card";
import { DailyReviewCard, TodayViewCard } from "./dashboard-daily-cards";
import { DashboardHeroCard } from "./dashboard-hero-card";
import { DashboardAccountsCard } from "./dashboard-accounts-card";
import {
  buildPeriodDashboardMetrics,
  getAllTransactionsForPeriod,
  getDashboardPeriodLabel,
  getDashboardPeriodRange,
  parseDashboardMonth,
  parseDashboardYear,
  type DashboardPeriodMonth,
  type DashboardPeriodYear
} from "./dashboard-period";

const DASHBOARD_SUMMARY_STALE_TIME = 60_000;
const DASHBOARD_GOALS_STALE_TIME = 60_000;
const DASHBOARD_PROFILE_STALE_TIME = 5 * 60_000;

export function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

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
  const [isDashboardPeriodOpen, setIsDashboardPeriodOpen] = useState(false);
  const [quickTransactionInitialText, setQuickTransactionInitialText] = useState("");
  const [dailyReviewCompletedDate, setDailyReviewCompletedDate] = useState<
    string | null
  >(null);
  const [currentDashboardDate, setCurrentDashboardDate] = useState(
    () => new Date()
  );

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setCurrentDashboardDate(new Date());
    }, 60_000);

    return () => window.clearInterval(timerId);
  }, []);

  const selectedDashboardMonth = useMemo(
    () =>
      parseDashboardMonth(
        searchParams.get("dashboardMonth"),
        (currentDashboardDate.getMonth() + 1) as DashboardPeriodMonth
      ),
    [currentDashboardDate, searchParams]
  );

  const selectedDashboardYear = useMemo(
    () =>
      parseDashboardYear(
        searchParams.get("dashboardYear"),
        currentDashboardDate.getFullYear()
      ),
    [currentDashboardDate, searchParams]
  );

  const summaryParams = useMemo(
    () => ({
      month:
        selectedDashboardMonth === "all" ? undefined : selectedDashboardMonth,
      year: selectedDashboardYear === "all" ? undefined : selectedDashboardYear
    }),
    [selectedDashboardMonth, selectedDashboardYear]
  );

  const dashboardPeriodRange = useMemo(
    () =>
      getDashboardPeriodRange(selectedDashboardMonth, selectedDashboardYear),
    [selectedDashboardMonth, selectedDashboardYear]
  );

  function updateDashboardPeriod(nextValues: {
    month?: DashboardPeriodMonth;
    year?: DashboardPeriodYear;
  }) {
    const next = new URLSearchParams(searchParams);
    const nextMonth = nextValues.month ?? selectedDashboardMonth;
    const nextYear = nextValues.year ?? selectedDashboardYear;

    next.set("dashboardMonth", String(nextMonth));
    next.set("dashboardYear", String(nextYear));

    setSearchParams(next, { replace: true });
  }

  const summaryQuery = useQuery({
    queryKey: [...queryKeys.summary, summaryParams],
    queryFn: () => getSummary(summaryParams),
    staleTime: DASHBOARD_SUMMARY_STALE_TIME,
    refetchOnWindowFocus: false
  });

  const periodTransactionsQuery = useQuery({
    enabled: Boolean(dashboardPeriodRange),
    queryKey: [
      ...queryKeys.transactions.all,
      "dashboard-period",
      dashboardPeriodRange?.startDate,
      dashboardPeriodRange?.endDate
    ],
    queryFn: () => {
      if (!dashboardPeriodRange) {
        return [];
      }

      return getAllTransactionsForPeriod(dashboardPeriodRange);
    },
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
  const periodDashboardMetrics = useMemo(
    () =>
      dashboardPeriodRange
        ? buildPeriodDashboardMetrics(periodTransactionsQuery.data ?? [])
        : null,
    [dashboardPeriodRange, periodTransactionsQuery.data]
  );
  const dashboardTotals = periodDashboardMetrics ?? {
    totalIncome: summary?.totalIncome ?? "0.00",
    totalExpense: summary?.totalExpense ?? "0.00",
    balance: summary?.balance ?? "0.00",
    transactionCount: summary?.transactionCount ?? 0,
    recentTransactions: summary?.recentTransactions ?? []
  };
  const availableDashboardYears =
    summary?.availablePeriods?.years &&
    summary.availablePeriods.years.length > 0
      ? summary.availablePeriods.years
      : [new Date().getFullYear()];
  const latestDashboardYear =
    availableDashboardYears[0] ?? new Date().getFullYear();
  const dashboardPeriodLabel =
    summary?.period?.label ??
    getDashboardPeriodLabel(selectedDashboardMonth, selectedDashboardYear);
  const isAllTimeDashboardPeriod =
    selectedDashboardMonth === "all" && selectedDashboardYear === "all";
  const isCurrentMonthDashboardPeriod =
    selectedDashboardMonth === currentDashboardDate.getMonth() + 1 &&
    selectedDashboardYear === currentDashboardDate.getFullYear();
  const summaryBalanceLabel = isAllTimeDashboardPeriod
    ? "Total Saldo Semua Waktu"
    : isCurrentMonthDashboardPeriod
      ? "Sisa Uang Bulan Ini"
      : "Sisa Uang Periode";
  const dashboardNetBalance = toNumber(dashboardTotals.balance);
  const hasDashboardDeficit = dashboardNetBalance < 0;
  const displayedRemainingBalance = hasDashboardDeficit
    ? 0
    : dashboardNetBalance;
  const dashboardDeficitAmount = Math.abs(
    Math.min(0, dashboardNetBalance)
  );
  const isDashboardBalanceAtRisk =
    hasDashboardDeficit || Boolean(summary?.isBelowSafeLimit);

  const isLoadingPeriodTransactions =
    Boolean(dashboardPeriodRange) &&
    periodTransactionsQuery.isLoading &&
    !periodTransactionsQuery.data;
  const isLoadingSummary =
    (summaryQuery.isLoading && !summaryQuery.data) || isLoadingPeriodTransactions;
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
            {/* Ringkasan finansial utama */}
            {isLoadingSummary ? (
              <SummarySkeleton />
            ) : (
              <DashboardHeroCard
                availableYears={availableDashboardYears}
                balanceAtRisk={isDashboardBalanceAtRisk}
                balanceLabel={summaryBalanceLabel}
                belowSafeLimit={Boolean(summary?.isBelowSafeLimit)}
                deficitAmount={dashboardDeficitAmount}
                displayedBalance={displayedRemainingBalance}
                hasDeficit={hasDashboardDeficit}
                isPeriodOpen={isDashboardPeriodOpen}
                latestYear={latestDashboardYear}
                onPeriodChange={updateDashboardPeriod}
                onTogglePeriod={() =>
                  setIsDashboardPeriodOpen((current) => !current)
                }
                periodLabel={dashboardPeriodLabel}
                safeBalanceLimit={summary?.safeBalanceLimit}
                selectedMonth={selectedDashboardMonth}
                selectedYear={selectedDashboardYear}
                totalExpense={dashboardTotals.totalExpense}
                totalIncome={dashboardTotals.totalIncome}
                transactionCount={dashboardTotals.transactionCount}
              />
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
                  {dashboardTotals.recentTransactions.length > 0 ? (
                    dashboardTotals.recentTransactions.map((transaction) => (
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
                  <DashboardAccountsCard
                    transactionCount={dashboardTotals.transactionCount}
                  />
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
                          Transaksi Terbaru
                        </h2>
                        <p className="mt-1 text-xs font-medium text-zinc-600 sm:text-sm">
                          Aktivitas terakhir pada periode dashboard.
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
                      {dashboardTotals.recentTransactions.length > 0 ? (
                        dashboardTotals.recentTransactions.map((transaction) => (
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
            {/* Kartu insight utama tetap ada di desktop, dipindah ke tab Ringkasan di mobile */}
            <div className="hidden xl:block">
              <FinancialCheckupCard
                financialCheckup={summary?.financialCheckup}
                isLoading={isLoadingSummary}
              />
            </div>



            <div className="hidden xl:block">
              <DashboardAccountsCard
                transactionCount={dashboardTotals.transactionCount}
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
