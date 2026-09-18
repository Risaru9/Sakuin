import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "../../components/layout/AppShell";
import {
  CategoryBadge,
  SakuMascot,
  SegmentedControl,
  StickerButton,
  StickerCard
} from "../../components/saku";
import { cn } from "../../lib/cn";
import { queryKeys } from "../../lib/query-keys";
import { formatPlainAmount, MONTH_NAMES, splitMonthKey } from "../beranda/beranda-data";
import { CategoryLimitSheet } from "../categories/CategoryLimitSheet";
import type { Category, CategoryType } from "../categories/category.types";
import { NewCategorySheet } from "../categories/NewCategorySheet";
import { getBudgetStatus, type BudgetStatus } from "../laporan/laporan-data";
import { getSummary } from "../summary/summary.service";
import { getTodayInputValue } from "../transactions/transaction-date";
import { useReferenceData } from "../transactions/use-reference-data";
import { FloatingSnackHost, SubPageHeader } from "./SubPageParts";

type CategoryRow = {
  category: Category;
  spent: number;
  limit: number | null;
  status: BudgetStatus | null;
  percent: number;
};

const BAR_CLASS: Record<BudgetStatus, string> = {
  ok: "bg-saku-accent",
  watch: "bg-saku-watch",
  over: "bg-saku-over"
};

/** Every category of one kind with this month's spending, those with a limit showing a bar. */
export function buildCategoryRows(
  categories: Category[],
  type: CategoryType,
  items: Array<{ categoryId: string; totalAmount: string }>
): CategoryRow[] {
  const spentById = new Map(items.map((item) => [item.categoryId, Number(item.totalAmount) || 0]));

  return categories
    .filter((category) => category.type === type)
    .map((category) => {
      const spent = spentById.get(category.id) ?? 0;
      const limit = type === "EXPENSE" && category.limit && category.limit > 0 ? category.limit : null;

      return {
        category,
        spent,
        limit,
        status: limit ? getBudgetStatus(spent, limit) : null,
        percent: limit ? Math.min(100, Math.round((spent / limit) * 100)) : 0
      };
    })
    .sort((first, second) => second.spent - first.spent || first.category.name.localeCompare(second.category.name, "id"));
}

function StatusBadge({ status }: { status: BudgetStatus | null }) {
  if (status === "over") {
    return (
      <span className="saku-line-hair shrink-0 rounded-full bg-saku-over-soft px-1.5 text-[10px] font-black text-saku-over-text">
        lewat
      </span>
    );
  }

  if (status === "watch") {
    return <span className="saku-line-hair shrink-0 rounded-full bg-saku-coin-soft px-1.5 text-[10px] font-black">hampir</span>;
  }

  return null;
}

