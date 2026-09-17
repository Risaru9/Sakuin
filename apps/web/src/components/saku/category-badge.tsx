import {
  BookOpen,
  Car,
  CircleMinus,
  CirclePlus,
  Ellipsis,
  Gift,
  HeartPulse,
  Receipt,
  ShoppingBag,
  Utensils,
  Wallet,
  type LucideIcon
} from "lucide-react";
import { cn } from "../../lib/cn";

export type CategoryVisual = {
  Icon: LucideIcon;
  /** Soft sticker background. */
  background: string;
  /** Icon color; readable on the background. */
  foreground: string;
};

const FALLBACK_VISUAL: CategoryVisual = {
  Icon: Ellipsis,
  background: "#ebe8f2",
  foreground: "#4b4666"
};

// Keyed by the `icon` value stored on categories (see apps/api default-categories.ts).
const CATEGORY_VISUALS: Record<string, CategoryVisual> = {
  utensils: { Icon: Utensils, background: "#ffe3bd", foreground: "#b45309" },
  car: { Icon: Car, background: "#d6e4ff", foreground: "#2b63e0" },
  "shopping-bag": { Icon: ShoppingBag, background: "#ffd6e6", foreground: "#be185d" },
  receipt: { Icon: Receipt, background: "#ccf1ea", foreground: "#0f766e" },
  "heart-pulse": { Icon: HeartPulse, background: "#d4f5e0", foreground: "#15803d" },
  "book-open": { Icon: BookOpen, background: "#e7ddff", foreground: "#6d28d9" },
  "minus-circle": { Icon: CircleMinus, background: "#ebe8f2", foreground: "#4b4666" },
  wallet: { Icon: Wallet, background: "#d4f5e0", foreground: "#15803d" },
  gift: { Icon: Gift, background: "#fff0b3", foreground: "#8a6100" },
  "plus-circle": { Icon: CirclePlus, background: "#d4f5e0", foreground: "#15803d" }
};

export function getCategoryVisual(icon?: string | null): CategoryVisual {
  if (!icon) {
    return FALLBACK_VISUAL;
  }

  return CATEGORY_VISUALS[icon] ?? FALLBACK_VISUAL;
}

type CategoryBadgeProps = {
  icon?: string | null;
  size?: number;
  className?: string;
};

export function CategoryBadge({ icon, size = 38, className }: CategoryBadgeProps) {
  const visual = getCategoryVisual(icon);
  const iconKey = icon && CATEGORY_VISUALS[icon] ? icon : "fallback";

  return (
    <span
      aria-hidden="true"
      className={cn("saku-line-thin inline-flex shrink-0 items-center justify-center rounded-full", className)}
      data-icon={iconKey}
      style={{ width: size, height: size, background: visual.background }}
    >
      <visual.Icon
        color={visual.foreground}
        size={Math.round(size * 0.48)}
        strokeWidth={2.3}
      />
    </span>
  );
}
