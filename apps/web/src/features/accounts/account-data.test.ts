import type { Transaction } from "../transactions/transaction.types";
import { monthChangeByAccount, suggestTransferNote } from "./account-data";
import type { AccountTransfer } from "./account.types";

function entry(accountId: string, type: Transaction["type"], amount: number) {
  return {
    id: `${accountId}-${type}-${amount}`,
    type,
    amount: amount.toFixed(2),
    account: { id: accountId, name: accountId, type: "BANK", icon: null, color: null }
  } as Transaction;
}

function transfer(from: string, to: string, amount: number, date: string) {
  return {
    id: `${from}-${to}-${date}`,
    fromAccount: { id: from, name: from, type: "BANK", icon: null, color: null },
    toAccount: { id: to, name: to, type: "E_WALLET", icon: null, color: null },
    amount: amount.toFixed(2),
    note: null,
    date,
    createdAt: date,
    updatedAt: date
  } as AccountTransfer;
}

describe("monthChangeByAccount", () => {
  it("nets income, expenses and this month's transfers per account", () => {
    const changes = monthChangeByAccount({
      monthKey: "2026-09",
      transactions: [entry("bca", "INCOME", 3_000_000), entry("bca", "EXPENSE", 400_000), entry("cash", "EXPENSE", 18_000)],
      transfers: [
        transfer("bca", "gopay", 100_000, new Date(2026, 8, 12, 9).toISOString()),
        // Last month's top up does not count.
        transfer("bca", "gopay", 50_000, new Date(2026, 7, 30, 9).toISOString())
      ]
    });

    expect(changes.get("bca")).toBe(2_500_000);
    expect(changes.get("gopay")).toBe(100_000);
    expect(changes.get("cash")).toBe(-18_000);
    expect(changes.has("jenius")).toBe(false);
  });
});

describe("suggestTransferNote", () => {
  it("names the move after where the money goes", () => {
    expect(suggestTransferNote({ name: "GoPay", type: "E_WALLET" })).toBe("Top up GoPay");
    expect(suggestTransferNote({ name: "Dompet", type: "CASH" })).toBe("Tarik tunai");
    expect(suggestTransferNote({ name: "BCA", type: "BANK" })).toBe("Pindah ke BCA");
  });
});
