import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export type StickerCardTone = "paper" | "accent" | "coin-soft" | "bg";

type StickerCardProps = HTMLAttributes<HTMLDivElement> & {
  tone?: StickerCardTone;
  /** Hero cards (balance, totals) get a bigger radius and shadow. */
  hero?: boolean;
};

const toneClassName: Record<StickerCardTone, string> = {
  paper: "bg-saku-paper text-saku-ink",
  accent: "bg-saku-accent text-white",
  "coin-soft": "bg-saku-coin-soft text-saku-ink",
  bg: "bg-saku-bg text-saku-ink"
};

export function StickerCard({ tone = "paper", hero = false, className, ...props }: StickerCardProps) {
  return (
    <div
      className={cn(
        "saku-line",
        hero ? "rounded-saku-hero shadow-saku" : "rounded-saku-card shadow-saku-sm",
        toneClassName[tone],
        className
      )}
      {...props}
    />
  );
}
