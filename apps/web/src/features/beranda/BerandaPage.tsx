import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "../../components/layout/AppShell";
import { useSakuSnack } from "../../components/saku";
import { useOnlineStatus } from "../../hooks/use-online-status";
import { queryKeys } from "../../lib/query-keys";
import { useAuth } from "../auth/auth-context";
import { requestComposerFocus } from "../quick-composer/composer-bridge";
import { getSummary } from "../summary/summary.service";
import { getTodayInputValue } from "../transactions/transaction-date";
import type { Transaction } from "../transactions/transaction.types";
import { useReferenceData } from "../transactions/use-reference-data";
import {
  buildMonthView,
  describeSafeToSpend,
  fetchWholeMonth,
  formatMonthLabel,
  getMonthListParams,
  parseMonthKey,
  splitMonthKey
} from "./beranda-data";
import { BerandaEmpty, BerandaLoadError } from "./BerandaEmpty";
import { BerandaHeader } from "./BerandaHeader";
import { EditTransactionSheet } from "./EditTransactionSheet";
import { MonthPickerSheet } from "./MonthPickerSheet";
import { TransactionDayList, TransactionListSkeleton } from "./TransactionDayList";
import { usePendingTransactions } from "./use-pending-transactions";
import { useTransactionActions } from "./use-transaction-actions";

const MONTH_STALE_TIME = 60_000;
const SUMMARY_STALE_TIME = 60_000;

const timeFormatter = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" });

type BerandaPageProps = {
  /** Where the magnifier leads; the dev preview points it at its own route. */
  searchPath?: string;
};

/** Beranda = the month's notes: totals on top, entries by day, the composer at the bottom. */
export function BerandaPage({ searchPath = "/cari" }: BerandaPageProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const online = useOnlineStatus();
  const snack = useSakuSnack();
  const [monthSheetOpen, setMonthSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const todayKey = getTodayInputValue();
  const currentMonthKey = todayKey.slice(0, 7);
  const monthKey = parseMonthKey(searchParams.get("bulan"), currentMonthKey);
  const monthLabel = formatMonthLabel(monthKey);

  const { categories, accounts } = useReferenceData();
  const actions = useTransactionActions({ categories, accounts });
  const pending = usePendingTransactions(categories, accounts);

  const listParams = useMemo(() => getMonthListParams(monthKey), [monthKey]);
  const monthQuery = useQuery({
    queryKey: queryKeys.transactions.list(listParams),
    queryFn: () => fetchWholeMonth(listParams),
    staleTime: MONTH_STALE_TIME,
    refetchOnWindowFocus: false
  });
  const summaryQuery = useQuery({
    queryKey: queryKeys.summary,
    queryFn: () => getSummary(),
    staleTime: SUMMARY_STALE_TIME,
    refetchOnWindowFocus: false
  });

  const view = useMemo(
    () => buildMonthView({ items: monthQuery.data?.items ?? [], pending, monthKey, todayKey }),
    [monthQuery.data, pending, monthKey, todayKey]
  );
  const highlightIds = useMemo(() => new Set(snack?.highlightIds ?? []), [snack]);

  // The Android widget's "Catat" button opens Beranda with this flag.
  useEffect(() => {
    if (searchParams.get("widgetAction") !== "quick") {
      return;
    }

    requestComposerFocus();
    const next = new URLSearchParams(searchParams);
    next.delete("widgetAction");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  function selectMonth(nextMonthKey: string) {
    const next = new URLSearchParams(searchParams);

    if (nextMonthKey === currentMonthKey) {
      next.delete("bulan");
    } else {
      next.set("bulan", nextMonthKey);
    }

    setSearchParams(next, { replace: true });
  }

  const summary = summaryQuery.data;
  const isLoadingList = monthQuery.isPending && view.count === 0;
  const showLoadError = monthQuery.isError && !monthQuery.data && view.count === 0;
  const isEmpty = !isLoadingList && !showLoadError && view.count === 0;
  const firstTime = isEmpty && summary !== undefined && summary.transactionCount === 0;
  const firstName = user?.name?.trim().split(/\s+/)[0] ?? null;
  const earliestYear = Math.min(
    ...(summary?.availablePeriods.years ?? []),
    splitMonthKey(currentMonthKey).year
  );
  const dataTime = monthQuery.dataUpdatedAt
    ? timeFormatter.format(new Date(monthQuery.dataUpdatedAt))
    : null;

  return (
    <>
      <AppShell bleed offlineNotice="page" showQuickComposer>
        <div className="mx-auto w-full max-w-xl">
          <h1 className="sr-only">Catatan {monthLabel}</h1>
          <BerandaHeader
            emptyLabel={firstTime ? "Belum ada catatan" : null}
            isLoading={isLoadingList}
            monthLabel={monthLabel}
            offlineLabel={online ? null : `Offline${dataTime ? ` · data ${dataTime}` : ""}`}
            onOpenMonth={() => setMonthSheetOpen(true)}
            onOpenSearch={() => navigate(`${searchPath}?bulan=${monthKey}`)}
            status={
              monthKey === currentMonthKey && view.count > 0
                ? describeSafeToSpend(summary?.safeToSpend)
                : null
            }
            totals={view.totals}
            totalsUnavailable={showLoadError}
          />

          <div className="mt-1 pb-2">
            {isLoadingList ? <TransactionListSkeleton /> : null}
            {showLoadError ? (
              <BerandaLoadError
                isRetrying={monthQuery.isFetching}
                onRetry={() => void monthQuery.refetch()}
              />
            ) : null}
            {isEmpty ? (
              <BerandaEmpty firstName={firstName} firstTime={firstTime} monthLabel={monthLabel} />
            ) : null}
            {view.count > 0 ? (
              <TransactionDayList
                groups={view.groups}
                highlightIds={highlightIds}
                highlightTag={snack?.highlightTag}
                onSelect={setEditing}
              />
            ) : null}
          </div>
        </div>
      </AppShell>

      <MonthPickerSheet
        currentMonthKey={currentMonthKey}
        earliestYear={earliestYear}
        monthlyTrend={summary?.monthlyTrend ?? []}
        onClose={() => setMonthSheetOpen(false)}
        onSelect={selectMonth}
        open={monthSheetOpen}
        selectedMonthKey={monthKey}
      />

      <EditTransactionSheet
        accounts={accounts}
        categories={categories}
        onClose={() => setEditing(null)}
        onDelete={(transaction) => {
          setEditing(null);
          actions.deleteTransaction(transaction);
        }}
        onSave={(transaction, edit) => {
          setEditing(null);
          actions.updateTransaction(transaction, edit);
        }}
        todayKey={todayKey}
        transaction={editing}
      />
    </>
  );
}
