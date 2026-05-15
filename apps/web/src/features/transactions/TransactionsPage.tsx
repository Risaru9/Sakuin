import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Edit3,
  Loader2,
  Plus,
  Search,
  Trash2
} from "lucide-react";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { AppShell } from "../../components/layout/AppShell";
import { useToast } from "../../components/toast/ToastProvider";
import { Button } from "../../components/ui/button";
import { ApiClientError } from "../../lib/api-client";
import { AddTransactionModal } from "./AddTransactionModal";
import { EditTransactionModal } from "./EditTransactionModal";
import { deleteTransaction, getTransactions } from "./transaction.service";
import type { Transaction, TransactionType } from "./transaction.types";

type TransactionFilter = "ALL" | TransactionType;

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

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className={
              isIncome
                ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"
                : "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700"
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
            <p className="mt-1 text-xs font-medium text-slate-500">
              {transaction.category.name} · {formatDate(transaction.date)}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[110px_1fr_180px] sm:items-center xl:w-[520px]">
          <div>
            <span
              className={
                isIncome
                  ? "inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700"
                  : "inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-700"
              }
            >
              {isIncome ? "Income" : "Expense"}
            </span>
          </div>

          <p
            className={
              isIncome
                ? "text-sm font-black text-emerald-700 sm:text-right"
                : "text-sm font-black text-rose-700 sm:text-right"
            }
          >
            {isIncome ? "+" : "-"} {formatRupiah(transaction.amount)}
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-3 text-xs font-black text-slate-700 transition hover:bg-slate-200"
              onClick={() => onEdit(transaction)}
              type="button"
            >
              <Edit3 className="h-4 w-4" />
              Edit
            </button>

            <button
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-rose-50 px-3 text-xs font-black text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
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

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<TransactionFilter>("ALL");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] =
    useState<Transaction | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const matchesType = filter === "ALL" || transaction.type === filter;

      const keyword = search.trim().toLowerCase();
      const matchesSearch =
        !keyword ||
        transaction.note?.toLowerCase().includes(keyword) ||
        transaction.category.name.toLowerCase().includes(keyword);

      return matchesType && matchesSearch;
    });
  }, [transactions, filter, search]);

  async function loadTransactions() {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getTransactions({
        page: 1,
        limit: 100
      });

      setTransactions(data.items);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsLoading(false);
    }
  }

  function handleOpenDeleteDialog(transaction: Transaction) {
    setDeleteError(null);
    setTransactionToDelete(transaction);
  }

  function handleCloseDeleteDialog() {
    if (deletingId) {
      return;
    }

    setTransactionToDelete(null);
    setDeleteError(null);
  }

  async function handleConfirmDelete() {
    if (!transactionToDelete) {
      return;
    }

    const deletedTransactionName =
      transactionToDelete.note || transactionToDelete.category.name;

    setDeletingId(transactionToDelete.id);
    setDeleteError(null);

    try {
      await deleteTransaction(transactionToDelete.id);
      await loadTransactions();

      addToast({
        variant: "success",
        title: "Transaksi berhasil dihapus",
        description: `"${deletedTransactionName}" sudah dihapus dari daftar transaksi.`
      });

      setTransactionToDelete(null);
    } catch (caughtError) {
      const message = getErrorMessage(caughtError);

      setDeleteError(message);

      addToast({
        variant: "error",
        title: "Gagal menghapus transaksi",
        description: message
      });
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    void loadTransactions();
  }, []);

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
        <header className="mb-5 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-indigo-700">
              Sakuin Transactions
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Kelola Transaksi
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Edit atau hapus transaksi yang salah input.
            </p>
          </div>

          <Button
            className="rounded-2xl bg-slate-950 text-white hover:bg-black"
            onClick={() => setIsAddOpen(true)}
            size="md"
          >
            <Plus className="h-4 w-4" />
            Tambah Transaksi
          </Button>
        </header>

        <div className="mb-5 grid gap-3 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_300px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
              placeholder="Cari catatan atau kategori..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1">
            {(["ALL", "INCOME", "EXPENSE"] as const).map((item) => (
              <button
                className={
                  filter === item
                    ? "rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white"
                    : "rounded-xl px-3 py-2 text-xs font-black text-slate-600 hover:bg-white"
                }
                key={item}
                onClick={() => setFilter(item)}
                type="button"
              >
                {item === "ALL" ? "Semua" : item}
              </button>
            ))}
          </div>
        </div>

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
                  onClick={() => void loadTransactions()}
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
            <div className="flex min-h-52 items-center justify-center rounded-[1.75rem] border border-slate-200 bg-white">
              <div className="flex items-center gap-3 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <p className="text-sm font-bold">Mengambil transaksi...</p>
              </div>
            </div>
          ) : null}

          {!isLoading && filteredTransactions.length === 0 ? (
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
              <p className="text-lg font-black text-slate-950">
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
            ? filteredTransactions.map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  onEdit={setSelectedTransaction}
                  onDelete={handleOpenDeleteDialog}
                  isDeleting={deletingId === transaction.id}
                />
              ))
            : null}
        </div>
      </AppShell>

      <AddTransactionModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={loadTransactions}
      />

      <EditTransactionModal
        open={Boolean(selectedTransaction)}
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onSuccess={loadTransactions}
      />

      <ConfirmDialog
        open={Boolean(transactionToDelete)}
        title="Hapus transaksi?"
        description={deleteDialogDescription}
        confirmText="Ya, hapus transaksi"
        cancelText="Batal"
        loading={Boolean(
          transactionToDelete && deletingId === transactionToDelete.id
        )}
        loadingText="Menghapus..."
        variant="danger"
        onClose={handleCloseDeleteDialog}
        onConfirm={() => void handleConfirmDelete()}
      />
    </>
  );
}