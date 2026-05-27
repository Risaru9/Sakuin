type SakuinIdentityLogoProps = {
  subtitle?: string;
  size?: "sm" | "md";
};

export function SakuinIdentityLogo({
  subtitle = "Personal finance web app",
  size = "md"
}: SakuinIdentityLogoProps) {
  const iconSizeClass = size === "sm" ? "h-10 w-10" : "h-11 w-11";
  const titleSizeClass = size === "sm" ? "text-base" : "text-lg";

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className={[
          "flex shrink-0 items-center justify-center rounded-xl bg-[var(--sakuin-primary)] font-black text-white ring-1 ring-[var(--sakuin-border)]",
          iconSizeClass,
          size === "sm" ? "text-xs" : "text-sm"
        ].join(" ")}
      >
        S
      </div>
      <div className="min-w-0">
        <p
          className={[
            "truncate font-black leading-none text-[var(--sakuin-text)]",
            titleSizeClass
          ].join(" ")}
        >
          Sakuin
        </p>
        <p className="mt-1 truncate text-xs font-semibold text-zinc-500">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
