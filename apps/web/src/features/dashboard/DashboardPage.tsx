import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarDays,
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
import { getTransactions } from "../transactions/transaction.service";
import type { Transaction } from "../transactions/transaction.types";
import { getUserProfile } from "../profile/profile.service";
import { completeRemoteDailyReview } from "../reminders/reminder.service";
import {
  subscribeToInstallPrompt,
  isStandaloneMode,
  type BeforeInstallPromptEvent
} from "../../lib/pwa";
import {
  formatRupiah,
  getErrorMessage,
  toNumber
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
const DASHBOARD_MONTH_OPTIONS = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" }
] as const;

type DashboardPeriodMonth =
  | (typeof DASHBOARD_MONTH_OPTIONS)[number]["value"]
  | "all";
type DashboardPeriodYear = number | "all";

function parseDashboardMonth(
  value: string | null,
  fallbackMonth: DashboardPeriodMonth
): DashboardPeriodMonth {
  if (value === "all") {
    return "all";
  }

  const numericValue = Number(value);

  if (DASHBOARD_MONTH_OPTIONS.some((month) => month.value === numericValue)) {
    return numericValue as DashboardPeriodMonth;
  }

  return fallbackMonth;
}

function parseDashboardYear(
  value: string | null,
  fallbackYear: DashboardPeriodYear
): DashboardPeriodYear {
  if (value === "all") {
    return "all";
  }

  const numericValue = Number(value);

  if (
    Number.isInteger(numericValue) &&
    numericValue >= 1900 &&
    numericValue <= 9999
  ) {
    return numericValue;
  }

  return fallbackYear;
}

function getDashboardPeriodLabel(
  month: DashboardPeriodMonth,
  year: DashboardPeriodYear
) {
  if (month !== "all" && year !== "all") {
    const monthLabel =
      DASHBOARD_MONTH_OPTIONS.find((option) => option.value === month)?.label ??
      "Bulan";

    return `${monthLabel} ${year}`;
  }

  if (year !== "all") {
    return `Tahun ${year}`;
  }

  return "Semua waktu";
}

function getDashboardPeriodRange(
  month: DashboardPeriodMonth,
  year: DashboardPeriodYear
) {
  if (month === "all" && year === "all") {
    return null;
  }

  if (year === "all") {
    return null;
  }

  if (month === "all") {
    return {
      startDate: new Date(year, 0, 1, 0, 0, 0, 0).toISOString(),
      endDate: new Date(year, 11, 31, 23, 59, 59, 999).toISOString()
    };
  }

  return {
    startDate: new Date(year, month - 1, 1, 0, 0, 0, 0).toISOString(),
    endDate: new Date(year, month, 0, 23, 59, 59, 999).toISOString()
  };
}

async function getAllTransactionsForPeriod(input: {
  startDate: string;
  endDate: string;
}) {
  const allTransactions: Transaction[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await getTransactions({
      page,
      limit: 100,
      startDate: input.startDate,
      endDate: input.endDate,
      sort: "date_desc"
    });

    allTransactions.push(...response.items);
    totalPages = response.pagination?.totalPages ?? response.meta?.totalPages ?? 1;
    page += 1;
  } while (page <= totalPages);

  return allTransactions;
}

