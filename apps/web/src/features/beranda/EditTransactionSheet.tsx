import { useId, useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeftRight, CalendarDays, ChevronDown, Pencil, Trash2 } from "lucide-react";
import {
  BottomSheet,
  CategoryBadge,
  SegmentedControl,
  StickerButton
} from "../../components/saku";
import { cn } from "../../lib/cn";
import { CategoryPickerGrid } from "../categories/CategoryPickerGrid";
import type { Category } from "../categories/category.types";
import { NewCategorySheet } from "../categories/NewCategorySheet";
import { pickFallbackCategory } from "../quick-composer/composer-logic";
import { amountToInput, formatAmountInput, parseAmountInput } from "../transactions/amount-input";
import { toIsoDate } from "../transactions/transaction-date";
import {
  DateChoiceChips,
  PickerLabel
} from "../transactions/TransactionFieldPickers";
import type { Transaction, TransactionType } from "../transactions/transaction.types";
import { formatDayLabel, isPendingTransaction, transactionDateKey } from "./beranda-data";
import type { TransactionEdit } from "./use-transaction-actions";

type EditTransactionSheetProps = {
  transaction: Transaction | null;
  onClose: () => void;
  categories: Category[];
  todayKey: string;
  onSave: (transaction: Transaction, edit: TransactionEdit) => void;
  onDelete: (transaction: Transaction) => void;
};

type Picker = "category" | "date" | "type";

const TYPE_OPTIONS: Array<{ value: TransactionType; label: string }> = [
  { value: "EXPENSE", label: "Keluar" },
  { value: "INCOME", label: "Masuk" }
];

const recordedFormatter = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "short"
});
const timeFormatter = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" });
const shortDateFormatter = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" });

function describeRecordedAt(transaction: Transaction) {
  if (isPendingTransaction(transaction)) {
    return "Menunggu sinyal untuk dikirim";
  }

  const createdAt = new Date(transaction.createdAt);

  if (Number.isNaN(createdAt.getTime())) {
    return undefined;
  }

  return `Dicatat ${recordedFormatter.format(createdAt)} · ${timeFormatter.format(createdAt)}`;
}

function describeDate(dateKey: string, todayKey: string) {
  const label = formatDayLabel(dateKey, todayKey);
  const [year, month, day] = dateKey.split("-").map(Number);
  const short = shortDateFormatter.format(new Date(year, month - 1, day));

  return label === "Hari ini" || label === "Kemarin" ? `${label}, ${short}` : label;
}

