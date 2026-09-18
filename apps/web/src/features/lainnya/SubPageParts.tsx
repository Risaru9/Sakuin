import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronRight, Plus, type LucideIcon } from "lucide-react";
import { SakuSnackHost, StickerCard } from "../../components/saku";
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

export type MenuItem = {
  icon: LucideIcon;
  tint: string;
  title: string;
  subtitle: string;
  danger?: boolean;
} & ({ to: string; onClick?: never } | { to?: never; onClick: () => void });

export function MenuIcon({ icon: Icon, tint, danger = false }: { icon: LucideIcon; tint: string; danger?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="saku-line-thin flex size-[38px] shrink-0 items-center justify-center rounded-full"
      style={{ background: tint }}
    >
      <Icon className={danger ? "size-[18px] text-saku-over-text" : "size-[18px]"} strokeWidth={2.4} />
    </span>
  );
}

export function MenuSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mx-1 mt-5 mb-2 text-xs font-black tracking-[0.05em] text-saku-muted uppercase">{label}</h2>
      <StickerCard className="overflow-hidden">
        <ul>{children}</ul>
      </StickerCard>
    </section>
  );
}

const MENU_ROW_CLASS =
  "flex w-full items-center gap-3 px-3 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-saku-accent/30";

export function MenuRow({ item, isLast }: { item: MenuItem; isLast: boolean }) {
  const content = (
    <>
      <MenuIcon danger={item.danger} icon={item.icon} tint={item.tint} />
      <span
        className={cn(
          "flex min-h-[60px] min-w-0 flex-1 items-center gap-2",
          !isLast && "border-b-2 border-dashed border-saku-dash"
        )}
      >
        <span className="min-w-0 flex-1">
          <span className={cn("block text-[15px] font-black", item.danger && "text-saku-over-text")}>{item.title}</span>
          <span className="block truncate text-xs font-bold text-saku-muted">{item.subtitle}</span>
        </span>
        <ChevronRight aria-hidden="true" className="size-4 shrink-0" strokeWidth={2.6} />
      </span>
    </>
  );

  return (
    <li>
      {item.to ? (
        <Link className={MENU_ROW_CLASS} to={item.to}>
          {content}
        </Link>
      ) : (
        <button className={MENU_ROW_CLASS} onClick={item.onClick} type="button">
          {content}
        </button>
      )}
    </li>
  );
}

/** "Nadia Putri" → "NP", for the round avatar. */
export function getInitials(name: string) {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return letters || "S";
}
