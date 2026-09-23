import { cn } from "../../lib/cn";
import { SakuMascot, SakuSparkle } from "./saku-mascot";

type SakuAppIconProps = {
  size?: number;
  className?: string;
};

/** The launcher icon: Saku on a yellow coin plate. The Android splash shows the same circle. */
export function SakuAppIcon({ size = 160, className }: SakuAppIconProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full border-saku-ink bg-saku-coin",
        className
      )}
      style={{ width: size, height: size, borderWidth: Math.max(2, Math.round(size / 40)) }}
    >
      <SakuMascot className="mt-[4%]" size={Math.round(size * 0.74)} />
    </span>
  );
}

type SakuLoadingScreenProps = {
  /** Covers the app while it starts, instead of filling a route. */
  overlay?: boolean;
  className?: string;
};

/**
 * Loading screen that continues the Android splash: the same circle stays in the middle of
 * the screen, then the name and bouncing coins appear under it.
 */
export function SakuLoadingScreen({ overlay = false, className }: SakuLoadingScreenProps) {
  return (
    <div
      aria-label="Memuat Sakuin"
      className={cn(
        "bg-saku-bg font-saku-body text-saku-ink",
        overlay ? "pointer-events-none fixed inset-0 z-[999]" : "relative min-h-dvh",
        className
      )}
      role="status"
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <SakuSparkle className="absolute -top-3 -left-8 text-saku-coin" size={16} />
        <SakuSparkle className="absolute top-2 -right-9 text-saku-accent [animation-delay:0.8s]" size={12} />
        <SakuSparkle className="absolute -right-5 -bottom-4 text-saku-coin [animation-delay:1.4s]" size={14} />
        <SakuAppIcon className="origin-[50%_90%] motion-safe:animate-saku-bob" size={160} />
      </div>
      <div className="absolute inset-x-0 top-[calc(50%+104px)] flex flex-col items-center gap-1.5 px-4 text-center">
        <p className="font-saku-head text-3xl font-semibold">Sakuin</p>
        <p className="text-sm font-extrabold text-saku-muted">Menyiapkan catatanmu…</p>
        <span aria-hidden="true" className="mt-2.5 flex gap-2">
          {[0, 150, 300].map((delay) => (
            <span
              className="saku-line-hair size-3 rounded-full bg-saku-coin motion-safe:animate-saku-dot"
              key={delay}
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}
