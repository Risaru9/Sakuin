import { useEffect, useId, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, CalendarDays, Tag } from "lucide-react";
import { BottomSheet, showSnack, StickerButton, StickerChip } from "../../components/saku";
import { ApiClientError } from "../../lib/api-client";
import { cn } from "../../lib/cn";
import { queryKeys } from "../../lib/query-keys";
import { formatCompactAmount, formatDayLabel, formatPlainAmount } from "../beranda/beranda-data";
import { SheetError, SheetFieldLabel } from "../lainnya/SubPageParts";
import { formatAmountInput, parseAmountInput } from "../transactions/amount-input";
import { getTodayInputValue, toIsoDate } from "../transactions/transaction-date";
import { ACCOUNT_TYPE_VISUALS, accountBalance, suggestTransferNote } from "./account-data";
import { createAccountTransfer } from "./account.service";
import type { FinanceAccount } from "./account.types";

type TransferSheetProps = {
  open: boolean;
  /** Active accounts; the sheet needs at least two. */
  accounts: FinanceAccount[];
  onClose: () => void;
};

const QUICK_AMOUNTS = [50_000, 100_000, 200_000, 500_000, 1_000_000];
const NOTE_MAX_LENGTH = 255;

function nextIndex(current: number, other: number, length: number) {
  let index = current;

  do {
    index = (index + 1) % length;
  } while (index === other && length > 1);

  return index;
}

/** Starts from the account holding the most money, into the next one in the list. */
function defaultPair(accounts: FinanceAccount[]) {
  const from = accounts.reduce(
    (best, account, index) => (accountBalance(account) > accountBalance(accounts[best]) ? index : best),
    0
  );

  return { from, to: nextIndex(from, from, accounts.length) };
}

function SideCard({
  label,
  account,
  delta,
  warn,
  onCycle
}: {
  label: string;
  account: FinanceAccount;
  delta: number;
  warn: boolean;
  onCycle: () => void;
}) {
  const visual = ACCOUNT_TYPE_VISUALS[account.type];
  const balance = accountBalance(account);

  return (
    <button
      aria-label={`${label}: ${account.name}. Ketuk untuk mengganti rekening`}
      className="saku-line-thin saku-press flex min-h-[66px] w-full items-center gap-3 rounded-[18px] bg-saku-paper px-3 py-2 text-left shadow-saku-xs focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30"
      onClick={onCycle}
      type="button"
    >
      <span
        aria-hidden="true"
        className="saku-line-thin flex size-[42px] shrink-0 items-center justify-center rounded-full"
        style={{ background: visual.background }}
      >
        <visual.Icon className="size-5" strokeWidth={2.3} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-extrabold text-saku-muted">{label}</span>
        <span className="block truncate text-base font-black">{account.name}</span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-[11px] font-extrabold text-saku-muted">Saldo {formatPlainAmount(balance)}</span>
        <span
          className={cn(
            "block font-saku-head text-[15px] font-semibold",
            delta > 0 ? "text-saku-income" : warn ? "text-saku-over-text" : "text-saku-ink"
          )}
        >
          → {formatPlainAmount(balance + delta)}
        </span>
      </span>
    </button>
  );
}

