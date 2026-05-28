import { SAKUIN_LOGO_SRC } from "./sakuin-logo-assets";

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
      <span
        className={[
          "flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-[var(--sakuin-border)] shadow-sm",
          iconSizeClass
        ].join(" ")}
      >
        <img
          alt={showText ? "" : "Sakuin"}
          aria-hidden={showText ? "true" : undefined}
          className="h-full w-full object-cover"
          src={SAKUIN_LOGO_SRC}
        />
      </span>

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
