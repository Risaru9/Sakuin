import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowLeft,
  ArrowRight,
  ArrowUpCircle,
  Edit3,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCcw,
  Search,
  Trash2
} from "lucide-react";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { AppShell } from "../../components/layout/AppShell";
import { useToast } from "../../components/toast/ToastProvider";
import { Button } from "../../components/ui/button";
import { ApiClientError } from "../../lib/api-client";
import { queryKeys } from "../../lib/query-keys";
import { getCategories } from "../categories/category.service";
import { AddTransactionModal } from "./AddTransactionModal";
import { EditTransactionModal } from "./EditTransactionModal";
import { QuickTransactionModal } from "./QuickTransactionModal";
import { deleteTransaction, getTransactions } from "./transaction.service";
import {
  getSummaryCacheSnapshot,
  markTransactionDerivedDataStale,
  removeTransactionFromListCaches,
  removeTransactionFromSummaryCache,
  restoreSummaryCacheSnapshot
} from "./transaction-cache";
import type {
  Transaction,
  TransactionListResponse,
  TransactionPagination,
  TransactionSort,
  TransactionType
} from "./transaction.types";

type TransactionFilter = "ALL" | TransactionType;

const DEFAULT_PAGINATION: TransactionPagination = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0
};

const limitOptions = [10, 20, 50, 100] as const;

const sortOptions: Array<{
  value: TransactionSort;
  label: string;
}> = [
  {
    value: "date_desc",
    label: "Tanggal terbaru, input terbaru"
  },
  {
    value: "date_asc",
    label: "Tanggal terlama, input terbaru"
  },
  {
    value: "created_desc",
    label: "Input terbaru"
  },
  {
    value: "created_asc",
    label: "Input terlama"
  }
];

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

function getPaginationLabel(pagination: TransactionPagination) {
  const safeTotalPages = Math.max(pagination.totalPages, 1);

  return `Halaman ${pagination.page} dari ${safeTotalPages}`;
}

function getTransactionListPagination(
  data: TransactionListResponse | undefined,
  fallback: TransactionPagination
) {
  return data?.pagination ?? data?.meta ?? fallback;
}