export function TransferSheet({ open, accounts, onClose }: TransferSheetProps) {
  const queryClient = useQueryClient();
  const formId = useId();
  const amountId = useId();
  const todayKey = getTodayInputValue();
  const [pair, setPair] = useState({ from: 0, to: 1 });
  const [amountText, setAmountText] = useState("");
  const [dateKey, setDateKey] = useState(todayKey);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setPair(defaultPair(accounts));
    setAmountText("");
    setDateKey(getTodayInputValue());
    setNote(null);
    setError(null);
    // Only when the sheet opens: later balance refreshes must not reset the choice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const from = accounts[pair.from] ?? accounts[0];
  const to = accounts[pair.to] ?? accounts[1];
  const amount = amountText.trim() ? parseAmountInput(amountText) : null;
  const validAmount = amount !== null && amount > 0 ? amount : 0;
  const short = from ? validAmount > accountBalance(from) : false;
  const noteValue = note ?? (to ? suggestTransferNote(to) : "");

  const transferMutation = useMutation({
    mutationFn: () =>
      createAccountTransfer({
        fromAccountId: from.id,
        toAccountId: to.id,
        amount: String(validAmount),
        // Today keeps the current time so it sorts after earlier entries of the day.
        date: dateKey === todayKey ? new Date().toISOString() : toIsoDate(dateKey),
        note: noteValue.trim() || null
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
      void queryClient.invalidateQueries({ queryKey: queryKeys.summary });
      showSnack({ title: `${formatPlainAmount(validAmount)} dipindah ke ${to.name}`, mood: "happy" });
      onClose();
    },
    onError: (caughtError) =>
      setError(
        caughtError instanceof ApiClientError || caughtError instanceof Error
          ? caughtError.message
          : "Pindah uang belum tersimpan. Coba lagi."
      )
  });

  if (!from || !to) {
    return null;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!validAmount) {
      setError("Isi nominalnya dulu, misalnya 200.000.");
      return;
    }

    setError(null);
    transferMutation.mutate();
  }

  return (
    <BottomSheet
      footer={
        <StickerButton form={formId} fullWidth isLoading={transferMutation.isPending} type="submit">
          {validAmount
            ? `${short ? "Tetap pindahkan" : "Pindahkan"} ${formatPlainAmount(validAmount)}`
            : "Pindahkan"}
        </StickerButton>
      }
      onClose={onClose}
      open={open}
      subtitle="Tidak dihitung sebagai pengeluaran"
      title="Pindah uang"
    >
      <form id={formId} noValidate onSubmit={handleSubmit}>
        <div className="relative mt-1 flex flex-col gap-2.5">
          <SideCard
            account={from}
            delta={-validAmount}
            label="Dari"
            onCycle={() => setPair((current) => ({ ...current, from: nextIndex(current.from, current.to, accounts.length) }))}
            warn={short}
          />
          <SideCard
            account={to}
            delta={validAmount}
            label="Ke"
            onCycle={() => setPair((current) => ({ ...current, to: nextIndex(current.to, current.from, accounts.length) }))}
            warn={false}
          />
          <button
            aria-label="Tukar rekening asal dan tujuan"
            className="saku-line-thin saku-press absolute top-1/2 left-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-saku-coin shadow-saku-xs focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30"
            onClick={() => {
              setPair((current) => ({ from: current.to, to: current.from }));
              setNote(null);
            }}
            type="button"
          >
            <ArrowDown aria-hidden="true" className="size-5" strokeWidth={3} />
          </button>
        </div>
        <p className="mt-1.5 text-center text-[11px] font-bold text-saku-muted">
          Ketuk rekening untuk mengganti, ketuk panah untuk menukar
        </p>

        <SheetFieldLabel className="mt-2.5" htmlFor={amountId}>
          Nominal
        </SheetFieldLabel>
        <div className="saku-line flex min-h-[60px] items-baseline gap-2 rounded-saku-control bg-saku-paper px-3.5 py-2 focus-within:ring-4 focus-within:ring-saku-accent/30">
          <span aria-hidden="true" className="font-saku-head text-lg font-semibold text-saku-muted">
            Rp
          </span>
          <input
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent font-saku-head leading-10 font-semibold text-saku-ink outline-none placeholder:text-saku-muted/60"
            id={amountId}
            inputMode="decimal"
            onChange={(event) => setAmountText(formatAmountInput(event.target.value))}
            placeholder="0"
            style={{ fontSize: "30px" }}
            value={amountText}
          />
        </div>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map((value) => (
            <StickerChip
              active={validAmount === value}
              key={value}
              onClick={() => setAmountText(formatPlainAmount(value))}
            >
              {formatCompactAmount(value)}
            </StickerChip>
          ))}
        </div>
        {short ? (
          <p className="mt-2 text-xs font-extrabold text-saku-over-text">
            Saldo {from.name} di Sakuin tidak cukup. Kalau catatannya belum lengkap, tetap bisa dipindahkan.
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          <label className="saku-line-thin relative inline-flex min-h-11 items-center gap-1.5 rounded-full bg-saku-paper px-3.5 text-[13px] font-black shadow-saku-xs focus-within:ring-4 focus-within:ring-saku-accent/30">
            <CalendarDays aria-hidden="true" className="size-[15px]" strokeWidth={2.4} />
            {formatDayLabel(dateKey, todayKey)}
            <input
              aria-label="Tanggal pindah uang"
              className="absolute inset-0 cursor-pointer opacity-0"
              max={todayKey}
              onChange={(event) => {
                if (event.target.value) {
                  setDateKey(event.target.value);
                }
              }}
              type="date"
              value={dateKey}
            />
          </label>
          <label className="saku-line-thin inline-flex min-h-11 min-w-0 flex-1 items-center gap-1.5 rounded-full bg-saku-paper px-3.5 shadow-saku-xs focus-within:ring-4 focus-within:ring-saku-accent/30">
            <Tag aria-hidden="true" className="size-[15px] shrink-0" strokeWidth={2.4} />
            <input
              aria-label="Catatan pindah uang"
              className="min-w-0 flex-1 bg-transparent text-[13px] font-black outline-none placeholder:text-saku-muted"
              maxLength={NOTE_MAX_LENGTH}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Catatan"
              value={noteValue}
            />
          </label>
        </div>

        {error ? <SheetError>{error}</SheetError> : null}
      </form>
    </BottomSheet>
  );
}
