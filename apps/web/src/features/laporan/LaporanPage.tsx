import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { AppShell } from "../../components/layout/AppShell";
import {
  BottomSheet,
  CategoryBadge,
  SakuMascot,
  SakuSnackHost,
  StickerButton,
  StickerCard,
  useSakuSnack
} from "../../components/saku";
import { queryKeys } from "../../lib/query-keys";
import {
  buildMonthView,
  fetchWholeMonth,
  formatDayLabel,
  formatMonthLabel,
  formatPlainAmount,
  getMonthListParams,
  makeMonthKey,
  MONTH_NAMES,
  parseMonthKey,
  splitMonthKey,
  transactionDateKey
} from "../beranda/beranda-data";
import { EditTransactionSheet } from "../beranda/EditTransactionSheet";
import { TransactionRow } from "../beranda/TransactionDayList";
import { usePendingTransactions } from "../beranda/use-pending-transactions";
import { useTransactionActions } from "../beranda/use-transaction-actions";
import { CategoryLimitSheet } from "../categories/CategoryLimitSheet";
import { sortCategoriesForPicker } from "../categories/CategoryPickerGrid";
import type { Category } from "../categories/category.types";
import { getSummary } from "../summary/summary.service";
import { getTodayInputValue } from "../transactions/transaction-date";
import type { Transaction } from "../transactions/transaction.types";
import { useReferenceData } from "../transactions/use-reference-data";
import {
  buildBudgets,
  buildShares,
  compareWithPreviousMonth,
  previousMonthKey,
  type ReportKind
} from "./laporan-data";
import {
  BudgetList,
  IncomeVsExpenseCard,
  LaporanHeader,
  ReportEmpty,
  ReportSkeleton,
  SectionHeader,
  ShareBreakdown
} from "./LaporanParts";

const SUMMARY_STALE_TIME = 60_000;

function nextMonthKey(monthKey: string) {
  const { year, month } = splitMonthKey(monthKey);
  return month === 12 ? makeMonthKey(year + 1, 1) : makeMonthKey(year, month + 1);
}