function TransactionRow({
  transaction,
  onEdit,
  onDelete,
  isDeleting
}: {
  transaction: Transaction;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  isDeleting: boolean;
}) {
  const isIncome = transaction.type === "INCOME";
  const amountText = `${isIncome ? "+" : "-"} ${formatRupiah(
    transaction.amount
  )}`;

  return (
    <div className="rounded-[1.35rem] border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow-md sm:rounded-2xl sm:p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
          <div
            className={
              isIncome
                ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 sm:h-11 sm:w-11"
                : "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 sm:h-11 sm:w-11"
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
            <p className="mt-0.5 truncate text-xs font-medium text-slate-500 sm:mt-1">
              {transaction.category.name} · {formatDate(transaction.date)}
            </p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-[110px_1fr_180px] sm:items-center xl:w-[520px]">
          <div className="flex items-center justify-between gap-2 sm:block">
            <span
              className={
                isIncome
                  ? "inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-700 sm:px-3 sm:text-xs"
                  : "inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-black text-rose-700 sm:px-3 sm:text-xs"
              }
            >
              {isIncome ? "Income" : "Expense"}
            </span>

            <p
              className={
                isIncome
                  ? "text-right text-xs font-black text-emerald-700 sm:hidden"
                  : "text-right text-xs font-black text-rose-700 sm:hidden"
              }
            >
              {amountText}
            </p>
          </div>

          <p
            className={
              isIncome
                ? "hidden text-sm font-black text-emerald-700 sm:block sm:text-right"
                : "hidden text-sm font-black text-rose-700 sm:block sm:text-right"
            }
          >
            {amountText}
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-2xl bg-slate-100 px-3 text-xs font-black text-slate-700 transition hover:bg-slate-200 sm:min-h-10 sm:gap-2"
              onClick={() => onEdit(transaction)}
              type="button"
            >
              <Edit3 className="h-4 w-4" />
              Edit
            </button>

            <button
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-2xl bg-rose-50 px-3 text-xs font-black text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-10 sm:gap-2"
              disabled={isDeleting}
              onClick={() => onDelete(transaction)}
              type="button"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Hapus
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TransactionsPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<TransactionFilter>("ALL");
  const [categoryId, setCategoryId] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sort, setSort] = useState<TransactionSort>("date_desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isQuickOpen, setIsQuickOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] =
    useState<Transaction | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const transactionParams = useMemo(
    () => ({
      page,
      limit,
      type: filter === "ALL" ? undefined : filter,
      categoryId: categoryId || undefined,
      search: debouncedSearch || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      sort
    }),
    [page, limit, filter, categoryId, debouncedSearch, startDate, endDate, sort]
  );

  const categoriesQuery = useQuery({
  queryKey: queryKeys.categories,
  queryFn: () => getCategories(),
  staleTime: 5 * 60_000,
  refetchOnWindowFocus: false
});

const transactionsQuery = useQuery({
  queryKey: queryKeys.transactions.list(transactionParams),
  queryFn: () => getTransactions(transactionParams),
  placeholderData: (previousData) => previousData,
  staleTime: 30_000,
  refetchOnWindowFocus: false
});

  const categories = categoriesQuery.data ?? [];
  const transactions = transactionsQuery.data?.items ?? [];
  const pagination = getTransactionListPagination(
    transactionsQuery.data,
    DEFAULT_PAGINATION
  );

  const isLoading =
    transactionsQuery.isLoading && !transactionsQuery.data;
  const isBackgroundFetching =
    transactionsQuery.isFetching && Boolean(transactionsQuery.data);

  const isLoadingCategories =
    categoriesQuery.isLoading && !categoriesQuery.data;

  const error =
    transactionsQuery.error && !transactionsQuery.data
      ? getErrorMessage(transactionsQuery.error)
      : null;

  const categoryError =
    categoriesQuery.error && !categoriesQuery.data
      ? getErrorMessage(categoriesQuery.error)
      : null;

  const categoryOptions = useMemo(() => {
    if (filter === "ALL") {
      return categories;
    }

    return categories.filter((category) => category.type === filter);
  }, [categories, filter]);

  const hasActiveFilter =
    filter !== "ALL" ||
    categoryId.length > 0 ||
    debouncedSearch.length > 0 ||
    startDate.length > 0 ||
    endDate.length > 0 ||
    sort !== "date_desc" ||
    limit !== 10;

  const deleteMutation = useMutation({
    mutationFn: async (transaction: Transaction) => {
      return deleteTransaction(transaction.id);
    },
    onMutate: async (transaction) => {
      setTransactionToDelete(null);
      setDeleteError(null);

      await queryClient.cancelQueries({
        queryKey: queryKeys.transactions.all
      });

      const previousTransactionQueries =
      queryClient.getQueriesData<TransactionListResponse>({
        queryKey: queryKeys.transactions.all
      });
    const previousSummary = getSummaryCacheSnapshot(queryClient);

    removeTransactionFromListCaches(queryClient, transaction.id);
    removeTransactionFromSummaryCache(queryClient, transaction);

    return {
      previousTransactionQueries,
      previousSummary,
      deletedTransactionName: transaction.note || transaction.category.name
    };
    },

    onError: (caughtError, _transaction, context) => {
      if (context?.previousTransactionQueries) {
        for (const [queryKey, data] of context.previousTransactionQueries) {
          queryClient.setQueryData(queryKey, data);
        }
      }

      restoreSummaryCacheSnapshot(queryClient, context?.previousSummary);

      const message = getErrorMessage(caughtError);

      setDeleteError(message);

      addToast({
        variant: "error",
        title: "Gagal menghapus transaksi",
        description: message
      });
    },
    onSuccess: (_data, _transaction, context) => {
      addToast({
        variant: "success",
        title: "Transaksi berhasil dihapus",
        description: `"${context?.deletedTransactionName ?? "Transaksi"}" sudah dihapus dari daftar transaksi.`
      });
    },
    onSettled: () => {
      markTransactionDerivedDataStale(queryClient);
    }
  });

  function resetFilters() {
    setFilter("ALL");
    setCategoryId("");
    setSearch("");
    setDebouncedSearch("");
    setStartDate("");
    setEndDate("");
    setSort("date_desc");
    setLimit(10);
    setPage(1);
  }

  function handleOpenDeleteDialog(transaction: Transaction) {
    setDeleteError(null);
    setTransactionToDelete(transaction);
  }

  function handleCloseDeleteDialog() {
    if (deleteMutation.isPending) {
      return;
    }

    setTransactionToDelete(null);
    setDeleteError(null);
  }

  function handleConfirmDelete() {
    if (!transactionToDelete) {
      return;
    }

    deleteMutation.mutate(transactionToDelete);
  }

  function refreshTransactionData() {
    // Mutation handlers already update transaction cache instantly
    // and mark derived data stale in the background.
  }

  function retryTransactions() {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.transactions.all
    });
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [search]);

  useEffect(() => {
    if (!categoryId) {
      return;
    }

    const categoryStillExists = categoryOptions.some(
      (category) => category.id === categoryId
    );

    if (!categoryStillExists) {
      setCategoryId("");
      setPage(1);
    }
  }, [categoryId, categoryOptions]);

  const canGoToPreviousPage = pagination.page > 1;
  const canGoToNextPage =
    pagination.totalPages > 0 && pagination.page < pagination.totalPages;

  const deleteDialogDescription = deleteError
    ? `Gagal menghapus transaksi: ${deleteError}`
    : `Transaksi "${
        transactionToDelete?.note ||
        transactionToDelete?.category.name ||
        "ini"
      }" akan dihapus permanen dan tidak bisa dikembalikan.`;

  return (
    <>
      <AppShell>
        <header className="mb-4 flex flex-col gap-3 sm:mb-7 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
            <p className="text-sm font-black text-indigo-700">
              Sakuin Transactions
            </p>
            <h1 className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Kelola Transaksi
            </h1>
            <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">
              Edit, hapus, filter, dan telusuri transaksi keuanganmu.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <Button
              className="rounded-2xl"
              onClick={() => setIsQuickOpen(true)}
              size="md"
              type="button"
              variant="secondary"
            >
              <MessageSquare className="h-4 w-4" />
              Catat Cepat
            </Button>

            <Button
              className="rounded-2xl bg-slate-950 text-white hover:bg-black"
              onClick={() => setIsAddOpen(true)}
              size="md"
              type="button"
            >
              <Plus className="h-4 w-4" />
              Tambah Transaksi
            </Button>
          </div>
        </header>

        <section className="mb-4 rounded-[1.5rem] border border-slate-200 bg-white p-3.5 shadow-sm sm:mb-5 sm:rounded-[1.75rem] sm:p-4">
          <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                Cari transaksi
              </span>

              <div className="relative mt-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="min-h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
                  placeholder="Cari catatan transaksi..."
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                Kategori
              </span>

              <select
                className="mt-1 min-h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
                value={categoryId}
                onChange={(event) => {
                  setCategoryId(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">
                  {isLoadingCategories
                    ? "Mengambil kategori..."
                    : "Semua kategori"}
                </option>

                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name} ·{" "}
                    {category.type === "INCOME" ? "Income" : "Expense"}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                Tanggal mulai
              </span>

              <input
                aria-label="Tanggal mulai transaksi"
                className="mt-1 min-h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
                type="date"
                value={startDate}
                onChange={(event) => {
                  setStartDate(event.target.value);
                  setPage(1);
                }}
              />

              <p className="mt-1 hidden text-xs font-medium text-slate-400 sm:block">
                Mulai dari tanggal ini.
              </p>
            </label>

            <label className="block">
              <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                Tanggal akhir
              </span>

              <input
                aria-label="Tanggal akhir transaksi"
                className="mt-1 min-h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
                type="date"
                value={endDate}
                onChange={(event) => {
                  setEndDate(event.target.value);
                  setPage(1);
                }}
              />

              <p className="mt-1 hidden text-xs font-medium text-slate-400 sm:block">
                Sampai tanggal ini.
              </p>
            </label>
          </div>

          <div className="mt-3 hidden rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:block">
            <p className="text-xs font-medium leading-relaxed text-slate-500">
              Filter tanggal bersifat opsional. Kosongkan tanggal mulai atau tanggal
              akhir jika ingin menampilkan transaksi tanpa batas rentang tertentu.
            </p>
          </div>

          <div className="mt-3 grid gap-2.5 xl:grid-cols-[1fr_220px_180px_auto] xl:items-center">
            <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-slate-100 p-1">
              {(["ALL", "INCOME", "EXPENSE"] as const).map((item) => (
                <button
                  className={
                    filter === item
                     ? "rounded-xl bg-slate-950 px-2.5 py-2 text-[11px] font-black text-white sm:px-3 sm:text-xs"
                     : "rounded-xl px-2.5 py-2 text-[11px] font-black text-slate-600 hover:bg-white sm:px-3 sm:text-xs"
                  }
                  key={item}
                  onClick={() => {
                    setFilter(item);
                    setCategoryId("");
                    setPage(1);
                  }}
                  type="button"
                >
                  {item === "ALL" ? "Semua" : item}
                </button>
              ))}
            </div>

            <label className="block">
              <span className="sr-only">Urutkan transaksi</span>
              <select
                className="min-h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value as TransactionSort);
                  setPage(1);
                }}
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="sr-only">Jumlah transaksi per halaman</span>
              <select
                className="min-h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
                value={limit}
                onChange={(event) => {
                  setLimit(Number(event.target.value));
                  setPage(1);
                }}
              >
                {limitOptions.map((option) => (
                  <option key={option} value={option}>
                    {option} / halaman
                  </option>
                ))}
              </select>
            </label>

            <Button
              disabled={!hasActiveFilter}
              onClick={resetFilters}
              type="button"
              variant="secondary"
            >
              <RefreshCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>

          {categoryError ? (
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              {categoryError}
            </div>
          ) : null}

          <div className="mt-3 flex flex-col gap-2 text-xs font-medium text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Total data:{" "}
              <span className="font-black text-slate-700">
                {pagination.total}
              </span>{" "}
              transaksi
            </p>

            {debouncedSearch ? (
              <p>
                Search aktif:{" "}
                <span className="font-black text-slate-700">
                  {debouncedSearch}
                </span>
              </p>
            ) : null}

            {startDate || endDate ? (
              <p>
                Rentang tanggal:{" "}
                <span className="font-black text-slate-700">
                  {startDate || "Awal"} - {endDate || "Sekarang"}
                </span>
              </p>
            ) : null}

            {isBackgroundFetching ? (
              <p className="inline-flex items-center gap-1.5 font-black text-indigo-700">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Memperbarui data...
              </p>
            ) : null}
          </div>
        </section>

        {error ? (
          <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-black">Gagal mengambil transaksi</p>
                <p className="mt-1 text-sm font-medium text-rose-700">
                  {error}
                </p>
                <button
                  className="mt-2 text-sm font-black underline"
                  onClick={retryTransactions}
                  type="button"
                >
                  Coba lagi
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid gap-3">
          {isLoading ? (
           <div className="flex min-h-36 items-center justify-center rounded-[1.5rem] border border-slate-200 bg-white sm:min-h-52 sm:rounded-[1.75rem]">
              <div className="flex items-center gap-3 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <p className="text-sm font-bold">Mengambil transaksi...</p>
              </div>
            </div>
          ) : null}

          {!isLoading && transactions.length === 0 ? (
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 text-center shadow-sm sm:rounded-[1.75rem] sm:p-8">
              <p className="text-base font-black text-slate-950 sm:text-lg">
                Belum ada transaksi
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Tambahkan transaksi pertama atau ubah filter pencarian.
              </p>
              <Button
                className="mt-5 rounded-2xl bg-slate-950 text-white hover:bg-black"
                onClick={() => setIsAddOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Tambah Transaksi
              </Button>
            </div>
          ) : null}

          {!isLoading
            ? transactions.map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  onEdit={setSelectedTransaction}
                  onDelete={handleOpenDeleteDialog}
                  isDeleting={
                    deleteMutation.isPending &&
                    deleteMutation.variables?.id === transaction.id
                  }
                />
              ))
            : null}
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-[1.35rem] border border-slate-200 bg-white p-3.5 shadow-sm sm:mt-5 sm:rounded-[1.5rem] sm:p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black text-slate-950 sm:text-sm">
              {getPaginationLabel(pagination)}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Menampilkan maksimal {pagination.limit} transaksi per halaman.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:w-auto">
            <Button
              disabled={!canGoToPreviousPage || isLoading}
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              type="button"
              variant="secondary"
            >
              <ArrowLeft className="h-4 w-4" />
              Sebelumnya
            </Button>

            <Button
              disabled={!canGoToNextPage || isLoading}
              onClick={() =>
                setPage((current) =>
                  Math.min(current + 1, Math.max(pagination.totalPages, 1))
                )
              }
              type="button"
              variant="secondary"
            >
              Berikutnya
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </AppShell>

      <QuickTransactionModal
        open={isQuickOpen}
        onClose={() => setIsQuickOpen(false)}
        onSuccess={refreshTransactionData}
      />

      <AddTransactionModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={refreshTransactionData}
      />

      <EditTransactionModal
        open={Boolean(selectedTransaction)}
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onSuccess={refreshTransactionData}
      />

      <ConfirmDialog
        open={Boolean(transactionToDelete)}
        title="Hapus transaksi?"
        description={deleteDialogDescription}
        confirmText="Ya, hapus transaksi"
        cancelText="Batal"
        loading={deleteMutation.isPending}
        loadingText="Menghapus..."
        variant="danger"
        onClose={handleCloseDeleteDialog}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}