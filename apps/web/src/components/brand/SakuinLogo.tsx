type SakuinLogoProps = {
  showText?: boolean;
  subtitle?: string;
  size?: "sm" | "md";
};

export function SakuinLogo({
  showText = true,
  subtitle,
  size = "md"
}: SakuinLogoProps) {
  const iconSizeClass = size === "sm" ? "h-10 w-10" : "h-12 w-12";
  const titleSizeClass = size === "sm" ? "text-base" : "text-lg";
  const markSizeClass = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        aria-label="Sakuin logo"
        className={[
          "flex shrink-0 items-center justify-center rounded-xl bg-[var(--sakuin-primary)] font-black text-white ring-1 ring-[var(--sakuin-border)]",
          iconSizeClass,
          markSizeClass
        ].join(" ")}
      >
        S
      </div>

      {showText ? (
        <div className="min-w-0">
          <p
            className={[
              "truncate font-black leading-none text-[var(--sakuin-text)]",
              titleSizeClass
            ].join(" ")}
          >
            Sakuin
          </p>

          {subtitle ? (
            <p className="mt-1 truncate text-xs font-semibold text-zinc-500">
              {subtitle}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
