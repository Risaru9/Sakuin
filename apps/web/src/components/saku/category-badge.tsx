import {
  Apple,
  BadgeDollarSign,
  Banknote,
  Bike,
  BookOpen,
  Briefcase,
  Building2,
  BusFront,
  Car,
  CircleDollarSign,
  CircleMinus,
  CirclePlus,
  Coins,
  Coffee,
  CreditCard,
  Ellipsis,
  Fuel,
  Gamepad2,
  GraduationCap,
  Gift,
  HeartPulse,
  House,
  Lightbulb,
  Music,
  PawPrint,
  Pill,
  Pizza,
  PiggyBank,
  Plane,
  Receipt,
  ShoppingCart,
  Shirt,
  ShoppingBag,
  Smartphone,
  Store,
  Ticket,
  TrendingUp,
  Utensils,
  Wallet,
  Wifi,
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

const VISUAL_KEYS_BY_CATEGORY_NAME: Array<[RegExp, string]> = [
  [/\b(makan|makanan|kuliner|restoran|warung|jajan|snack|cemilan|sarapan|makan siang|makan malam)\b/i, "utensils"],
  [/\b(minum|minuman|kopi|coffee|teh|cafe|kafe|boba)\b/i, "coffee"],
  [/\b(pizza)\b/i, "pizza"],
  [/\b(buah|sayur|sehat|groceries|sembako)\b/i, "apple"],
  [/\b(transport|kendaraan|mobil|motor|ojek|taksi|taxi|parkir)\b/i, "car"],
  [/\b(sepeda|bike)\b/i, "bike"],
  [/\b(bus|angkot|transit)\b/i, "bus-front"],
  [/\b(bensin|pertalite|pertamax|fuel)\b/i, "fuel"],
  [/\b(belanja|shopping|market|toko|mall|pasar)\b/i, "shopping-bag"],
  [/\b(pakaian|baju|fashion|sepatu|sandal)\b/i, "shirt"],
  [/\b(tagihan|bill|bayar|cicilan|kredit)\b/i, "receipt"],
  [/\b(listrik|token|lampu)\b/i, "lightbulb"],
  [/\b(internet|wifi|pulsa|data)\b/i, "wifi"],
  [/\b(rumah|kos|kontrakan|sewa|properti)\b/i, "house"],
  [/\b(kesehatan|sehat|dokter|rumah sakit|obat|vitamin|klinik)\b/i, "heart-pulse"],
  [/\b(pendidikan|sekolah|kuliah|kursus|buku|belajar)\b/i, "book-open"],
  [/\b(hiburan|game|gaming|permainan)\b/i, "gamepad-2"],
  [/\b(musik|konser|lagu)\b/i, "music"],
  [/\b(film|bioskop|nonton|tiket)\b/i, "ticket"],
  [/\b(hewan|peliharaan|kucing|anjing|pet)\b/i, "paw-print"],
  [/\b(liburan|travel|perjalanan|wisata|pesawat)\b/i, "plane"],
  [/\b(hadiah|kado|donasi|sumbangan)\b/i, "gift"],
  [/\b(tabungan|nabung|saving)\b/i, "piggy-bank"],
  [/\b(gaji|salary|pendapatan|pemasukan)\b/i, "wallet"],
  [/\b(bonus|thr|tunjangan)\b/i, "gift"],
  [/\b(kerja|pekerjaan|freelance|bisnis|usaha)\b/i, "briefcase"]
];

// Keyed by the `icon` value stored on categories (see apps/api default-categories.ts).
// Keys other than the defaults are the ones offered when creating a category.
const CATEGORY_VISUALS: Record<string, CategoryVisual> = {
  apple: { Icon: Apple, background: "#e2f5d8", foreground: "#3f7d20" },
  "badge-dollar-sign": { Icon: BadgeDollarSign, background: "#d4f5e0", foreground: "#15803d" },
  utensils: { Icon: Utensils, background: "#ffe3bd", foreground: "#b45309" },
  pizza: { Icon: Pizza, background: "#ffe3bd", foreground: "#b45309" },
  car: { Icon: Car, background: "#d6e4ff", foreground: "#2b63e0" },
  bike: { Icon: Bike, background: "#d6f3f7", foreground: "#0e7490" },
  "bus-front": { Icon: BusFront, background: "#d6e4ff", foreground: "#2b63e0" },
  fuel: { Icon: Fuel, background: "#e4e1ee", foreground: "#3f3a5a" },
  "shopping-bag": { Icon: ShoppingBag, background: "#ffd6e6", foreground: "#be185d" },
  "shopping-cart": { Icon: ShoppingCart, background: "#ffd6e6", foreground: "#be185d" },
  receipt: { Icon: Receipt, background: "#ccf1ea", foreground: "#0f766e" },
  lightbulb: { Icon: Lightbulb, background: "#fff0b3", foreground: "#8a6100" },
  wifi: { Icon: Wifi, background: "#dde8ff", foreground: "#1f4fb8" },
  "heart-pulse": { Icon: HeartPulse, background: "#d4f5e0", foreground: "#15803d" },
  pill: { Icon: Pill, background: "#d4f5e0", foreground: "#15803d" },
  "book-open": { Icon: BookOpen, background: "#e7ddff", foreground: "#6d28d9" },
  "graduation-cap": { Icon: GraduationCap, background: "#e7ddff", foreground: "#6d28d9" },
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
  gamepad: { Icon: Gamepad2, background: "#e7ddff", foreground: "#5b21b6" },
  music: { Icon: Music, background: "#e7ddff", foreground: "#5b21b6" },
  ticket: { Icon: Ticket, background: "#ffd6e6", foreground: "#be185d" },
  "paw-print": { Icon: PawPrint, background: "#fde7c8", foreground: "#9a4d00" },
  banknote: { Icon: Banknote, background: "#d4f5e0", foreground: "#15803d" },
  briefcase: { Icon: Briefcase, background: "#e4e1ee", foreground: "#3f3a5a" },
  "trending-up": { Icon: TrendingUp, background: "#ccf1ea", foreground: "#0f766e" },
  "piggy-bank": { Icon: PiggyBank, background: "#ffd6e6", foreground: "#be185d" },
  "circle-dollar-sign": { Icon: CircleDollarSign, background: "#d4f5e0", foreground: "#15803d" },
  coins: { Icon: Coins, background: "#fff0b3", foreground: "#8a6100" },
  "credit-card": { Icon: CreditCard, background: "#dde8ff", foreground: "#1f4fb8" },
  "building-2": { Icon: Building2, background: "#e4e1ee", foreground: "#3f3a5a" },
  store: { Icon: Store, background: "#ffd6e6", foreground: "#be185d" },
  ellipsis: FALLBACK_VISUAL
};

/** Icon keys offered in "Kategori baru", per transaction type. */
export const CATEGORY_ICON_CHOICES = {
  EXPENSE: [
    "utensils",
    "coffee",
    "pizza",
    "apple",
    "car",
    "bike",
    "bus-front",
    "fuel",
    "shopping-bag",
    "shopping-cart",
    "shirt",
    "receipt",
    "house",
    "lightbulb",
    "wifi",
    "heart-pulse",
    "pill",
    "book-open",
    "graduation-cap",
    "smartphone",
    "gamepad-2",
    "music",
    "ticket",
    "paw-print",
    "plane",
    "gift",
    "piggy-bank",
    "ellipsis"
  ],
  INCOME: [
    "wallet",
    "banknote",
    "circle-dollar-sign",
    "coins",
    "credit-card",
    "badge-dollar-sign",
    "briefcase",
    "building-2",
    "store",
    "trending-up",
    "gift",
    "piggy-bank",
    "plus-circle",
    "ellipsis"
  ]
} as const;

function normalizeCategoryName(name: string) {
  return name
    .trim()
    .toLocaleLowerCase("id-ID")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getNameVisualKey(name?: string | null) {
  if (!name) {
    return null;
  }

  const normalizedName = normalizeCategoryName(name);
  return VISUAL_KEYS_BY_CATEGORY_NAME.find(([pattern]) => pattern.test(normalizedName))?.[1] ?? null;
}

export function getCategoryVisual(icon?: string | null, name?: string | null): CategoryVisual {
  if (icon && CATEGORY_VISUALS[icon]) {
    return CATEGORY_VISUALS[icon];
  }

  const nameVisualKey = getNameVisualKey(name);
  return nameVisualKey ? CATEGORY_VISUALS[nameVisualKey] : FALLBACK_VISUAL;
}

type CategoryBadgeProps = {
  icon?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
};

export function CategoryBadge({ icon, name, size = 38, className }: CategoryBadgeProps) {
  const visual = getCategoryVisual(icon, name);
  const iconKey = icon && CATEGORY_VISUALS[icon] ? icon : getNameVisualKey(name) ?? "fallback";

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
