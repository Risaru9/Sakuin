import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRightLeft,
  Landmark,
  Plus,
  Smartphone,
  Wallet,
  WalletCards,
  X
} from "lucide-react";
import { useToast } from "../../components/toast/ToastProvider";
import { queryKeys } from "../../lib/query-keys";
import {
  createAccount,
  createAccountTransfer,
  getAccounts,
  updateAccount
} from "../accounts/account.service";
import type {
  AccountType,
  CreateAccountInput,
  CreateAccountTransferInput,
  FinanceAccount
} from "../accounts/account.types";
import { formatRupiah, getErrorMessage } from "./dashboard-utils";

type AccountFormMode = "setup" | "create" | "transfer" | null;

const accountTypeOptions: Array<{
  value: AccountType;
  label: string;
}> = [
  { value: "CASH", label: "Tunai" },
  { value: "BANK", label: "Bank" },
  { value: "E_WALLET", label: "E-wallet" },
  { value: "SAVINGS", label: "Tabungan" },
  { value: "OTHER", label: "Lainnya" }
];

function getAccountIcon(type: AccountType) {
  if (type === "BANK" || type === "SAVINGS") {
    return Landmark;
  }

  if (type === "E_WALLET") {
    return Smartphone;
  }

  return Wallet;
}

function getDefaultAccountColor(type: AccountType) {
  if (type === "BANK") return "#1d4ed8";
  if (type === "E_WALLET") return "#7c3aed";
  if (type === "SAVINGS") return "#059669";
  if (type === "OTHER") return "#475569";
  return "#2563eb";
}

function AccountListItem({ account }: { account: FinanceAccount }) {
  const Icon = getAccountIcon(account.type);

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-3 py-3 shadow-sm">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
        style={{ backgroundColor: account.color ?? "#2563eb" }}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-black text-slate-900">
          {account.name}
        </p>
        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
          {accountTypeOptions.find((item) => item.value === account.type)
            ?.label ?? "Rekening"}
        </p>
      </div>
      <p className="shrink-0 text-sm font-black text-slate-950">
        {formatRupiah(account.balance)}
      </p>
    </div>
  );
}

function FieldLabel({
  children,
  htmlFor
}: {
  children: ReactNode;
  htmlFor: string;
}) {
  return (
    <label
      className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500"
      htmlFor={htmlFor}
    >
      {children}
    </label>
  );
}

