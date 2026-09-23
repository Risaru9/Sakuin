import { useMemo, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, ChevronDown, Plus, Search, X } from "lucide-react";
import { AppShell } from "../../components/layout/AppShell";
import {
  BottomSheet,
  CategoryBadge,
  SakuMascot,
  SakuSnackHost,
  StickerButton,
  StickerChip,
  useSakuSnack
} from "../../components/saku";
import { queryKeys } from "../../lib/query-keys";
import { sortCategoriesForPicker } from "../categories/CategoryPickerGrid";
import { requestComposerFocus } from "../quick-composer/composer-bridge";
import { getSummary } from "../summary/summary.service";
import { getTodayInputValue } from "../transactions/transaction-date";
import type { Transaction } from "../transactions/transaction.types";
import { useReferenceData } from "../transactions/use-reference-data";
import {
  buildMonthView,
  fetchWholeMonth,
  formatDayLabel,
  formatPlainAmount,
  getMonthListParams,
  MONTH_NAMES,
  parseMonthKey,
  searchMonthView,
  splitMonthKey,
  transactionDateKey
} from "./beranda-data";
import { EditTransactionSheet } from "./EditTransactionSheet";
import { MonthPickerSheet } from "./MonthPickerSheet";
import { DayHeader, TransactionListSkeleton, TransactionRow } from "./TransactionDayList";
import { usePendingTransactions } from "./use-pending-transactions";
import { getTransactionName, useTransactionActions } from "./use-transaction-actions";

type TypeFilter = "ALL" | "EXPENSE" | "INCOME";

const TYPE_FILTERS: Array<{ value: TypeFilter; label: string }> = [
  { value: "ALL", label: "Semua" },
  { value: "EXPENSE", label: "Keluar" },
  { value: "INCOME", label: "Masuk" }
];

function markMatch(text: string, query: string): ReactNode {
  const needle = query.trim().toLowerCase();
  const start = needle ? text.toLowerCase().indexOf(needle) : -1;

  if (start === -1) {
    return text;
  }

  return (
    <>
      {text.slice(0, start)}
      <mark className="rounded bg-saku-coin px-0.5 text-saku-ink">
        {text.slice(start, start + needle.length)}
      </mark>
      {text.slice(start + needle.length)}
    </>
  );
}

type SearchPageProps = {
  /** Where "back" and "Catat …" lead; the dev preview points it at its own route. */
  homePath?: string;
};

