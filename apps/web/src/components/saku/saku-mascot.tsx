import { cn } from "../../lib/cn";

export type SakuMood = "happy" | "wow" | "worried";

type SakuMascotProps = {
  mood?: SakuMood;
  size?: number;
  animated?: boolean;
  /** Accessible name. Leave empty when the mascot is decorative. */
  label?: string;
  className?: string;
};

function Eye({ cx, mood }: { cx: number; mood: SakuMood }) {
  const pupilOffsetX = mood === "wow" ? 0 : 2;
  const pupilOffsetY = mood === "worried" ? 4 : 2;

  return (
    <g>
      <ellipse
        className="fill-white stroke-saku-ink"
        cx={cx}
        cy={74}
        rx={9.5}
        ry={mood === "wow" ? 12.5 : 11}
        strokeWidth={3}
      />
      <circle
        className="fill-saku-ink"
        cx={cx + pupilOffsetX}
        cy={74 + pupilOffsetY}
        r={5.2}
      />
      <circle
        className="fill-white"
        cx={cx + pupilOffsetX + 2}
        cy={71 + pupilOffsetY}
        r={1.9}
      />
    </g>
  );
}

function Mouth({ mood }: { mood: SakuMood }) {
  if (mood === "wow") {
    return (
      <g>
        <ellipse className="fill-saku-ink" cx={60} cy={98} rx={6.5} ry={8} />
        <ellipse cx={60} cy={101} fill="#ff8fa3" rx={3.5} ry={3} />
      </g>
    );
  }

  if (mood === "worried") {
    return (
      <path
        className="stroke-saku-ink"
        d="M48 99 Q54 93 60 99 Q66 105 72 99"
        fill="none"
        strokeLinecap="round"
        strokeWidth={4}
      />
    );
  }

  return (
    <path
      className="stroke-saku-ink"
      d="M49 93 Q60 105 71 93"
      fill="none"
      strokeLinecap="round"
      strokeWidth={4.2}
    />
  );
}

/**
 * Saku: Sakuin's pocket mascot carrying a coin (drawn from the product name and logo).
 */
export function SakuMascot({
  mood = "happy",
  size = 72,
  animated = false,
  label,
  className
}: SakuMascotProps) {
  const accessibility = label
    ? { role: "img", "aria-label": label }
    : { "aria-hidden": true as const };

  return (
    <svg
      {...accessibility}
      className={cn(
        "shrink-0 overflow-visible",
        animated && "origin-[50%_90%] motion-safe:animate-saku-bob",
        className
      )}
      data-mood={mood}
      height={size}
      viewBox="0 0 120 120"
      width={size}
    >
      <circle className="fill-saku-coin stroke-saku-ink" cx={80} cy={30} r={17} strokeWidth={4} />
      <circle
        className="stroke-saku-ink"
        cx={80}
        cy={30}
        fill="none"
        opacity={0.5}
        r={8.5}
        strokeWidth={2.4}
      />
      <path
        className="fill-saku-mascot stroke-saku-ink"
        d="M16 44 Q16 36 24 36 H96 Q104 36 104 44 V76 Q104 106 60 114 Q16 106 16 76 Z"
        strokeLinejoin="round"
        strokeWidth={4}
      />
      <path
        d="M26 50 Q60 60 94 50"
        fill="none"
        opacity={0.8}
        stroke="#ffffff"
        strokeDasharray="6 6"
        strokeLinecap="round"
        strokeWidth={3}
      />
      <Eye cx={43} mood={mood} />
      <Eye cx={73} mood={mood} />
      <Mouth mood={mood} />
      <ellipse className="fill-saku-cheek" cx={30} cy={92} rx={6.5} ry={3.8} />
      <ellipse className="fill-saku-cheek" cx={90} cy={92} rx={6.5} ry={3.8} />
      {mood === "worried" ? (
        <g className="stroke-saku-ink" strokeLinecap="round">
          <path d="M34 58 L50 63" strokeWidth={3.5} />
          <path d="M86 58 L70 63" strokeWidth={3.5} />
          <path
            d="M107 48 Q114 60 107 65 Q100 60 107 48 Z"
            fill="#8fd3ff"
            strokeWidth={2.5}
          />
        </g>
      ) : null}
      {mood === "wow" ? (
        <g className="stroke-saku-ink" strokeLinecap="round" strokeWidth={3}>
          <path d="M104 16 l4 -8" />
          <path d="M110 24 l8 -3" />
        </g>
      ) : null}
    </svg>
  );
}

type SakuSparkleProps = {
  size?: number;
  className?: string;
};

/** Decorative twinkling star used on hero cards. */
export function SakuSparkle({ size = 14, className }: SakuSparkleProps) {
  return (
    <svg
      aria-hidden="true"
      className={cn("pointer-events-none fill-current motion-safe:animate-saku-twinkle", className)}
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      <path d="M12 1 C13 8 16 11 23 12 C16 13 13 16 12 23 C11 16 8 13 1 12 C8 11 11 8 12 1 Z" />
    </svg>
  );
}
