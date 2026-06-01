import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ChevronDown, ChevronUp, Clock3, Loader2, MessageSquare } from "lucide-react";
import { Button } from "../../components/ui/button";
import { getLocalDateKey } from "../../lib/daily-review";
import type { SummaryData, SummaryHabitData } from "../summary/summary.types";
import { formatRupiah, toNumber } from "./dashboard-utils";
import { TransactionItem } from "./dashboard-summary-widgets";

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

export function DailyReviewCard({
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

// WeeklyCheckinCard removed

export function TodayViewCard({
  summary,
  isLoading,
  onOpenQuickTransaction
}: {
  summary: SummaryData | null;
  isLoading: boolean;
  onOpenQuickTransaction: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const todayStr = getLocalDateKey();

  const todayTransactions = useMemo(() => {
    if (!summary?.recentTransactions) return [];
    return summary.recentTransactions.filter((tx) => getLocalDateKey(new Date(tx.date)) === todayStr);
  }, [summary?.recentTransactions, todayStr]);

  const visibleTransactions = useMemo(() => {
    return isExpanded ? todayTransactions : todayTransactions.slice(0, 5);
  }, [todayTransactions, isExpanded]);

  const todayExpenseSum = useMemo(() => {
    return todayTransactions
      .filter((tx) => tx.type === "EXPENSE")
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
  }, [todayTransactions]);

  const todayIncomeSum = useMemo(() => {
    return todayTransactions
      .filter((tx) => tx.type === "INCOME")
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
  }, [todayTransactions]);

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-3xl border border-[var(--sakuin-border)] bg-white p-6">
        <div className="flex items-center gap-2 text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin animate-spin text-[var(--sakuin-text)]" />
          <p className="text-xs font-bold">Memuat info hari ini...</p>
        </div>
      </div>
    );
  }



  const categorySummaryMap = new Map<string, { name: string; amount: number; color?: string }>();
  for (const tx of todayTransactions) {
    if (tx.type === "EXPENSE") {
      const existing = categorySummaryMap.get(tx.category.id) ?? { name: tx.category.name, amount: 0, color: tx.category.color ?? undefined };
      existing.amount += Number(tx.amount);
      categorySummaryMap.set(tx.category.id, existing);
    }
  }
  const categoryExpenses = Array.from(categorySummaryMap.values()).sort((a, b) => b.amount - a.amount);
  const maxCategoryAmount = categoryExpenses.length > 0 ? Math.max(...categoryExpenses.map(c => c.amount)) : 1;

  return (
    <div className="space-y-4">


      {/* Ringkasan Kategori Hari Ini */}
      <div className="rounded-3xl border border-[var(--sakuin-border)] bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-wider text-zinc-400">Pengeluaran Terbesar Hari Ini</p>
        {categoryExpenses.length > 0 ? (
          <div className="mt-4 space-y-3.5">
            {categoryExpenses.map((cat) => {
              const widthPercent = Math.max(8, Math.round((cat.amount / maxCategoryAmount) * 100));
              return (
                <div key={cat.name}>
                  <div className="mb-1 flex items-center justify-between text-xs font-bold text-[var(--sakuin-text)]">
                    <span>{cat.name}</span>
                    <span>{formatRupiah(cat.amount)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-[var(--sakuin-primary)]" style={{ width: `${widthPercent}%`, backgroundColor: cat.color ?? undefined }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 text-xs font-semibold text-zinc-500 font-medium">Belum ada pengeluaran hari ini. Pengeluaran yang dicatat hari ini akan terkelompok di sini.</p>
        )}
      </div>

      {/* Transaksi Hari Ini */}
      <div className="rounded-3xl border border-[var(--sakuin-border)] bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-wider text-zinc-400">Transaksi Hari Ini ({todayTransactions.length})</p>
        
        <div className="mt-4 grid gap-3">
          {todayTransactions.length > 0 ? (
            <>
              {visibleTransactions.map((tx) => (
                <TransactionItem key={tx.id} transaction={tx} />
              ))}
              
              {todayTransactions.length > 5 && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--sakuin-border)] py-2 text-xs font-black text-[var(--sakuin-text)] hover:bg-[var(--sakuin-primary-soft)] transition"
                  type="button"
                >
                  {isExpanded ? (
                    <>
                      Tutup
                      <ChevronUp className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Lihat Semua ({todayTransactions.length - 5} lainnya)
                      <ChevronDown className="h-4 w-4" />
                    </>
                  )}
                </button>
              )}
            </>
          ) : (
            <div className="rounded-2xl bg-[var(--sakuin-primary-soft)] p-5 text-center text-xs font-semibold text-zinc-600">
              Belum ada transaksi khusus hari ini.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
