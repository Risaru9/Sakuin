import {
  Bike,
  Car,
  GraduationCap,
  Heart,
  House,
  Laptop,
  PiggyBank,
  Plane,
  Smartphone,
  Ticket,
  Umbrella,
  Gift,
  type LucideIcon
} from "lucide-react";
import { formatCompactAmount } from "../beranda/beranda-data";
import type { Goal } from "./goal.types";

export type GoalVisual = { Icon: LucideIcon; background: string };

// Goals have no icon column, so the icon follows words in the name.
const ICON_RULES: Array<[RegExp, LucideIcon]> = [
  [/laptop|komputer|pc\b|macbook/i, Laptop],
  [/\bhp\b|handphone|iphone|ponsel|gadget/i, Smartphone],
  [/darurat|cadangan|jaga-jaga/i, Umbrella],
  [/tiket|konser|nonton/i, Ticket],
  [/liburan|jalan-jalan|mudik|umroh|haji|pesawat|trip/i, Plane],
  [/rumah|kos|kontrakan|dp\b/i, House],
  [/mobil/i, Car],
  [/motor|sepeda/i, Bike],
  [/nikah|kawin|lamaran/i, Heart],
  [/kuliah|sekolah|kursus|pendidikan/i, GraduationCap],
  [/hadiah|kado|lebaran|natal/i, Gift]
];

const BACKGROUNDS = ["#d6e4ff", "#d4f5e0", "#ffd6e6", "#fff0b3", "#e7ddff", "#ccf1ea"];

export function goalVisual(name: string, index: number): GoalVisual {
  const match = ICON_RULES.find(([pattern]) => pattern.test(name));

  return {
    Icon: match?.[1] ?? PiggyBank,
    background: BACKGROUNDS[index % BACKGROUNDS.length]
  };
}

export function goalAmounts(goal: Pick<Goal, "currentAmount" | "targetAmount">) {
  const current = Number(goal.currentAmount) || 0;
  const target = Number(goal.targetAmount) || 0;

  return {
    current,
    target,
    remaining: Math.max(0, target - current),
    percent: target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0,
    done: target > 0 && current >= target
  };
}

const fullDateFormatter = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" });
const DAY_MS = 24 * 60 * 60 * 1000;
const AVERAGE_MONTH_DAYS = 30.44;

export function formatGoalDate(isoDate: string) {
  return fullDateFormatter.format(new Date(isoDate));
}

/** The grey line under the name: the deadline, or when it was reached. */
export function describeGoalWhen(goal: Pick<Goal, "deadline" | "updatedAt" | "currentAmount" | "targetAmount">) {
  if (goalAmounts(goal).done) {
    return `Tercapai ${formatGoalDate(goal.updatedAt)}`;
  }

  return goal.deadline ? `Target ${formatGoalDate(goal.deadline)}` : "Tanpa tenggat";
}

/** A nudge for a running goal: how much to set aside each month to make the deadline. */
export function describeGoalHint(
  goal: Pick<Goal, "deadline" | "currentAmount" | "targetAmount">,
  now: Date = new Date()
) {
  const { remaining, percent } = goalAmounts(goal);

  if (!goal.deadline) {
    return percent > 0 ? `Pelan-pelan saja, sudah ${percent}%` : "Mulai dari nominal kecil juga boleh";
  }

  const daysLeft = (new Date(goal.deadline).getTime() - now.getTime()) / DAY_MS;

  if (daysLeft < 0) {
    return "Tenggatnya sudah lewat. Tetap lanjut pelan-pelan, ya";
  }

  const months = Math.max(1, daysLeft / AVERAGE_MONTH_DAYS);
  return `Sisihkan ±${formatCompactAmount(Math.ceil(remaining / months))} per bulan supaya tepat waktu`;
}