function FieldTile({
  label,
  value,
  leading,
  expanded,
  disabled,
  onClick
}: {
  label: string;
  value: string;
  leading: ReactNode;
  expanded: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-expanded={expanded}
      aria-label={`${label}: ${value}`}
      className={cn(
        "saku-line-thin flex min-h-[60px] items-center gap-2.5 rounded-[18px] px-2.5 py-2 text-left shadow-saku-xs",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30 disabled:cursor-not-allowed disabled:opacity-60",
        expanded ? "bg-saku-coin-soft" : "bg-saku-paper"
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {leading}
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-extrabold text-saku-muted">{label}</span>
        <span className="line-clamp-2 text-[13px] leading-tight font-black">{value}</span>
      </span>
      <ChevronDown
        aria-hidden="true"
        className={cn("size-3.5 shrink-0 transition-transform", expanded && "rotate-180")}
        strokeWidth={2.6}
      />
    </button>
  );
}

function IconBubble({ children }: { children: ReactNode }) {
  return (
    <span className="saku-line-thin flex size-[34px] shrink-0 items-center justify-center rounded-full bg-saku-bg">
      {children}
    </span>
  );
}

function EditTransactionForm({
  transaction,
  categories,
  todayKey,
  onSave,
  onDelete
}: Omit<EditTransactionSheetProps, "transaction" | "onClose"> & { transaction: Transaction }) {
  const nameId = useId();
  const amountId = useId();
  const pending = isPendingTransaction(transaction);
  const initialDateKey = transactionDateKey(transaction);

  const [note, setNote] = useState(transaction.note ?? "");
  const [amountText, setAmountText] = useState(() => amountToInput(transaction.amount));
  const [type, setType] = useState<TransactionType>(transaction.type);
  const [categoryId, setCategoryId] = useState(transaction.categoryId || transaction.category.id);
  const [dateKey, setDateKey] = useState(initialDateKey);
  const [picker, setPicker] = useState<Picker | null>(null);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const category =
    categories.find((item) => item.id === categoryId) ??
    (categoryId === transaction.category.id ? transaction.category : null);
  const amount = parseAmountInput(amountText);

  const isDirty =
    note.trim() !== (transaction.note ?? "").trim() ||
    amount !== Number(transaction.amount) ||
    type !== transaction.type ||
    categoryId !== (transaction.categoryId || transaction.category.id) ||
    dateKey !== initialDateKey;

  function togglePicker(next: Picker) {
    setPicker((current) => (current === next ? null : next));
  }

  function changeType(nextType: TransactionType) {
    setType(nextType);

    if (category?.type !== nextType) {
      setCategoryId(pickFallbackCategory(categories, nextType)?.id ?? "");
      setPicker("category");
    }
  }

  function handleSubmit(event?: FormEvent) {
    event?.preventDefault();

    if (amount === null) {
      setError("Nominal harus angka lebih dari 0, misalnya 18.000.");
      return;
    }

    if (!categoryId) {
      setError("Pilih kategorinya dulu.");
      setPicker("category");
      return;
    }

    onSave(transaction, {
      note: note.trim() || null,
      amount: String(amount),
      type,
      categoryId,
      ...(dateKey !== initialDateKey ? { date: toIsoDate(dateKey) } : {})
    });
  }

  return (
    <>
      <form noValidate onSubmit={handleSubmit}>
        {pending ? (
          <p className="mb-1 rounded-2xl bg-saku-coin-soft px-3 py-2 text-xs font-extrabold">
            Catatan ini belum terkirim. Bisa diubah setelah ada sinyal, atau hapus saja.
          </p>
        ) : null}

        <label className="mt-1 mb-1.5 block text-xs font-black tracking-[0.05em] text-saku-muted uppercase" htmlFor={nameId}>
          Nama
        </label>
        <div className="saku-line flex min-h-[50px] items-center gap-2 rounded-saku-control bg-saku-paper px-3.5 focus-within:ring-4 focus-within:ring-saku-accent/30">
          <input
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-base font-extrabold outline-none placeholder:font-bold placeholder:text-saku-muted disabled:opacity-60"
            disabled={pending}
            id={nameId}
            maxLength={255}
            onChange={(event) => setNote(event.target.value)}
            placeholder={category?.name ?? "Nama catatan"}
            value={note}
          />
          <Pencil aria-hidden="true" className="size-4 shrink-0 text-saku-muted" strokeWidth={2.4} />
        </div>

        <label className="mt-3.5 mb-1.5 block text-xs font-black tracking-[0.05em] text-saku-muted uppercase" htmlFor={amountId}>
          Nominal
        </label>
        <div className="saku-line flex min-h-[60px] items-baseline gap-1.5 rounded-saku-control bg-saku-paper px-3.5 py-2 focus-within:ring-4 focus-within:ring-saku-accent/30">
          <span aria-hidden="true" className="font-saku-head text-lg font-semibold text-saku-muted">
            Rp
          </span>
          <input
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent font-saku-head leading-10 font-semibold outline-none disabled:opacity-60"
            disabled={pending}
            id={amountId}
            inputMode="decimal"
            // Inline so the global 16px mobile input rule (iOS zoom guard) cannot shrink it.
            style={{ fontSize: "32px" }}
            onChange={(event) => {
              setAmountText(formatAmountInput(event.target.value));
              setError(null);
            }}
            value={amountText}
          />
        </div>

        <div className="mt-3.5 grid grid-cols-2 gap-2.5">
          <FieldTile
            disabled={pending}
            expanded={picker === "category"}
            label="Kategori"
            leading={<CategoryBadge icon={category?.icon} name={category?.name} size={34} />}
            onClick={() => togglePicker("category")}
            value={category?.name ?? "Pilih kategori"}
          />
          <FieldTile
            disabled={pending}
            expanded={picker === "date"}
            label="Tanggal"
            leading={
              <IconBubble>
                <CalendarDays aria-hidden="true" className="size-4" strokeWidth={2.4} />
              </IconBubble>
            }
            onClick={() => togglePicker("date")}
            value={describeDate(dateKey, todayKey)}
          />
          <FieldTile
            disabled={pending}
            expanded={picker === "type"}
            label="Jenis"
            leading={
              <IconBubble>
                <ArrowLeftRight aria-hidden="true" className="size-4" strokeWidth={2.4} />
              </IconBubble>
            }
            onClick={() => togglePicker("type")}
            value={type === "INCOME" ? "Masuk" : "Keluar"}
          />
        </div>

        {picker === "category" ? (
          <>
            <PickerLabel>Pilih kategori</PickerLabel>
            <CategoryPickerGrid
              categories={categories}
              onAdd={() => setCreatingCategory(true)}
              onSelect={(picked) => {
                setCategoryId(picked.id);
                setPicker(null);
              }}
              selectedId={categoryId}
              type={type}
            />
          </>
        ) : null}

        {picker === "date" ? (
          <>
            <PickerLabel>Pilih tanggal</PickerLabel>
            <DateChoiceChips onChange={setDateKey} todayKey={todayKey} value={dateKey} />
          </>
        ) : null}

        {picker === "type" ? (
          <>
            <PickerLabel>Jenis catatan</PickerLabel>
            <SegmentedControl
              ariaLabel="Jenis transaksi"
              className="bg-saku-bg"
              onChange={changeType}
              options={TYPE_OPTIONS}
              value={type}
            />
          </>
        ) : null}

        {error ? (
          <p className="mt-3 rounded-2xl bg-saku-over-soft px-3 py-2 text-sm font-extrabold text-saku-over-text" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex gap-2.5">
          <StickerButton onClick={() => onDelete(transaction)} size="md" variant="danger">
            <Trash2 aria-hidden="true" className="size-[17px]" strokeWidth={2.4} />
            Hapus
          </StickerButton>
          <StickerButton className="flex-1" disabled={pending || !isDirty} type="submit">
            Simpan perubahan
          </StickerButton>
        </div>
      </form>

      {/* Kept outside the form: React bubbles events from portals through the component tree. */}
      <NewCategorySheet
        initialType={type}
        onClose={() => setCreatingCategory(false)}
        onCreated={(created) => {
          setType(created.type);
          setCategoryId(created.id);
          setPicker(null);
        }}
        open={creatingCategory}
      />
    </>
  );
}

/** "Ubah catatan": tap any row to fix its name, amount, category, date or type. */
export function EditTransactionSheet({ transaction, onClose, ...formProps }: EditTransactionSheetProps) {
  return (
    <BottomSheet
      onClose={onClose}
      open={Boolean(transaction)}
      subtitle={transaction ? describeRecordedAt(transaction) : undefined}
      title="Ubah catatan"
    >
      {transaction ? (
        <EditTransactionForm key={transaction.id} transaction={transaction} {...formProps} />
      ) : null}
    </BottomSheet>
  );
}