function buildPeriodDashboardMetrics(transactions: Transaction[]) {
  const totals = transactions.reduce(
    (current, transaction) => {
      const amount = Number(transaction.amount ?? 0);

      if (transaction.type === "INCOME") {
        current.income += Number.isFinite(amount) ? amount : 0;
      }

      if (transaction.type === "EXPENSE") {
        current.expense += Number.isFinite(amount) ? amount : 0;
      }

      return current;
    },
    {
      income: 0,
      expense: 0
    }
  );

  return {
    totalIncome: totals.income.toFixed(2),
    totalExpense: totals.expense.toFixed(2),
    balance: (totals.income - totals.expense).toFixed(2),
    transactionCount: transactions.length,
    recentTransactions: transactions.slice(0, 5)
  };
}

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
            {/* Ringkasan finansial utama */}
            {isLoadingSummary ? (
              <SummarySkeleton />
            ) : (
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
                        {summaryBalanceLabel}
                      </p>
                      <span
                        className={[
                          "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black ring-1",
                          isDashboardBalanceAtRisk
                            ? "bg-amber-300/20 text-amber-50 ring-amber-100/30"
                            : "bg-emerald-300/20 text-emerald-50 ring-emerald-100/30"
                        ].join(" ")}
                      >
                        {isDashboardBalanceAtRisk ? (
                          <AlertTriangle className="sakuin-icon-shake h-3 w-3" />
                        ) : (
                          <CheckCircle2 className="sakuin-icon-bounce h-3 w-3" />
                        )}
                        {isDashboardBalanceAtRisk ? "Waspada" : "Aman"}
                      </span>
                    </div>
                  </div>

                  <button
                    aria-expanded={isDashboardPeriodOpen}
                    className="sakuin-press flex min-h-9 shrink-0 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-2.5 text-left shadow-sm backdrop-blur-md transition hover:bg-white/15 focus:outline-none focus:ring-4 focus:ring-white/20 sm:min-h-10 sm:px-3"
                    onClick={() =>
                      setIsDashboardPeriodOpen((current) => !current)
                    }
                    type="button"
                  >
                    <CalendarDays className="h-3.5 w-3.5 shrink-0 text-white" />
                    <span className="min-w-0">
                      <span className="hidden text-[9px] font-bold uppercase tracking-wide text-white/60 sm:block">
                        Periode
                      </span>
                      <span className="block max-w-24 truncate text-[11px] font-black text-white sm:max-w-36">
                        {dashboardPeriodLabel}
                      </span>
                    </span>
                    <ChevronDown
                      className={[
                        "h-3.5 w-3.5 shrink-0 text-white/80 transition-transform duration-300 motion-reduce:transition-none",
                        isDashboardPeriodOpen ? "rotate-180" : "rotate-0"
                      ].join(" ")}
                    />
                  </button>
                </div>

                <p className="relative mt-3 truncate text-[2rem] font-black leading-none tracking-[-0.04em] text-white drop-shadow-sm sm:text-[2.6rem]">
                  {formatRupiah(displayedRemainingBalance)}
                </p>
                <p
                  className={[
                    "relative mt-2 max-w-2xl text-xs font-semibold leading-5",
                    hasDashboardDeficit ? "text-amber-100" : "text-white/70"
                  ].join(" ")}
                >
                  {hasDashboardDeficit
                    ? `Defisit ${formatRupiah(dashboardDeficitAmount)}. Pengeluaran lebih besar dari pemasukan.`
                    : summary?.isBelowSafeLimit
                      ? "Saldo berada di bawah batas aman yang kamu tentukan."
                      : "Saldo masih berada di atas batas aman."}
                </p>

                {isDashboardPeriodOpen ? (
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

                            updateDashboardPeriod({
                              month: nextMonth,
                              year:
                                nextMonth === "all"
                                  ? selectedDashboardYear
                                  : selectedDashboardYear === "all"
                                    ? latestDashboardYear
                                    : selectedDashboardYear
                            });
                          }}
                          value={selectedDashboardMonth}
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

                            updateDashboardPeriod({
                              month:
                                nextYear === "all"
                                  ? "all"
                                  : selectedDashboardMonth,
                              year: nextYear
                            });
                          }}
                          value={selectedDashboardYear}
                        >
                          <option value="all">Semua tahun</option>
                          {availableDashboardYears.map((year) => (
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
                      {formatRupiah(dashboardTotals.totalIncome)}
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
                      {formatRupiah(dashboardTotals.totalExpense)}
                    </p>
                  </div>
                </div>

                <div className="relative mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/15 pt-3 text-[11px] font-semibold text-white/70">
                  <div className="inline-flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-blue-100" />
                    <span>
                      {dashboardTotals.transactionCount} transaksi
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-1.5">
                    <PiggyBank className="h-3.5 w-3.5 text-blue-100" />
                    <span>
                      Batas aman {formatRupiah(summary?.safeBalanceLimit)}
                    </span>
                  </div>
                </div>
              </section>
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
