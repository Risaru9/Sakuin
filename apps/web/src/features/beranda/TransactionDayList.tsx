import type { ReactNode } from "react";
import { CloudOff } from "lucide-react";
import { CategoryBadge } from "../../components/saku";
import { cn } from "../../lib/cn";
import { formatSignedAmount } from "../quick-composer/composer-logic";
import type { Transaction } from "../transactions/transaction.types";
import { formatPlainAmount, isPendingTransaction, type DayGroup } from "./beranda-data";
import { getTransactionName } from "./use-transaction-actions";

export function DayHeader({ label, trailing }: { label: string; trailing?: string }) {
  return (
    <div className="flex items-center justify-between px-2 pt-3 pb-0.5">
      <h3 className="saku-line-thin inline-flex items-center rounded-full bg-saku-paper px-2.5 py-0.5 text-xs font-black">
        {label}
      </h3>
      {trailing ? <span className="text-xs font-extrabold text-saku-muted">{trailing}</span> : null}
    </div>
  );
}

function describeDayTotal(group: Pick<DayGroup, "expense" | "income">) {
  if (group.expense > 0) {
    return `Keluar ${formatPlainAmount(group.expense)}`;
  }

  if (group.income > 0) {
    return `Masuk ${formatPlainAmount(group.income)}`;
  }

  return undefined;
}

type TransactionRowProps = {
  transaction: Transaction;
  isLast: boolean;
  isFresh: boolean;
  /** Sticker shown on a fresh row. */
  freshTag?: string;
  onSelect: (transaction: Transaction) => void;
  /** Replaces the plain name, e.g. with the search match marked. */
  title?: ReactNode;
  subtitle?: string;
};

export function TransactionRow({
  transaction,
  isLast,
  isFresh,
  freshTag = "Baru!",
  onSelect,
  title,
  subtitle
}: TransactionRowProps) {
  const pending = isPendingTransaction(transaction);
  const income = transaction.type === "INCOME";
  const name = getTransactionName(transaction);
  const highlighted = isFresh || pending;

  return (
    <li>
      <button
        aria-label={`${name}, ${transaction.category.name}, ${formatSignedAmount(transaction.amount, transaction.type)}${pending ? ", menunggu sinyal" : ""}. Ketuk untuk mengubah.`}
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl pl-2 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30",
          highlighted && "bg-saku-coin-soft"
        )}
        onClick={() => onSelect(transaction)}
        type="button"
      >
        <span className="relative flex shrink-0">
          <CategoryBadge icon={transaction.category.icon} name={transaction.category.name} />
          {pending ? (
            <span className="saku-line-hair absolute -right-1 -bottom-1 flex size-[17px] items-center justify-center rounded-full bg-white">
              <CloudOff aria-hidden="true" className="size-2.5" strokeWidth={2.8} />
            </span>
          ) : null}
        </span>
        <span
          className={cn(
            "flex min-h-14 min-w-0 flex-1 items-center gap-2 pr-2.5",
            !isLast && !highlighted && "border-b-2 border-dashed border-saku-dash"
          )}
        >
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-extrabold">{title ?? name}</span>
            {subtitle ? (
              <span className="block truncate text-xs font-bold text-saku-muted">{subtitle}</span>
            ) : null}
          </span>
          {pending ? (
            <span className="saku-line-hair shrink-0 rounded-full bg-saku-coin px-2 font-saku-head text-[11px] font-semibold">
              Menunggu sinyal
            </span>
          ) : isFresh ? (
            <span className="saku-line-hair shrink-0 rounded-full bg-saku-coin px-2 font-saku-head text-[11px] font-semibold motion-safe:animate-saku-pop">
              {freshTag}
            </span>
          ) : null}
          <span
            className={cn(
              "ml-auto shrink-0 font-saku-head text-[17px] font-semibold",
              income ? "text-saku-income" : "text-saku-ink"
            )}
          >
            {formatSignedAmount(transaction.amount, transaction.type)}
          </span>
        </span>
      </button>
    </li>
  );
}

type TransactionDayListProps = {
  groups: DayGroup[];
  highlightIds: ReadonlySet<string>;
  highlightTag?: string;
  onSelect: (transaction: Transaction) => void;
};

export function TransactionDayList({
  groups,
  highlightIds,
  highlightTag,
  onSelect
}: TransactionDayListProps) {
  return (
    <div className="px-1">
      {groups.map((group) => (
        <section aria-label={group.label} key={group.dateKey}>
          <DayHeader label={group.label} trailing={describeDayTotal(group)} />
          <ul className="flex flex-col">
            {group.items.map((transaction, index) => (
              <TransactionRow
                freshTag={highlightTag}
                isFresh={highlightIds.has(transaction.id)}
                isLast={index === group.items.length - 1}
                key={transaction.id}
                onSelect={onSelect}
                transaction={transaction}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function TransactionListSkeleton() {
  return (
    <div aria-label="Memuat catatan" className="px-3 pt-4" role="status">
      {[0, 1, 2, 3, 4].map((index) => (
        <div className="flex min-h-14 items-center gap-3" key={index}>
          <span className="size-[38px] shrink-0 animate-pulse rounded-full bg-saku-track" />
          <span className="h-3.5 flex-1 animate-pulse rounded-full bg-saku-track" />
          <span className="h-3.5 w-16 animate-pulse rounded-full bg-saku-track" />
        </div>
      ))}
    </div>
  );
}
