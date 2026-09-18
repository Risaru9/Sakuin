import { useEffect, useId, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Archive } from "lucide-react";
import { BottomSheet, showSnack, StickerButton } from "../../components/saku";
import { ApiClientError } from "../../lib/api-client";
import { cn } from "../../lib/cn";
import { queryKeys } from "../../lib/query-keys";
import { SheetError, SheetFieldLabel } from "../lainnya/SubPageParts";
import { amountToInput, formatAmountInput, parseAmountInput } from "../transactions/amount-input";
import {
  ACCOUNT_COLORS,
  ACCOUNT_TYPE_ORDER,
  ACCOUNT_TYPE_VISUALS,
  accountBalance
} from "./account-data";
import { archiveAccount, createAccount, updateAccount } from "./account.service";
import type { AccountType, FinanceAccount } from "./account.types";

type AccountFormSheetProps = {
  open: boolean;
  /** null adds a new account; an account opens it for editing. */
  account: FinanceAccount | null;
  /** Archiving is refused for the last active account. */
  canArchive: boolean;
  onClose: () => void;
};

const NAME_MAX_LENGTH = 60;

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiClientError || error instanceof Error ? error.message : fallback;
}

export function AccountFormSheet({ open, account, canArchive, onClose }: AccountFormSheetProps) {
  const queryClient = useQueryClient();
  const formId = useId();
  const nameId = useId();
  const balanceId = useId();
  const [type, setType] = useState<AccountType>("CASH");
  const [name, setName] = useState("");
  const [balanceText, setBalanceText] = useState("");
  const [color, setColor] = useState<string>(ACCOUNT_COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setType(account?.type ?? "CASH");
    setName(account?.name ?? "");
    setBalanceText(account ? amountToInput(accountBalance(account)) : "");
    setColor(account?.color ?? ACCOUNT_COLORS[0]);
    setError(null);
    setConfirmArchive(false);
  }, [open, account]);

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
    void queryClient.invalidateQueries({ queryKey: queryKeys.summary });
  }

  const saveMutation = useMutation({
    mutationFn: async (balance: number) => {
      const trimmedName = name.trim();

      if (!account) {
        return createAccount({ name: trimmedName, type, initialBalance: String(balance), color });
      }

      // The balance is the opening balance plus every movement, so shift the opening balance.
      const movements = accountBalance(account) - (Number(account.initialBalance) || 0);
      return updateAccount(account.id, {
        name: trimmedName,
        type,
        color,
        initialBalance: String(balance - movements)
      });
    },
    onSuccess: (saved) => {
      refresh();
      showSnack({ title: account ? `${saved.name} disimpan` : `${saved.name} ditambahkan`, mood: "happy" });
      onClose();
    },
    onError: (caughtError) => setError(errorMessage(caughtError, "Rekening belum tersimpan. Coba lagi."))
  });

  const archiveMutation = useMutation({
    mutationFn: (accountId: string) => archiveAccount(accountId),
    onSuccess: () => {
      refresh();
      showSnack({ title: `${account?.name ?? "Rekening"} diarsipkan`, mood: "happy" });
      onClose();
    },
    onError: (caughtError) => {
      setConfirmArchive(false);
      setError(errorMessage(caughtError, "Rekening belum bisa diarsipkan. Coba lagi."));
    }
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!name.trim()) {
      setError("Beri nama rekeningnya dulu, misalnya OVO.");
      return;
    }

    const balance = balanceText.trim() ? parseAmountInput(balanceText) : 0;

    if (balance === null) {
      setError("Saldo harus berupa angka, misalnya 150.000.");
      return;
    }

    setError(null);
    saveMutation.mutate(balance);
  }

  const busy = saveMutation.isPending || archiveMutation.isPending;

  return (
    <BottomSheet
      footer={
        confirmArchive && account ? (
          <div className="flex gap-2.5">
            <StickerButton onClick={() => setConfirmArchive(false)} variant="plain">
              Batal
            </StickerButton>
            <StickerButton
              className="flex-1"
              isLoading={archiveMutation.isPending}
              onClick={() => archiveMutation.mutate(account.id)}
              variant="danger"
            >
              Ya, arsipkan
            </StickerButton>
          </div>
        ) : (
          <StickerButton disabled={busy} form={formId} fullWidth isLoading={saveMutation.isPending} type="submit">
            {account ? "Simpan" : "Tambah rekening"}
          </StickerButton>
        )
      }
      onClose={onClose}
      open={open}
      subtitle={account ? "Ubah nama, jenis, atau saldonya" : "Dompet, bank, e-wallet, atau tabungan"}
      title={account ? "Ubah rekening" : "Rekening baru"}
    >
      <form id={formId} noValidate onSubmit={handleSubmit}>
        <SheetFieldLabel>Jenis</SheetFieldLabel>
        <div aria-label="Jenis rekening" className="grid grid-cols-5 gap-1" role="radiogroup">
          {ACCOUNT_TYPE_ORDER.map((key) => {
            const visual = ACCOUNT_TYPE_VISUALS[key];
            const selected = key === type;

            return (
              <button
                aria-checked={selected}
                className="flex min-h-[76px] flex-col items-center gap-1.5 rounded-saku-control focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30"
                key={key}
                onClick={() => setType(key)}
                role="radio"
                type="button"
              >
                <span
                  className={cn(
                    "saku-line-thin flex size-[50px] items-center justify-center rounded-full",
                    selected && "shadow-saku-xs motion-safe:animate-saku-wiggle"
                  )}
                  style={{ background: selected ? "var(--color-saku-coin)" : visual.background }}
                >
                  <visual.Icon aria-hidden="true" className="size-[23px]" strokeWidth={2.3} />
                </span>
                <span className="text-xs font-black">{visual.label}</span>
              </button>
            );
          })}
        </div>

        <SheetFieldLabel className="mt-2.5" htmlFor={nameId}>
          Nama
        </SheetFieldLabel>
        <input
          autoComplete="off"
          className="saku-line min-h-[50px] w-full rounded-saku-control bg-saku-paper px-3.5 text-base font-extrabold text-saku-ink outline-none placeholder:font-bold placeholder:text-saku-muted focus-visible:ring-4 focus-visible:ring-saku-accent/30"
          id={nameId}
          maxLength={NAME_MAX_LENGTH}
          onChange={(event) => setName(event.target.value)}
          placeholder="Misal OVO"
          value={name}
        />

        <SheetFieldLabel htmlFor={balanceId}>Saldo sekarang</SheetFieldLabel>
        <div className="saku-line flex min-h-[60px] items-baseline gap-2 rounded-saku-control bg-saku-paper px-3.5 py-2 focus-within:ring-4 focus-within:ring-saku-accent/30">
          <span aria-hidden="true" className="font-saku-head text-lg font-semibold text-saku-muted">
            Rp
          </span>
          <input
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent font-saku-head leading-10 font-semibold text-saku-ink outline-none placeholder:text-saku-muted/60"
            id={balanceId}
            inputMode="decimal"
            onChange={(event) => setBalanceText(formatAmountInput(event.target.value))}
            placeholder="0"
            // Inline so the global 16px mobile input rule (iOS zoom guard) cannot shrink it.
            style={{ fontSize: "30px" }}
            value={balanceText}
          />
        </div>

        <SheetFieldLabel>Warna</SheetFieldLabel>
        <div aria-label="Warna rekening" className="flex gap-3 pl-1" role="radiogroup">
          {ACCOUNT_COLORS.map((choice, index) => {
            const selected = choice === color;

            return (
              <button
                aria-checked={selected}
                aria-label={`Warna ${index + 1}`}
                className="saku-line-thin size-9 rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30"
                key={choice}
                onClick={() => setColor(choice)}
                role="radio"
                style={{
                  background: choice,
                  boxShadow: selected ? "0 0 0 3px #ffffff, 0 0 0 5px var(--color-saku-ink)" : undefined
                }}
                type="button"
              />
            );
          })}
        </div>

        {account && canArchive && !confirmArchive ? (
          <button
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full px-1 text-sm font-black text-saku-over-text focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30"
            onClick={() => setConfirmArchive(true)}
            type="button"
          >
            <Archive aria-hidden="true" className="size-4" strokeWidth={2.4} />
            Arsipkan rekening ini
          </button>
        ) : null}

        {confirmArchive ? (
          <p className="mt-4 rounded-2xl bg-saku-coin-soft px-3 py-2 text-sm font-bold">
            {account?.name} disembunyikan dari pilihan rekening. Riwayat transaksinya tetap aman, dan bisa
            diaktifkan lagi kapan saja.
          </p>
        ) : null}

        {error ? <SheetError>{error}</SheetError> : null}
      </form>
    </BottomSheet>
  );
}
