import { useState } from "react";
import { BottomSheet, SegmentedControl, StickerButton } from "../../components/saku";
import type { FinanceAccount } from "../accounts/account.types";
import { CategoryPickerGrid } from "../categories/CategoryPickerGrid";
import type { Category } from "../categories/category.types";
import { NewCategorySheet } from "../categories/NewCategorySheet";
import {
  AccountChoiceChips,
  DateChoiceChips,
  PickerLabel
} from "../transactions/TransactionFieldPickers";
import type { TransactionType } from "../transactions/transaction.types";
import {
  formatSignedAmount,
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
  const [creatingCategory, setCreatingCategory] = useState(false);

  return (
    <>
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
            <PickerLabel>Kategori</PickerLabel>
            <CategoryPickerGrid
              categories={categories}
              onAdd={() => setCreatingCategory(true)}
              onSelect={(category) => onChange({ categoryId: category.id })}
              selectedId={guess.category?.id ?? null}
              type={guess.type}
            />
          </>
        )}

        {accounts.length > 0 ? (
          <>
            <PickerLabel>Rekening</PickerLabel>
            <AccountChoiceChips
              accounts={accounts}
              onChange={(accountId) => onChange({ accountId })}
              selectedId={selectedAccountId}
            />
          </>
        ) : null}

        <PickerLabel>Tanggal</PickerLabel>
        <DateChoiceChips
          onChange={(dateKey) => onChange({ dateKey })}
          todayKey={todayKey}
          value={guess.dateKey}
        />
      </BottomSheet>

      <NewCategorySheet
        initialType={guess.type}
        onClose={() => setCreatingCategory(false)}
        onCreated={(category) => onChange({ type: category.type, categoryId: category.id })}
        open={open && creatingCategory}
      />
    </>
  );
}
