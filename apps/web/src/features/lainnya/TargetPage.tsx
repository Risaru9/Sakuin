import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { AppShell } from "../../components/layout/AppShell";
import { SakuMascot, StickerButton, StickerCard, StickerChip } from "../../components/saku";
import { cn } from "../../lib/cn";
import { queryKeys } from "../../lib/query-keys";
import { formatPlainAmount } from "../beranda/beranda-data";
import { describeGoalHint, describeGoalWhen, goalAmounts, goalVisual, type GoalVisual } from "../goals/goal-data";
import { GoalFormSheet } from "../goals/GoalFormSheet";
import { getGoals } from "../goals/goal.service";
import type { Goal } from "../goals/goal.types";
import { SaveToGoalSheet } from "../goals/SaveToGoalSheet";
import { FloatingSnackHost, SubPageHeader } from "./SubPageParts";

type GoalItem = { goal: Goal; visual: GoalVisual };

function GoalCard({ item, onEdit, onSave }: { item: GoalItem; onEdit: () => void; onSave: () => void }) {
  const { goal, visual } = item;
  const { current, target, percent, done } = goalAmounts(goal);

  return (
    <StickerCard className="relative p-3.5">
      {done ? <SakuMascot animated className="absolute -top-5 right-2.5" mood="wow" size={58} /> : null}
      <button
        aria-label={`Ubah target ${goal.name}`}
        className="block w-full rounded-2xl text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30"
        onClick={onEdit}
        type="button"
      >
        <span className={cn("flex items-center gap-3", done && "pr-[60px]")}>
          <span
            aria-hidden="true"
            className="saku-line-thin flex size-[46px] shrink-0 items-center justify-center rounded-full"
            style={{ background: visual.background }}
          >
            <visual.Icon className="size-[22px]" strokeWidth={2.3} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate font-saku-head text-[19px] font-semibold">{goal.name}</span>
              {done ? (
                <span className="saku-line-hair shrink-0 rounded-full bg-saku-coin px-2 text-[11px] font-black motion-safe:animate-saku-pop">
                  Tercapai!
                </span>
              ) : null}
            </span>
            <span className="block text-xs font-bold text-saku-muted">{describeGoalWhen(goal)}</span>
          </span>
        </span>
        <span className="mt-3 flex items-baseline justify-between">
          <span className="font-saku-head text-lg font-semibold">
            Rp {formatPlainAmount(current)}
            <span className="font-saku-body text-xs font-bold text-saku-muted"> / Rp {formatPlainAmount(target)}</span>
          </span>
          <span className="text-[13px] font-black">{percent}%</span>
        </span>
        <span className="saku-line-thin mt-1.5 block h-3.5 overflow-hidden rounded-full bg-saku-paper">
          <span
            className={cn(
              "block h-full",
              done ? "bg-[#16a34a]" : "bg-saku-coin",
              percent > 0 && percent < 100 && "border-r-2 border-saku-ink"
            )}
            style={{ width: `${percent}%` }}
          />
        </span>
      </button>
      {done ? null : (
        <div className="mt-2.5 flex items-center gap-2.5">
          <p className="min-w-0 flex-1 text-xs font-bold text-saku-muted">{describeGoalHint(goal)}</p>
          <StickerChip aria-label={`Tabung ke ${goal.name}`} leading={<Plus aria-hidden="true" className="size-[15px]" strokeWidth={3} />} onClick={onSave}>
            Tabung
          </StickerChip>
        </div>
      )}
    </StickerCard>
  );
}

/** Target tabungan: progress per goal, a monthly nudge, and a quick "Tabung". */
export function TargetPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [saving, setSaving] = useState<GoalItem | null>(null);

  const goalsQuery = useQuery({
    queryKey: queryKeys.goals,
    queryFn: getGoals,
    staleTime: 60_000
  });

  const items = useMemo(() => {
    const goals = goalsQuery.data ?? [];
    const withVisuals = goals.map((goal, index) => ({ goal, visual: goalVisual(goal.name, index) }));
    // Running goals first (closest deadline first), reached ones at the bottom.
    return withVisuals.sort((first, second) => {
      const firstDone = goalAmounts(first.goal).done;
      const secondDone = goalAmounts(second.goal).done;

      if (firstDone !== secondDone) {
        return firstDone ? 1 : -1;
      }

      return (first.goal.deadline ?? "9999").localeCompare(second.goal.deadline ?? "9999");
    });
  }, [goalsQuery.data]);

  const totalSaved = items.reduce((sum, item) => sum + goalAmounts(item.goal).current, 0);
  const doneCount = items.filter((item) => goalAmounts(item.goal).done).length;
  const runningCount = items.length - doneCount;

  function openForm(goal: Goal | null) {
    setEditing(goal);
    setFormOpen(true);
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-xl pb-4">
        <SubPageHeader addLabel="Tambah target" onAdd={() => openForm(null)} title="Target tabungan" />

        {goalsQuery.isPending ? (
          <div aria-hidden="true" className="mt-4 space-y-3.5">
            <div className="h-[72px] animate-pulse rounded-saku-card bg-saku-dash/60" />
            <div className="h-[170px] animate-pulse rounded-saku-card bg-saku-dash/40" />
          </div>
        ) : null}

        {goalsQuery.isError ? (
          <StickerCard className="mt-4 flex items-center gap-3 p-4">
            <SakuMascot mood="worried" size={56} />
            <p className="min-w-0 flex-1 font-black">Target belum termuat</p>
            <StickerButton onClick={() => void goalsQuery.refetch()} size="md" variant="plain">
              Coba lagi
            </StickerButton>
          </StickerCard>
        ) : null}

        {goalsQuery.data && items.length === 0 ? (
          <StickerCard className="mt-4 flex flex-col items-center gap-2 px-5 py-6 text-center" tone="coin-soft">
            <SakuMascot animated size={72} />
            <p className="font-saku-head text-xl font-semibold">Mau nabung untuk apa?</p>
            <p className="text-sm font-bold text-saku-muted">
              Laptop, liburan, atau dana darurat. Saku bantu hitung berapa yang perlu disisihkan tiap bulan.
            </p>
            <StickerButton className="mt-2" onClick={() => openForm(null)} size="md">
              Buat target pertama
            </StickerButton>
          </StickerCard>
        ) : null}

        {items.length > 0 ? (
          <>
            <div className="saku-line-thin mt-3.5 flex items-center gap-3 rounded-saku-card bg-saku-coin-soft px-3.5 py-3">
              <SakuMascot animated size={48} />
              <div>
                <p className="font-saku-head text-lg font-semibold">Total ditabung {formatPlainAmount(totalSaved)}</p>
                <p className="text-xs font-bold text-saku-muted">
                  {runningCount} target berjalan{doneCount > 0 ? ` · ${doneCount} tercapai` : ""}
                </p>
              </div>
            </div>

            <ul className="mt-4 flex flex-col gap-3.5">
              {items.map((item) => (
                <li key={item.goal.id}>
                  <GoalCard item={item} onEdit={() => openForm(item.goal)} onSave={() => setSaving(item)} />
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>

      <FloatingSnackHost />

      <GoalFormSheet goal={editing} onClose={() => setFormOpen(false)} open={formOpen} />
      <SaveToGoalSheet goal={saving?.goal ?? null} onClose={() => setSaving(null)} visual={saving?.visual ?? null} />
    </AppShell>
  );
}