/** Kategori dan batas: all categories, this month's use, and a tap to set a monthly limit. */
export function KategoriPage() {
  const [type, setType] = useState<CategoryType>("EXPENSE");
  const [limitCategory, setLimitCategory] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);

  const monthKey = getTodayInputValue().slice(0, 7);
  const { year, month } = splitMonthKey(monthKey);
  const summaryParams = useMemo(() => ({ month, year }), [month, year]);

  const { categories, categoriesQuery } = useReferenceData();
  // Same cache entry as Laporan for the current month.
  const summaryQuery = useQuery({
    queryKey: [...queryKeys.summary, summaryParams],
    queryFn: () => getSummary(summaryParams),
    staleTime: 60_000,
    refetchOnWindowFocus: false
  });

  const expenseRows = useMemo(
    () => buildCategoryRows(categories, "EXPENSE", summaryQuery.data?.expenseByCategory ?? []),
    [categories, summaryQuery.data]
  );
  const incomeRows = useMemo(
    () => buildCategoryRows(categories, "INCOME", summaryQuery.data?.incomeByCategory ?? []),
    [categories, summaryQuery.data]
  );
  const rows = type === "EXPENSE" ? expenseRows : incomeRows;
  const limitedCount = expenseRows.filter((row) => row.limit).length;
  const limitRow = limitCategory ? expenseRows.find((row) => row.category.id === limitCategory.id) : null;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-xl pb-4">
        <SubPageHeader addLabel="Tambah kategori" onAdd={() => setCreating(true)} title="Kategori" />

        <SegmentedControl
          ariaLabel="Jenis kategori"
          className="mt-3.5"
          onChange={setType}
          options={[
            { value: "EXPENSE", label: `Pengeluaran (${expenseRows.length})` },
            { value: "INCOME", label: `Pemasukan (${incomeRows.length})` }
          ]}
          value={type}
        />

        <p className="mx-1 mt-3 mb-2 text-[13px] font-extrabold text-saku-muted">
          {type === "EXPENSE"
            ? `Batas bulan ${MONTH_NAMES[month - 1]} · ${
                limitedCount > 0 ? `${limitedCount} kategori punya batas` : "belum ada batas"
              }`
            : `Pemasukan bulan ${MONTH_NAMES[month - 1]}`}
        </p>

        {categoriesQuery.isPending ? (
          <div aria-hidden="true" className="h-[360px] animate-pulse rounded-saku-card bg-saku-dash/40" />
        ) : null}

        {categoriesQuery.isError ? (
          <StickerCard className="flex items-center gap-3 p-4">
            <SakuMascot mood="worried" size={56} />
            <p className="min-w-0 flex-1 font-black">Kategori belum termuat</p>
            <StickerButton onClick={() => void categoriesQuery.refetch()} size="md" variant="plain">
              Coba lagi
            </StickerButton>
          </StickerCard>
        ) : null}

        {rows.length > 0 ? (
          <StickerCard className="overflow-hidden">
            <ul>
              {rows.map((row, index) => {
                const isLast = index === rows.length - 1;
                const content = (
                  <>
                    <CategoryBadge icon={row.category.icon} />
                    <span className={cn("min-w-0 flex-1 py-2.5", !isLast && "saku-dash-bottom")}>
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[15px] font-black">{row.category.name}</span>
                        {row.category.isDefault === false ? (
                          <span className="saku-line-hair shrink-0 rounded-full bg-[#dff3ff] px-1.5 text-[10px] font-black">
                            buatanmu
                          </span>
                        ) : null}
                        <StatusBadge status={row.status} />
                        <span className="ml-auto shrink-0 pl-1 font-saku-head text-sm font-semibold">
                          {formatPlainAmount(row.spent)}
                          {row.limit ? (
                            <span className="font-saku-body text-xs font-bold text-saku-muted">
                              {" "}
                              / {formatPlainAmount(row.limit)}
                            </span>
                          ) : null}
                        </span>
                      </span>
                      {row.limit && row.status ? (
                        <span className="saku-line-thin mt-1.5 block h-2.5 overflow-hidden rounded-full bg-saku-paper">
                          <span
                            className={cn("block h-full", BAR_CLASS[row.status], row.percent < 100 && "border-r-2 border-saku-ink")}
                            style={{ width: `${row.percent}%` }}
                          />
                        </span>
                      ) : type === "EXPENSE" ? (
                        <span className="mt-1 inline-flex min-h-7 items-center rounded-full border-[1.5px] border-dashed border-saku-muted bg-saku-bg px-2.5 text-xs font-black text-saku-muted">
                          + Atur batas
                        </span>
                      ) : null}
                    </span>
                  </>
                );

                return (
                  <li key={row.category.id}>
                    {type === "EXPENSE" ? (
                      <button
                        aria-label={`${row.category.name}: ${formatPlainAmount(row.spent)}${
                          row.limit ? ` dari batas ${formatPlainAmount(row.limit)}` : ", belum ada batas"
                        }. Ketuk untuk mengatur batas.`}
                        className="flex w-full items-center gap-3 px-3 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-saku-accent/30"
                        onClick={() => setLimitCategory(row.category)}
                        type="button"
                      >
                        {content}
                      </button>
                    ) : (
                      <div className="flex items-center gap-3 px-3">{content}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </StickerCard>
        ) : null}
      </div>

      <FloatingSnackHost />

      <CategoryLimitSheet
        category={limitCategory}
        onClose={() => setLimitCategory(null)}
        periodLabel="Bulan ini"
        spent={limitRow?.spent ?? 0}
      />
      <NewCategorySheet
        initialType={type}
        onClose={() => setCreating(false)}
        onCreated={() => undefined}
        open={creating}
      />
    </AppShell>
  );
}
