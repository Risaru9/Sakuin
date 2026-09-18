import { cn } from "../../lib/cn";

type StickerSwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Accessible name, e.g. "Pengingat aktif". */
  label: string;
  disabled?: boolean;
  className?: string;
};

export function StickerSwitch({
  checked,
  onCheckedChange,
  label,
  disabled = false,
  className
}: StickerSwitchProps) {
  return (
    <button
      aria-checked={checked}
      aria-label={label}
      className={cn(
        "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      role="switch"
      type="button"
    >
      <span
        aria-hidden="true"
        className={cn(
          "saku-line-thin relative h-[30px] w-[52px] rounded-full transition-colors",
          checked ? "bg-saku-accent" : "bg-saku-track"
        )}
      >
        <span
          className={cn(
            "saku-line-hair absolute top-[2px] size-[22px] rounded-full bg-white transition-[left] duration-150 motion-reduce:transition-none",
            checked ? "left-[24px]" : "left-[2px]"
          )}
        />
      </span>
    </button>
  );
}
