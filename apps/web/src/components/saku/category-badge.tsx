import {
  Banknote,
  BookOpen,
  Briefcase,
  Car,
  CircleMinus,
  CirclePlus,
  Coffee,
  Ellipsis,
  Gamepad2,
  Gift,
  HeartPulse,
  House,
  PawPrint,
  PiggyBank,
  Plane,
  Receipt,
  Shirt,
  ShoppingBag,
  Smartphone,
  TrendingUp,
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
// Keys other than the defaults are the ones offered when creating a category.
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
  "plus-circle": { Icon: CirclePlus, background: "#d4f5e0", foreground: "#15803d" },
  coffee: { Icon: Coffee, background: "#f3e1cf", foreground: "#8a4b16" },
  shirt: { Icon: Shirt, background: "#dff3ff", foreground: "#0b6b99" },
  house: { Icon: House, background: "#ffe1dc", foreground: "#b42318" },
  smartphone: { Icon: Smartphone, background: "#dde8ff", foreground: "#1f4fb8" },
  plane: { Icon: Plane, background: "#d6f3f7", foreground: "#0e7490" },
  "gamepad-2": { Icon: Gamepad2, background: "#e7ddff", foreground: "#5b21b6" },
  "paw-print": { Icon: PawPrint, background: "#fde7c8", foreground: "#9a4d00" },
  banknote: { Icon: Banknote, background: "#d4f5e0", foreground: "#15803d" },
  briefcase: { Icon: Briefcase, background: "#e4e1ee", foreground: "#3f3a5a" },
  "trending-up": { Icon: TrendingUp, background: "#ccf1ea", foreground: "#0f766e" },
  "piggy-bank": { Icon: PiggyBank, background: "#ffd6e6", foreground: "#be185d" },
  ellipsis: FALLBACK_VISUAL
};

/** Icon keys offered in "Kategori baru", per transaction type. */
export const CATEGORY_ICON_CHOICES = {
  EXPENSE: [
    "utensils",
    "coffee",
    "car",
    "shopping-bag",
    "shirt",
    "receipt",
    "house",
    "heart-pulse",
    "book-open",
    "smartphone",
    "gamepad-2",
    "paw-print",
    "plane",
    "gift",
    "piggy-bank",
    "ellipsis"
  ],
  INCOME: ["wallet", "banknote", "briefcase", "trending-up", "gift", "piggy-bank", "plus-circle", "ellipsis"]
} as const;

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