export function DashboardAccountsCard({
  transactionCount
}: {
  transactionCount: number;
}) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [formMode, setFormMode] = useState<AccountFormMode>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("BANK");
  const [initialBalance, setInitialBalance] = useState("");
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");

  const accountsQuery = useQuery({
    queryKey: queryKeys.accounts,
    queryFn: getAccounts,
    staleTime: 60_000,
    refetchOnWindowFocus: false
  });

  const accounts = accountsQuery.data ?? [];
  const defaultAccount = accounts[0] ?? null;
  const needsInitialSetup =
    transactionCount === 0 &&
    accounts.length === 1 &&
    Number(defaultAccount?.initialBalance ?? 0) === 0;
  const totalBalance = accounts.reduce(
    (total, account) => total + Number(account.balance || 0),
    0
  );

  function resetForm() {
    setFormMode(null);
    setName("");
    setType("BANK");
    setInitialBalance("");
    setTransferAmount("");
  }

  function refreshAccounts() {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.accounts
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.accountTransfers
    });
  }

  const accountMutation = useMutation({
    mutationFn: async () => {
      const input: CreateAccountInput = {
        name: name.trim(),
        type,
        initialBalance: initialBalance.trim() || "0",
        icon: type === "BANK" || type === "SAVINGS" ? "landmark" : "wallet",
        color: getDefaultAccountColor(type)
      };

      if (formMode === "setup" && defaultAccount) {
        return updateAccount(defaultAccount.id, input);
      }

      return createAccount(input);
    },
    onSuccess: () => {
      refreshAccounts();
      addToast({
        variant: "success",
        title:
          formMode === "setup"
            ? "Dompet awal sudah siap"
            : "Rekening berhasil ditambahkan"
      });
      resetForm();
    },
    onError: (error) => {
      addToast({
        variant: "error",
        title: "Rekening belum tersimpan",
        description: getErrorMessage(error)
      });
    }
  });

  const transferMutation = useMutation({
    mutationFn: () => {
      const input: CreateAccountTransferInput = {
        fromAccountId,
        toAccountId,
        amount: transferAmount,
        date: new Date().toISOString()
      };

      return createAccountTransfer(input);
    },
    onSuccess: () => {
      refreshAccounts();
      addToast({
        variant: "success",
        title: "Transfer antar-rekening tercatat"
      });
      resetForm();
    },
    onError: (error) => {
      addToast({
        variant: "error",
        title: "Transfer belum tersimpan",
        description: getErrorMessage(error)
      });
    }
  });

  function openSetup() {
    if (!defaultAccount) return;
    setName(defaultAccount.name);
    setType(defaultAccount.type);
    setInitialBalance(
      Number(defaultAccount.initialBalance) === 0
        ? ""
        : defaultAccount.initialBalance
    );
    setFormMode("setup");
  }

  function openTransfer() {
    setFromAccountId(accounts[0]?.id ?? "");
    setToAccountId(accounts[1]?.id ?? "");
    setFormMode("transfer");
  }

  if (accountsQuery.isLoading && !accountsQuery.data) {
    return (
      <div className="h-52 animate-pulse rounded-3xl bg-slate-100" />
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-b from-blue-50 to-white shadow-sm">
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <WalletCards className="h-5 w-5 text-[var(--sakuin-primary)]" />
            <h2 className="text-base font-black text-slate-950">
              Rekening & Dompet
            </h2>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Saldo nyata di bank, tunai, dan e-wallet.
          </p>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
            Total aset
          </p>
          <p className="mt-1 text-base font-black text-[var(--sakuin-primary)]">
            {formatRupiah(totalBalance)}
          </p>
        </div>
      </div>

      {needsInitialSetup && formMode === null ? (
        <button
          className="mx-4 mb-3 flex w-[calc(100%-2rem)] items-center gap-3 rounded-2xl bg-[var(--sakuin-primary)] p-3 text-left text-white shadow-[0_14px_30px_rgba(37,99,235,0.22)]"
          onClick={openSetup}
          type="button"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15">
            <Wallet className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-black">
              Siapkan dompet pertamamu
            </span>
            <span className="mt-0.5 block text-[10px] font-medium text-white/75">
              Isi nama dan saldo awal agar posisi uang langsung akurat.
            </span>
          </span>
        </button>
      ) : null}

      <div className="grid gap-2 px-4">
        {accounts.map((account) => (
          <AccountListItem account={account} key={account.id} />
        ))}
      </div>

      {formMode === "setup" || formMode === "create" ? (
        <form
          className="mx-4 mt-3 rounded-2xl border border-blue-100 bg-white p-3"
          onSubmit={(event) => {
            event.preventDefault();
            accountMutation.mutate();
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-black text-slate-900">
              {formMode === "setup" ? "Setup dompet awal" : "Rekening baru"}
            </p>
            <button
              aria-label="Tutup form rekening"
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              onClick={resetForm}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="account-name">Nama</FieldLabel>
              <input
                className="min-h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-100"
                id="account-name"
                maxLength={60}
                onChange={(event) => setName(event.target.value)}
                placeholder="Contoh: BRI"
                required
                value={name}
              />
            </div>
            <div>
              <FieldLabel htmlFor="account-type">Jenis</FieldLabel>
              <select
                className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-100"
                id="account-type"
                onChange={(event) => setType(event.target.value as AccountType)}
                value={type}
              >
                {accountTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3">
            <FieldLabel htmlFor="account-balance">Saldo awal</FieldLabel>
            <input
              className="min-h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-100"
              id="account-balance"
              inputMode="decimal"
              onChange={(event) => setInitialBalance(event.target.value)}
              placeholder="0"
              value={initialBalance}
            />
          </div>
          <button
            className="mt-3 min-h-10 w-full rounded-xl bg-[var(--sakuin-primary)] px-4 text-xs font-black text-white disabled:opacity-50"
            disabled={accountMutation.isPending || !name.trim()}
            type="submit"
          >
            {accountMutation.isPending ? "Menyimpan..." : "Simpan rekening"}
          </button>
        </form>
      ) : null}

      {formMode === "transfer" ? (
        <form
          className="mx-4 mt-3 rounded-2xl border border-blue-100 bg-white p-3"
          onSubmit={(event) => {
            event.preventDefault();
            transferMutation.mutate();
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-black text-slate-900">
              Transfer antar-rekening
            </p>
            <button
              aria-label="Tutup form transfer"
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              onClick={resetForm}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <FieldLabel htmlFor="transfer-from">Dari</FieldLabel>
              <select
                className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs font-bold"
                id="transfer-from"
                onChange={(event) => setFromAccountId(event.target.value)}
                value={fromAccountId}
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel htmlFor="transfer-to">Ke</FieldLabel>
              <select
                className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs font-bold"
                id="transfer-to"
                onChange={(event) => setToAccountId(event.target.value)}
                value={toAccountId}
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3">
            <FieldLabel htmlFor="transfer-amount">Nominal</FieldLabel>
            <input
              className="min-h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold"
              id="transfer-amount"
              inputMode="decimal"
              onChange={(event) => setTransferAmount(event.target.value)}
              placeholder="0"
              required
              value={transferAmount}
            />
          </div>
          <button
            className="mt-3 min-h-10 w-full rounded-xl bg-[var(--sakuin-primary)] px-4 text-xs font-black text-white disabled:opacity-50"
            disabled={
              transferMutation.isPending ||
              !transferAmount ||
              !fromAccountId ||
              !toAccountId ||
              fromAccountId === toAccountId
            }
            type="submit"
          >
            {transferMutation.isPending ? "Menyimpan..." : "Catat transfer"}
          </button>
        </form>
      ) : null}

      <div className="grid grid-cols-2 gap-2 p-4">
        <button
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-blue-100 bg-white text-xs font-black text-slate-700"
          onClick={() => {
            resetForm();
            setFormMode("create");
          }}
          type="button"
        >
          <Plus className="h-4 w-4 text-[var(--sakuin-primary)]" />
          Tambah rekening
        </button>
        <button
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-blue-100 bg-white text-xs font-black text-slate-700 disabled:opacity-40"
          disabled={accounts.length < 2}
          onClick={openTransfer}
          type="button"
        >
          <ArrowRightLeft className="h-4 w-4 text-[var(--sakuin-primary)]" />
          Transfer
        </button>
      </div>
    </section>
  );
}
