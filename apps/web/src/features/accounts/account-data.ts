import { Landmark, PiggyBank, Smartphone, Wallet, Ellipsis, type LucideIcon } from "lucide-react";
import type { Transaction } from "../transactions/transaction.types";
import type { AccountTransfer, AccountType, FinanceAccount } from "./account.types";

export type AccountTypeVisual = {
  label: string;
  Icon: LucideIcon;
  background: string;
};

export const ACCOUNT_TYPE_VISUALS: Record<AccountType, AccountTypeVisual> = {
  CASH: { label: "Tunai", Icon: Wallet, background: "#fff0b3" },
  BANK: { label: "Bank", Icon: Landmark, background: "#d6e4ff" },
  E_WALLET: { label: "E-wallet", Icon: Smartphone, background: "#ccf1ea" },
  SAVINGS: { label: "Tabungan", Icon: PiggyBank, background: "#ffd6e6" },
  OTHER: { label: "Lainnya", Icon: Ellipsis, background: "#ebe8f2" }
};

export const ACCOUNT_TYPE_ORDER: AccountType[] = ["CASH", "BANK", "E_WALLET", "SAVINGS", "OTHER"];

/** The icon colour of an account; the first one is the default. */
export const ACCOUNT_COLORS = ["#2b63e0", "#12a594", "#f08c00", "#e0457b", "#7c5cff", "#1d1a33"] as const;

export function accountBalance(account: Pick<FinanceAccount, "balance">) {
  return Number(account.balance) || 0;
}

/** Net movement per account in one month: income minus expense, plus transfers in, minus out. */
export function monthChangeByAccount({
  transactions,
  transfers,
  monthKey
}: {
  transactions: Transaction[];
  transfers: AccountTransfer[];
  monthKey: string;
}) {
  const changes = new Map<string, number>();
  const add = (accountId: string | undefined | null, amount: number) => {
    if (accountId) {
      changes.set(accountId, (changes.get(accountId) ?? 0) + amount);
    }
  };

  for (const transaction of transactions) {
    const amount = Number(transaction.amount) || 0;
    add(transaction.account?.id, transaction.type === "INCOME" ? amount : -amount);
  }

  for (const transfer of transfers) {
    if (localMonthKey(transfer.date) !== monthKey) {
      continue;
    }

    const amount = Number(transfer.amount) || 0;
    add(transfer.fromAccount.id, -amount);
    add(transfer.toAccount.id, amount);
  }

  return changes;
}

function localMonthKey(isoDate: string) {
  const date = new Date(isoDate);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Suggested transfer note: "Top up GoPay", "Tarik tunai", or "Pindah ke BCA". */
export function suggestTransferNote(to: Pick<FinanceAccount, "name" | "type">) {
  if (to.type === "E_WALLET") {
    return `Top up ${to.name}`;
  }

  if (to.type === "CASH") {
    return "Tarik tunai";
  }

  return `Pindah ke ${to.name}`;
}
