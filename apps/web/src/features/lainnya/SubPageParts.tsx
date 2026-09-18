import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { SakuSnackHost } from "../../components/saku";
import { cn } from "../../lib/cn";

const ROUND_BUTTON_CLASS =
  "saku-line-thin saku-press flex size-11 shrink-0 items-center justify-center rounded-full shadow-saku-xs focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30";

type SubPageHeaderProps = {
  title: string;
  /** Where the back arrow leads; Lainnya by default. */
  backTo?: string;
  backLabel?: string;
  /** Adds the yellow "+" button on the right. */
  onAdd?: () => void;
  addLabel?: string;
  trailing?: ReactNode;
};

/** Back arrow, page title and an optional "+" — the top of every page under Lainnya. */
export function SubPageHeader({
  title,
  backTo = "/lainnya",
  backLabel = "Kembali ke Lainnya",
  onAdd,
  addLabel,
  trailing
}: SubPageHeaderProps) {
  return (
    <div className="flex items-center gap-2.5">
      <Link aria-label={backLabel} className={`${ROUND_BUTTON_CLASS} bg-saku-paper`} to={backTo}>
        <ArrowLeft aria-hidden="true" className="size-[18px]" strokeWidth={2.6} />
      </Link>
      <h1 className="min-w-0 flex-1 truncate font-saku-head text-[26px] font-semibold">{title}</h1>
      {trailing}
      {onAdd ? (
        <button aria-label={addLabel ?? `Tambah ${title.toLowerCase()}`} className={`${ROUND_BUTTON_CLASS} bg-saku-coin`} onClick={onAdd} type="button">
          <Plus aria-hidden="true" className="size-5" strokeWidth={3} />
        </button>
      ) : null}
    </div>
  );
}

/** Small uppercase label above a field inside a sheet. */
export function SheetFieldLabel({ htmlFor, children, className }: { htmlFor?: string; children: ReactNode; className?: string }) {
  const labelClassName = cn("mt-4 mb-1.5 block text-xs font-black tracking-[0.05em] text-saku-muted uppercase", className);

  return htmlFor ? (
    <label className={labelClassName} htmlFor={htmlFor}>
      {children}
    </label>
  ) : (
    <p className={labelClassName}>{children}</p>
  );
}

/** Inline error box used at the bottom of sheet forms. */
export function SheetError({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 rounded-2xl bg-saku-over-soft px-3 py-2 text-sm font-extrabold text-saku-over-text" role="alert">
      {children}
    </p>
  );
}

/** Saku's message bubble, floating above the bottom navigation. */
export function FloatingSnackHost() {
  return (
    <div className="fixed inset-x-3 bottom-[calc(var(--sakuin-mobile-nav-height)+0.75rem)] z-40 mx-auto max-w-xl lg:bottom-6 lg:left-[296px]">
      <SakuSnackHost />
    </div>
  );
}
