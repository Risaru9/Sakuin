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

  return (
    <div className="flex min-w-0 items-center gap-3">
      <img
        alt="Sakuin logo"
        className={[
          "shrink-0 rounded-[1.25rem] object-cover shadow-lg shadow-violet-500/20 ring-1 ring-violet-200/70",
          iconSizeClass
        ].join(" ")}
        src="/icons/sakuin-logo.svg?v=2"
      />

      {showText ? (
        <div className="min-w-0">
          <p
            className={[
              "truncate font-black leading-none tracking-tight text-slate-950",
              titleSizeClass
            ].join(" ")}
          >
            Sakuin
          </p>

          {subtitle ? (
            <p className="mt-1 truncate text-xs font-semibold text-slate-500">
              {subtitle}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}