/** Laporan: where the month's money went, how it compares, and how the budgets are doing. */
export function LaporanPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const snack = useSakuSnack();
  const [choosingCategory, setChoosingCategory] = useState(false);
  const [limitCategory, setLimitCategory] = useState<Category | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const todayKey = getTodayInputValue();
  const currentMonthKey = todayKey.slice(0, 7);
  const monthKey = parseMonthKey(searchParams.get("bulan"), currentMonthKey);
  const kind: ReportKind = searchParams.get("jenis") === "masuk" ? "INCOME" : "EXPENSE";
  const { year, month } = splitMonthKey(monthKey);
  const monthLabel = formatMonthLabel(monthKey);
  const isCurrentMonth = monthKey === currentMonthKey;

  const { categories, accounts } = useReferenceData();
  const actions = useTransactionActions({ categories, accounts });
  const pending = usePendingTransactions(categories, accounts);

  const summaryParams = useMemo(() => ({ month, year }), [month, year]);
  const summaryQuery = useQuery({
    queryKey: [...queryKeys.summary, summaryParams],
    queryFn: () => getSummary(summaryParams),
    staleTime: SUMMARY_STALE_TIME,
    refetchOnWindowFocus: false
  });

  // Only the income tab lists entries; it shares Beranda's month cache.
  const listParams = useMemo(() => getMonthListParams(monthKey), [monthKey]);
  const monthQuery = useQuery({
    queryKey: queryKeys.transactions.list(listParams),
    queryFn: () => fetchWholeMonth(listParams),
    enabled: kind === "INCOME",
    staleTime: 60_000,
    refetchOnWindowFocus: false
  });

  const summary = summaryQuery.data;
  const totalExpense = Number(summary?.totalExpense ?? 0);
  const totalIncome = Number(summary?.totalIncome ?? 0);
  const total = kind === "EXPENSE" ? totalExpense : totalIncome;
  const shares = useMemo(
    () => buildShares((kind === "EXPENSE" ? summary?.expenseByCategory : summary?.incomeByCategory) ?? []),
    [kind, summary]
  );
  const budgets = useMemo(
    () => buildBudgets(categories, summary?.expenseByCategory ?? []),
    [categories, summary]
  );
  const comparison = summary
    ? compareWithPreviousMonth({ kind, current: total, monthKey, currentMonthKey, trend: summary.monthlyTrend })
    : null;
  const incomeEntries = useMemo(
    () =>
      buildMonthView({ items: monthQuery.data?.items ?? [], pending, monthKey, todayKey })
        .groups.flatMap((group) => group.items)
        .filter((transaction) => transaction.type === "INCOME"),
    [monthQuery.data, pending, monthKey, todayKey]
  );
  const highlightIds = useMemo(() => new Set(snack?.highlightIds ?? []), [snack]);

  const earliestYear = Math.min(...(summary?.availablePeriods.years ?? [year]), year);
  const spentByCategory = new Map(
    (summary?.expenseByCategory ?? []).map((item) => [item.categoryId, Number(item.totalAmount) || 0])
  );
  const periodLabel = isCurrentMonth ? "Bulan ini" : MONTH_NAMES[month - 1];

  function updateParams(changes: { bulan?: string; jenis?: ReportKind }) {
    const next = new URLSearchParams(searchParams);

    if (changes.bulan !== undefined) {
      if (changes.bulan === currentMonthKey) {
        next.delete("bulan");
      } else {
        next.set("bulan", changes.bulan);
      }
    }

    if (changes.jenis !== undefined) {
      if (changes.jenis === "INCOME") {
        next.set("jenis", "masuk");
      } else {
        next.delete("jenis");
      }
    }

    setSearchParams(next, { replace: true });
  }

  const showError = summaryQuery.isError && !summary;

  return (
    <>
      <AppShell bleed>
        <div className="mx-auto w-full max-w-xl pb-24">
          <LaporanHeader
            canGoBack={previousMonthKey(monthKey) >= makeMonthKey(earliestYear, 1)}
            canGoForward={!isCurrentMonth}
            kind={kind}
            monthLabel={monthLabel}
            onKindChange={(nextKind) => updateParams({ jenis: nextKind })}
            onNext={() => updateParams({ bulan: nextMonthKey(monthKey) })}
            onPrevious={() => updateParams({ bulan: previousMonthKey(monthKey) })}
          />

          {summaryQuery.isPending ? <ReportSkeleton /> : null}

          {showError ? (
            <StickerCard className="mx-1 mt-8 flex flex-col items-center px-5 py-6 text-center">
              <SakuMascot animated mood="worried" size={110} />
              <h2 className="mt-2.5 font-saku-head text-2xl font-semibold">Waduh, laporan gagal dimuat</h2>
              <p className="mt-1.5 text-sm font-bold text-saku-muted">
                Sepertinya koneksi sedang putus-putus. Catatanmu tetap aman.
              </p>
              <StickerButton
                className="mt-4"
                fullWidth
                isLoading={summaryQuery.isFetching}
                onClick={() => void summaryQuery.refetch()}
              >
                <RefreshCw aria-hidden="true" className="size-[18px]" strokeWidth={2.6} />
                Coba lagi
              </StickerButton>
            </StickerCard>
          ) : null}

          {summary ? (
            <>
              <ShareBreakdown comparison={comparison} kind={kind} shares={shares} total={total} />
              {total === 0 ? (
                <ReportEmpty
                  text={
                    kind === "EXPENSE"
                      ? `Belum ada pengeluaran di ${monthLabel}.`
                      : `Belum ada pemasukan di ${monthLabel}.`
                  }
                />
              ) : null}

              {kind === "EXPENSE" ? (
                <BudgetList
                  budgets={budgets}
                  label={isCurrentMonth ? "Anggaran bulan ini" : `Anggaran ${MONTH_NAMES[month - 1]}`}
                  onManage={() => setChoosingCategory(true)}
                  onSelect={(row) => setLimitCategory(row.category)}
                />
              ) : (
                <>
                  <IncomeVsExpenseCard expense={totalExpense} income={totalIncome} />
                  {incomeEntries.length > 0 ? (
                    <section aria-label="Daftar pemasukan">
                      <SectionHeader label={`Daftar pemasukan · ${incomeEntries.length} catatan`} />
                      <ul className="px-1">
                        {incomeEntries.map((transaction, index) => (
                          <TransactionRow
                            freshTag={snack?.highlightTag}
                            isFresh={highlightIds.has(transaction.id)}
                            isLast={index === incomeEntries.length - 1}
                            key={transaction.id}
                            onSelect={setEditing}
                            subtitle={formatDayLabel(transactionDateKey(transaction), todayKey)}
                            transaction={transaction}
                          />
                        ))}
                      </ul>
                    </section>
                  ) : null}
                </>
              )}
            </>
          ) : null}
        </div>

        <div className="fixed inset-x-3 bottom-[calc(var(--sakuin-mobile-nav-height)+0.75rem)] z-40 mx-auto max-w-xl lg:bottom-6 lg:left-[296px]">
          <SakuSnackHost />
        </div>
      </AppShell>

      <BottomSheet
        onClose={() => setChoosingCategory(false)}
        open={choosingCategory}
        subtitle="Pilih kategori untuk mengatur batas bulanannya"
        title="Atur anggaran"
      >
        <ul className="flex flex-col gap-1">
          {sortCategoriesForPicker(categories, "EXPENSE").map((category) => (
            <li key={category.id}>
              <button
                className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-1 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30"
                onClick={() => {
                  setChoosingCategory(false);
                  setLimitCategory(category);
                }}
                type="button"
              >
                <CategoryBadge icon={category.icon} />
                <span className="min-w-0 flex-1 truncate text-[15px] font-extrabold">{category.name}</span>
                <span className="shrink-0 text-xs font-extrabold text-saku-muted">
                  {category.limit ? `Batas ${formatPlainAmount(category.limit)}` : "Belum ada batas"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </BottomSheet>

      <CategoryLimitSheet
        category={limitCategory}
        onClose={() => setLimitCategory(null)}
        periodLabel={periodLabel}
        spent={limitCategory ? spentByCategory.get(limitCategory.id) ?? 0 : 0}
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
