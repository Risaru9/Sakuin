import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "../../lib/cn";

export type SegmentedOption<T extends string> = {
  value: T;
  label: ReactNode;
};

type SegmentedControlProps<T extends string> = {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className
}: SegmentedControlProps<T>) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
      return;
    }

    event.preventDefault();
    const currentIndex = Math.max(
      0,
      options.findIndex((option) => option.value === value)
    );
    const step = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (currentIndex + step + options.length) % options.length;

    onChange(options[nextIndex].value);
    buttonRefs.current[nextIndex]?.focus();
  }

  return (
    <div
      aria-label={ariaLabel}
      className={cn("saku-line-thin grid gap-[3px] rounded-full bg-saku-paper p-[3px]", className)}
      onKeyDown={handleKeyDown}
      role="radiogroup"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option, index) => {
        const selected = option.value === value;

        return (
          <button
            key={option.value}
            ref={(element) => {
              buttonRefs.current[index] = element;
            }}
            aria-checked={selected}
            className={cn(
              "min-h-11 rounded-full border-[1.5px] px-3 text-[13px] font-black transition-colors",
              "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30",
              selected
                ? "border-saku-ink bg-saku-coin text-saku-ink"
                : "border-transparent text-saku-muted"
            )}
            onClick={() => onChange(option.value)}
            role="radio"
            tabIndex={selected ? 0 : -1}
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
