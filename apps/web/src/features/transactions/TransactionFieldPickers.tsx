import type { ReactNode } from "react";
import { StickerChip } from "../../components/saku";
import { cn } from "../../lib/cn";
import type { FinanceAccount } from "../accounts/account.types";
import { shiftDateKey } from "../quick-composer/composer-logic";

export function PickerLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 mb-2 text-xs font-black tracking-[0.05em] text-saku-muted uppercase">
      {children}
    </p>
  );
}

type DateChoiceChipsProps = {
  value: string;
  todayKey: string;
  onChange: (dateKey: string) => void;
};

/** "Hari ini", "Kemarin" or any earlier date, as local YYYY-MM-DD keys. */
export function DateChoiceChips({ value, todayKey, onChange }: DateChoiceChipsProps) {
  const yesterdayKey = shiftDateKey(todayKey, -1);
  const isCustomDate = value !== todayKey && value !== yesterdayKey;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <StickerChip active={value === todayKey} onClick={() => onChange(todayKey)}>
        Hari ini
      </StickerChip>
      <StickerChip active={value === yesterdayKey} onClick={() => onChange(yesterdayKey)}>
        Kemarin
      </StickerChip>
      <label
        className={cn(
          "saku-line-thin inline-flex min-h-11 items-center gap-2 rounded-full px-3.5 text-[13px] font-black shadow-saku-xs",
          isCustomDate ? "bg-saku-accent text-white" : "bg-saku-paper text-saku-ink"
        )}
      >
        <span>Pilih tanggal</span>
        <input
          aria-label="Pilih tanggal transaksi"
          className="w-[7.5rem] bg-transparent text-[13px] font-black outline-none"
          max={todayKey}
          onChange={(event) => {
            if (event.target.value) {
              onChange(event.target.value);
            }
          }}
          type="date"
          value={value}
        />
      </label>
    </div>
  );
}

type AccountChoiceChipsProps = {
  accounts: FinanceAccount[];
  selectedId: string | null;
  onChange: (accountId: string) => void;
};

export function AccountChoiceChips({ accounts, selectedId, onChange }: AccountChoiceChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {accounts.map((account) => (
        <StickerChip
          active={account.id === selectedId}
          key={account.id}
          onClick={() => onChange(account.id)}
        >
          {account.name}
        </StickerChip>
      ))}
    </div>
  );
}
