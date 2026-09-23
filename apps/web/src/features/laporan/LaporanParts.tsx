import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Minus, SlidersHorizontal, TrendingDown, TrendingUp } from "lucide-react";
import {
  CategoryBadge,
  SakuMascot,
  SakuSparkle,
  SegmentedControl,
  StickerButton,
  StickerCard
} from "../../components/saku";
import { cn } from "../../lib/cn";
import { formatPlainAmount } from "../beranda/beranda-data";
import type { BudgetRow, MonthComparison, ReportKind, ShareSlice } from "./laporan-data";

const KIND_OPTIONS: Array<{ value: ReportKind; label: string }> = [
  { value: "EXPENSE", label: "Pengeluaran" },
  { value: "INCOME", label: "Pemasukan" }
];

function RoundButton({
  label,
  disabled,
  onClick,
  children
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      aria-label={label}
      className="saku-line-thin saku-press flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-saku-ink shadow-saku-xs focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40 disabled:opacity-40 disabled:shadow-none"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export function LaporanHeader({
  monthLabel,
  kind,
  canGoBack,
  canGoForward,
  onPrevious,
  onNext,
  onKindChange
}: {
  monthLabel: string;
  kind: ReportKind;
  canGoBack: boolean;
  canGoForward: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onKindChange: (kind: ReportKind) => void;
}) {
  return (
    <header className="saku-line relative mt-2 rounded-saku-hero bg-saku-accent px-4 pt-3 pb-3.5 text-white shadow-saku sm:mt-0">
      <SakuSparkle className="absolute top-[58px] left-[60px] text-white" size={12} />
      <SakuSparkle className="absolute top-[60px] right-16 text-saku-coin [animation-delay:1s]" size={10} />
      <div className="flex items-center justify-between gap-2">
        <RoundButton disabled={!canGoBack} label="Bulan sebelumnya" onClick={onPrevious}>
          <ChevronLeft aria-hidden="true" className="size-[18px]" strokeWidth={2.6} />
        </RoundButton>
        <h1 aria-live="polite" className="truncate font-saku-head text-[19px] font-semibold min-[360px]:text-[21px]">
          {monthLabel}
        </h1>
        <RoundButton disabled={!canGoForward} label="Bulan berikutnya" onClick={onNext}>
          <ChevronRight aria-hidden="true" className="size-[18px]" strokeWidth={2.6} />
        </RoundButton>
      </div>
      <SegmentedControl
        ariaLabel="Jenis laporan"
        className="mt-3"
        onChange={onKindChange}
        options={KIND_OPTIONS}
        tone="accent"
        value={kind}
      />
    </header>
  );
}

const COMPARISON_TONE = {
  good: "text-saku-income",
  bad: "text-saku-over-text",
  neutral: "text-saku-muted"
} as const;

export function ShareBreakdown({
  kind,
  total,
  comparison,
  shares
}: {
  kind: ReportKind;
  total: number;
  comparison: MonthComparison | null;
  shares: ShareSlice[];
}) {
  const ComparisonIcon =
    comparison?.direction === "up" ? TrendingUp : comparison?.direction === "down" ? TrendingDown : Minus;

  return (
    <section aria-label={kind === "EXPENSE" ? "Pengeluaran per kategori" : "Pemasukan per kategori"} className="px-2 pt-3.5 pb-1">
      <p className="text-[13px] font-extrabold text-saku-muted">
        {kind === "EXPENSE" ? "Total pengeluaran" : "Total pemasukan"}
      </p>
      <p className="font-saku-head text-[32px] leading-[38px] font-semibold">Rp {formatPlainAmount(total)}</p>
      {comparison ? (
        <p className={cn("mt-0.5 flex items-center gap-1 text-[13px] font-extrabold", COMPARISON_TONE[comparison.tone])}>
          <ComparisonIcon aria-hidden="true" className="size-[15px] shrink-0" strokeWidth={2.6} />
          {comparison.text}
        </p>
      ) : null}

      {shares.length > 0 ? (
        <>
          {/* Every slice is named with its share and amount in the legend below. */}
          <div
            aria-hidden="true"
            className="mt-3 flex h-[18px] gap-[2px] overflow-hidden rounded-full border-2 border-saku-ink bg-saku-ink"
          >
            {shares.map((share) => (
              <div
                className="h-full"
                key={share.key}
                style={{ background: share.color, flexBasis: 0, flexGrow: Math.max(share.percent, 1) }}
                title={`${share.name}: ${share.percent}% · ${formatPlainAmount(share.amount)}`}
              />
            ))}
          </div>
          <ul className="mt-2">
            {shares.map((share) => (
              <li className="flex min-h-7 items-center gap-2.5" key={share.key}>
                <span
                  aria-hidden="true"
                  className="size-3 shrink-0 rounded-[4px] border-[1.5px] border-saku-ink"
                  style={{ background: share.color }}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-extrabold">
                  {share.name}
                  {share.categoryCount > 1 ? (
                    <span className="font-bold text-saku-muted"> · {share.categoryCount} kategori</span>
                  ) : null}
                </span>
                <span className="w-10 text-right text-[13px] font-extrabold text-saku-muted">{share.percent}%</span>
                <span className="w-24 text-right font-saku-head text-base font-semibold">
                  {formatPlainAmount(share.amount)}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}

export function ReportEmpty({ text }: { text: string }) {
  return (
    <div className="mx-2 mt-3 flex items-center gap-3 rounded-saku-card bg-saku-paper/70 px-3 py-3">
      <SakuMascot mood="wow" size={48} />
      <p className="text-sm font-extrabold text-saku-muted">{text}</p>
    </div>
  );
}

const BUDGET_BAR = {
  ok: "bg-saku-accent",
  watch: "bg-saku-watch",
  over: "bg-saku-over"
} as const;

const BUDGET_NOTE = {
  ok: "text-saku-muted",
  watch: "text-saku-watch-text",
  over: "text-saku-over-text"
} as const;

export function SectionHeader({ label, action }: { label: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-2 pt-4 pb-0.5">
      <h2 className="saku-line-thin inline-flex items-center rounded-full bg-saku-paper px-2.5 py-0.5 text-xs font-black">
        {label}
      </h2>
      {action}
    </div>
  );
}

export function BudgetList({
  label,
  budgets,
  onSelect,
  onManage
}: {
  label: string;
  budgets: BudgetRow[];
  onSelect: (row: BudgetRow) => void;
  onManage: () => void;
}) {
  return (
    <section aria-label={label}>
      <SectionHeader
        action={
          <button
            className="inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-xs font-black text-saku-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30"
            onClick={onManage}
            type="button"
          >
            <SlidersHorizontal aria-hidden="true" className="size-3.5" strokeWidth={2.6} />
            Atur
          </button>
        }
        label={label}
      />

      {budgets.length === 0 ? (
        <StickerCard className="mx-1 mt-2 flex items-center gap-3 px-3.5 py-3" tone="coin-soft">
          <SakuMascot mood="happy" size={48} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold">Belum ada batas bulanan.</p>
            <p className="text-xs font-bold text-saku-muted">Pasang batas biar Saku bisa mengingatkan sebelum kebablasan.</p>
          </div>
          <StickerButton className="shrink-0" onClick={onManage} size="md" variant="coin">
            Atur batas
          </StickerButton>
        </StickerCard>
      ) : (
        <ul className="px-1">
          {budgets.map((row, index) => (
            <li key={row.category.id}>
              <button
                aria-label={`${row.category.name}: ${formatPlainAmount(row.spent)} dari ${formatPlainAmount(row.limit)}. ${row.note}. Ketuk untuk mengubah batas.`}
                className="flex w-full items-center gap-3 rounded-2xl pl-2 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30"
                onClick={() => onSelect(row)}
                type="button"
              >
                <CategoryBadge icon={row.category.icon} name={row.category.name} />
                <span
                  className={cn(
                    "min-w-0 flex-1 py-2.5 pr-2.5",
                    index < budgets.length - 1 && "border-b-2 border-dashed border-saku-dash"
                  )}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[15px] font-extrabold">{row.category.name}</span>
                    <span className="shrink-0 font-saku-head text-[15px] font-semibold">
                      {formatPlainAmount(row.spent)}
                      <span className="font-saku-body text-[13px] font-bold text-saku-muted">
                        {" "}
                        / {formatPlainAmount(row.limit)}
                      </span>
                    </span>
                  </span>
                  <span className="saku-line-thin mt-1.5 block h-3 overflow-hidden rounded-full bg-saku-paper">
                    <span
                      className={cn(
                        "block h-full",
                        BUDGET_BAR[row.status],
                        row.percent < 100 && "border-r-2 border-saku-ink"
                      )}
                      style={{ width: `${row.percent}%` }}
                    />
                  </span>
                  <span className={cn("mt-1 flex items-center gap-1 text-xs font-extrabold", BUDGET_NOTE[row.status])}>
                    {row.status === "over" ? <SakuMascot mood="worried" size={22} /> : null}
                    {row.note}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function IncomeVsExpenseCard({ income, expense }: { income: number; expense: number }) {
  const max = Math.max(income, expense, 1);
  const balance = income - expense;
  const savedPercent = income > 0 && balance > 0 ? Math.round((balance / income) * 100) : null;

  const bar = (label: string, value: number, fillClass: string) => {
    const width = Math.round((value / max) * 100);

    return (
      <div className="flex items-center gap-2.5">
        <span className="w-12 text-[13px] font-black">{label}</span>
        <span className="saku-line-thin h-4 flex-1 overflow-hidden rounded-full bg-saku-paper">
          <span
            className={cn("block h-full", fillClass, width < 100 && width > 0 && "border-r-2 border-saku-ink")}
            style={{ width: `${width}%` }}
          />
        </span>
        <span className="w-24 text-right font-saku-head text-[15px] font-semibold">{formatPlainAmount(value)}</span>
      </div>
    );
  };

  return (
    <StickerCard className="mx-1 mt-3 px-4 py-3.5">
      <h2 className="font-saku-head text-lg font-semibold">Masuk vs keluar</h2>
      <div className="mt-2.5 flex flex-col gap-2.5">
        {bar("Masuk", income, "bg-saku-income")}
        {bar("Keluar", expense, "bg-saku-accent")}
      </div>
      <div className="mt-3 flex items-center gap-2.5 border-t-2 border-dashed border-saku-dash pt-2.5">
        <SakuMascot animated mood={balance < 0 ? "worried" : "happy"} size={46} />
        <div className="min-w-0">
          <p className="font-saku-head text-lg font-semibold">
            {balance < 0 ? `Minus ${formatPlainAmount(-balance)}` : `Sisa ${formatPlainAmount(balance)}`}
          </p>
          <p className="text-xs font-bold text-saku-muted">
            {balance < 0
              ? "Pengeluaran lebih besar dari pemasukan bulan ini."
              : savedPercent !== null
                ? `Kamu menyisihkan ${savedPercent}% pemasukan bulan ini.`
                : "Belum ada pemasukan yang tercatat bulan ini."}
          </p>
        </div>
      </div>
    </StickerCard>
  );
}

export function ReportSkeleton() {
  return (
    <div aria-label="Memuat laporan" className="px-2 pt-4" role="status">
      <span className="block h-3.5 w-32 animate-pulse rounded-full bg-saku-track" />
      <span className="mt-2 block h-8 w-48 animate-pulse rounded-full bg-saku-track" />
      <span className="mt-4 block h-[18px] w-full animate-pulse rounded-full bg-saku-track" />
      {[0, 1, 2].map((index) => (
        <span className="mt-3 block h-4 w-full animate-pulse rounded-full bg-saku-track" key={index} />
      ))}
    </div>
  );
}
