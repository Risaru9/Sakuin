import { Check } from "lucide-react";
import {
  BottomSheet,
  CategoryBadge,
  SegmentedControl,
  StickerButton,
  StickerChip
} from "../../components/saku";
import { cn } from "../../lib/cn";
import type { FinanceAccount } from "../accounts/account.types";
import type { Category } from "../categories/category.types";
import type { TransactionType } from "../transactions/transaction.types";
import {
  formatSignedAmount,
  shiftDateKey,
  type ComposerGuess,
  type ComposerOverrides
} from "./composer-logic";

type ComposerDetailSheetProps = {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  guess: ComposerGuess;
  categories: Category[];
  accounts: FinanceAccount[];
  selectedAccountId: string | null;
  todayKey: string;
  onChange: (patch: ComposerOverrides) => void;
};

const TYPE_OPTIONS: Array<{ value: TransactionType; label: string }> = [
  { value: "EXPENSE", label: "Keluar" },
  { value: "INCOME", label: "Masuk" }
];

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="mt-4 mb-2 text-xs font-black tracking-[0.05em] text-saku-muted uppercase">
      {children}
    </p>
  );
}

function sortForPicker(categories: Category[], type: TransactionType) {
  const isOther = (category: Category) => /lain|other/i.test(category.name);

  return categories
    .filter((category) => category.type === type)
    .sort((first, second) => Number(isOther(first)) - Number(isOther(second)));
}

export function ComposerDetailSheet({
  open,
  onClose,
  onSave,
  guess,
  categories,
  accounts,
  selectedAccountId,
  todayKey,
  onChange
}: ComposerDetailSheetProps) {
  const yesterdayKey = shiftDateKey(todayKey, -1);
  const isCustomDate = guess.dateKey !== todayKey && guess.dateKey !== yesterdayKey;
  const pickerCategories = sortForPicker(categories, guess.type);

  return (
    <BottomSheet
      footer={
        <div className="flex gap-2.5">
          <StickerButton onClick={onClose} variant="plain">
            Selesai
          </StickerButton>
          <StickerButton className="flex-1" onClick={onSave}>
            Simpan · {formatSignedAmount(guess.totalAmount, guess.type)}
          </StickerButton>
        </div>
      }
      onClose={onClose}
      open={open}
      subtitle={guess.isMultiple ? `${guess.drafts.length} transaksi sekaligus` : guess.drafts[0].note}
      title="Detail catatan"
    >
      <SegmentedControl
        ariaLabel="Jenis transaksi"
        onChange={(type) => onChange({ type, categoryId: undefined })}
        options={TYPE_OPTIONS}
        value={guess.type}
      />

      {guess.isMultiple ? (
        <p className="mt-3 rounded-2xl bg-saku-bg px-3 py-2 text-xs font-bold text-saku-muted">
          Kategori setiap transaksi ditebak sendiri-sendiri. Untuk mengubahnya, catat satu per satu.
        </p>
      ) : (
        <>
          <SectionLabel>Kategori</SectionLabel>
          <div className="grid grid-cols-4 gap-x-1 gap-y-2">
            {pickerCategories.map((category) => {
              const selected = guess.category?.id === category.id;

              return (
                <button
                  aria-pressed={selected}
                  className="relative flex min-h-11 flex-col items-center gap-1 rounded-2xl pt-1 pb-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30"
                  key={category.id}
                  onClick={() => onChange({ categoryId: category.id })}
                  type="button"
                >
                  <CategoryBadge
                    className={cn(selected && "shadow-saku-xs motion-safe:animate-saku-wiggle")}
                    icon={category.icon}
                    size={48}
                  />
                  {selected ? (
                    <span className="saku-line-hair absolute top-0 right-2 flex size-5 items-center justify-center rounded-full bg-saku-accent motion-safe:animate-saku-pop">
                      <Check aria-hidden="true" className="size-3 text-white" strokeWidth={3.6} />
                    </span>
                  ) : null}
                  <span className="line-clamp-2 text-center text-[11px] leading-tight font-black">
                    {category.name}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {accounts.length > 0 ? (
        <>
          <SectionLabel>Rekening</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {accounts.map((account) => (
              <StickerChip
                active={account.id === selectedAccountId}
                key={account.id}
                onClick={() => onChange({ accountId: account.id })}
              >
                {account.name}
              </StickerChip>
            ))}
          </div>
        </>
      ) : null}

      <SectionLabel>Tanggal</SectionLabel>
      <div className="flex flex-wrap items-center gap-2">
        <StickerChip active={guess.dateKey === todayKey} onClick={() => onChange({ dateKey: todayKey })}>
          Hari ini
        </StickerChip>
        <StickerChip
          active={guess.dateKey === yesterdayKey}
          onClick={() => onChange({ dateKey: yesterdayKey })}
        >
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
                onChange({ dateKey: event.target.value });
              }
            }}
            type="date"
            value={guess.dateKey}
          />
        </label>
      </div>
    </BottomSheet>
  );
}