/** "Cari": filter the chosen month by words, type and category while typing. */
export function SearchPage({ homePath = "/dashboard" }: SearchPageProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const snack = useSakuSnack();
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [monthSheetOpen, setMonthSheetOpen] = useState(false);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const todayKey = getTodayInputValue();
  const currentMonthKey = todayKey.slice(0, 7);
  const monthKey = parseMonthKey(searchParams.get("bulan"), currentMonthKey);
  const { month: monthNumber, year } = splitMonthKey(monthKey);

  const { categories } = useReferenceData();
  const actions = useTransactionActions({ categories });
  const pending = usePendingTransactions(categories);

  const listParams = useMemo(() => getMonthListParams(monthKey), [monthKey]);
  const monthQuery = useQuery({
    queryKey: queryKeys.transactions.list(listParams),
    queryFn: () => fetchWholeMonth(listParams),
    staleTime: 60_000,
    refetchOnWindowFocus: false
  });
  const summaryQuery = useQuery({
    queryKey: queryKeys.summary,
    queryFn: () => getSummary(),
    staleTime: 60_000,
    refetchOnWindowFocus: false
  });

  const view = useMemo(
    () => buildMonthView({ items: monthQuery.data?.items ?? [], pending, monthKey, todayKey }),
    [monthQuery.data, pending, monthKey, todayKey]
  );
  const results = useMemo(
    () => searchMonthView(view, { query, type: typeFilter, categoryId }),
    [view, query, typeFilter, categoryId]
  );
  const highlightIds = useMemo(() => new Set(snack?.highlightIds ?? []), [snack]);
  const selectedCategory = categories.find((category) => category.id === categoryId) ?? null;

  const totals = results.reduce(
    (sum, transaction) => {
      const amount = Number(transaction.amount) || 0;
      return transaction.type === "INCOME"
        ? { ...sum, income: sum.income + amount }
        : { ...sum, expense: sum.expense + amount };
    },
    { expense: 0, income: 0 }
  );
  const summaryParts = [`${results.length} transaksi`];

  if (totals.expense > 0) {
    summaryParts.push(`keluar ${formatPlainAmount(totals.expense)}`);
  }

  if (totals.income > 0) {
    summaryParts.push(`masuk ${formatPlainAmount(totals.income)}`);
  }

  const isLoading = monthQuery.isPending && view.count === 0;
  const trimmedQuery = query.trim();

  function changeMonth(nextMonthKey: string) {
    const next = new URLSearchParams(searchParams);
    next.set("bulan", nextMonthKey);
    setSearchParams(next, { replace: true });
  }

  function goHome() {
    navigate(monthKey === currentMonthKey ? homePath : `${homePath}?bulan=${monthKey}`);
  }

  function recordQuery() {
    requestComposerFocus({ text: `${trimmedQuery} ` });
    goHome();
  }

  const rows: ReactNode[] = [];
  results.forEach((transaction, index) => {
    const dateKey = transactionDateKey(transaction);
    const previous = results[index - 1];
    const next = results[index + 1];

    if (!previous || transactionDateKey(previous) !== dateKey) {
      const dayExpense = results
        .filter((item) => item.type === "EXPENSE" && transactionDateKey(item) === dateKey)
        .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

      rows.push(
        <li key={`day-${dateKey}`}>
          <DayHeader
            label={formatDayLabel(dateKey, todayKey)}
            trailing={dayExpense > 0 ? `Keluar ${formatPlainAmount(dayExpense)}` : undefined}
          />
        </li>
      );
    }

    rows.push(
      <TransactionRow
        freshTag={snack?.highlightTag}
        isFresh={highlightIds.has(transaction.id)}
        isLast={!next || transactionDateKey(next) !== dateKey}
        key={transaction.id}
        onSelect={setEditing}
        subtitle={transaction.category.name}
        title={markMatch(getTransactionName(transaction), trimmedQuery)}
        transaction={transaction}
      />
    );
  });

  return (
    <>
      <AppShell bleed mobileNav={false}>
        <div className="mx-auto w-full max-w-xl pb-24">
          <h1 className="sr-only">Cari catatan</h1>
          <div className="mt-2 flex items-center gap-2.5 sm:mt-0">
            <button
              aria-label="Kembali ke catatan"
              className="saku-line-thin saku-press flex size-11 shrink-0 items-center justify-center rounded-full bg-white shadow-saku-xs focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30"
              onClick={() => goHome()}
              type="button"
            >
              <ArrowLeft aria-hidden="true" className="size-[18px]" strokeWidth={2.6} />
            </button>
            <div className="saku-line flex min-h-[50px] min-w-0 flex-1 items-center gap-2 rounded-full bg-white pr-1.5 pl-3.5 shadow-saku-sm focus-within:ring-4 focus-within:ring-saku-accent/30">
              <Search aria-hidden="true" className="size-[18px] shrink-0" strokeWidth={2.6} />
              <input
                aria-label="Cari catatan atau kategori"
                autoFocus
                className="min-w-0 flex-1 bg-transparent text-[15px] font-extrabold outline-none placeholder:font-bold placeholder:text-saku-muted [&::-webkit-search-cancel-button]:appearance-none"
                enterKeyHint="search"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari catatan atau kategori"
                type="search"
                value={query}
              />
              {query ? (
                <button
                  aria-label="Hapus pencarian"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-saku-bg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30"
                  onClick={() => setQuery("")}
                  type="button"
                >
                  <X aria-hidden="true" className="size-[15px]" strokeWidth={2.8} />
                </button>
              ) : null}
            </div>
          </div>

          <div
            aria-label="Saring hasil"
            className="-mx-3 mt-3 flex gap-2 overflow-x-auto px-3 pt-0.5 pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="group"
          >
            <StickerChip
              leading={<CalendarDays aria-hidden="true" className="size-4" />}
              onClick={() => setMonthSheetOpen(true)}
              trailing={<ChevronDown aria-hidden="true" className="size-3.5" strokeWidth={2.6} />}
            >
              {monthKey === currentMonthKey
                ? MONTH_NAMES[monthNumber - 1]
                : `${MONTH_NAMES[monthNumber - 1]} ${year}`}
            </StickerChip>
            {TYPE_FILTERS.map((filter) => (
              <StickerChip
                active={typeFilter === filter.value}
                key={filter.value}
                onClick={() => {
                  setTypeFilter(filter.value);
                  if (selectedCategory && filter.value !== "ALL" && selectedCategory.type !== filter.value) {
                    setCategoryId(null);
                  }
                }}
              >
                {filter.label}
              </StickerChip>
            ))}
            <StickerChip
              active={Boolean(selectedCategory)}
              leading={selectedCategory ? <CategoryBadge icon={selectedCategory.icon} name={selectedCategory.name} size={24} /> : undefined}
              onClick={() => setCategorySheetOpen(true)}
              trailing={<ChevronDown aria-hidden="true" className="size-3.5" strokeWidth={2.6} />}
            >
              {selectedCategory?.name ?? "Kategori"}
            </StickerChip>
          </div>

          {isLoading ? <TransactionListSkeleton /> : null}

          {!isLoading && results.length > 0 ? (
            <>
              <p aria-live="polite" className="mt-2 px-2 text-[13px] font-extrabold text-saku-muted">
                {summaryParts.join(" · ")}
              </p>
              <ul className="px-1">{rows}</ul>
            </>
          ) : null}

          {!isLoading && results.length === 0 ? (
            <div className="mt-14 flex flex-col items-center px-8 text-center">
              <SakuMascot animated mood="worried" size={120} />
              <p aria-live="polite" className="mt-3.5 font-saku-head text-[22px] leading-7 font-semibold">
                {trimmedQuery ? `Belum ada catatan “${trimmedQuery}”` : "Belum ada catatan yang cocok"}
              </p>
              <p className="mt-1.5 text-sm font-bold text-saku-muted">
                {trimmedQuery ? "Coba kata lain, atau langsung catat sekarang." : "Coba bulan atau saringan lain."}
              </p>
              {trimmedQuery ? (
                <StickerButton className="mt-4" onClick={recordQuery} variant="coin">
                  <Plus aria-hidden="true" className="size-[18px]" strokeWidth={3} />
                  Catat “{trimmedQuery}”
                </StickerButton>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="fixed inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-xl lg:left-[296px]">
          <SakuSnackHost />
        </div>
      </AppShell>

      <MonthPickerSheet
        currentMonthKey={currentMonthKey}
        earliestYear={Math.min(...(summaryQuery.data?.availablePeriods.years ?? []), year)}
        monthlyTrend={summaryQuery.data?.monthlyTrend ?? []}
        onClose={() => setMonthSheetOpen(false)}
        onSelect={changeMonth}
        open={monthSheetOpen}
        selectedMonthKey={monthKey}
      />

      <BottomSheet
        onClose={() => setCategorySheetOpen(false)}
        open={categorySheetOpen}
        subtitle="Tampilkan catatan dari satu kategori saja"
        title="Saring kategori"
      >
        <div className="flex flex-wrap gap-2">
          <StickerChip
            active={categoryId === null}
            onClick={() => {
              setCategoryId(null);
              setCategorySheetOpen(false);
            }}
          >
            Semua kategori
          </StickerChip>
          {(typeFilter === "ALL"
            ? [...sortCategoriesForPicker(categories, "EXPENSE"), ...sortCategoriesForPicker(categories, "INCOME")]
            : sortCategoriesForPicker(categories, typeFilter)
          ).map((category) => (
            <StickerChip
              active={category.id === categoryId}
              key={category.id}
              leading={<CategoryBadge icon={category.icon} name={category.name} size={24} />}
              onClick={() => {
                setCategoryId(category.id);
                setCategorySheetOpen(false);
              }}
            >
              {category.name}
            </StickerChip>
          ))}
        </div>
      </BottomSheet>

      <EditTransactionSheet
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
