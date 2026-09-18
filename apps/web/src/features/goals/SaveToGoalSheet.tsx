import { useId, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BottomSheet, SakuMascot, showSnack, StickerButton, StickerChip } from "../../components/saku";
import { ApiClientError } from "../../lib/api-client";
import { queryKeys } from "../../lib/query-keys";
import { formatCompactAmount, formatPlainAmount } from "../beranda/beranda-data";
import { SheetError, SheetFieldLabel } from "../lainnya/SubPageParts";
import { formatAmountInput, parseAmountInput } from "../transactions/amount-input";
import { describeGoalWhen, goalAmounts, type GoalVisual } from "./goal-data";
import { getGoal, updateGoal } from "./goal.service";
import type { Goal } from "./goal.types";

type SaveToGoalSheetProps = {
  goal: Goal | null;
  visual: GoalVisual | null;
  onClose: () => void;
};

const QUICK_AMOUNTS = [50_000, 100_000, 250_000, 500_000, 1_000_000];
const historyDateFormatter = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" });

function SaveForm({ goal, visual, onClose }: { goal: Goal; visual: GoalVisual; onClose: () => void }) {
  const queryClient = useQueryClient();
  const formId = useId();
  const amountId = useId();
  const { current, target, remaining, percent } = goalAmounts(goal);
  const [amountText, setAmountText] = useState(() => formatPlainAmount(Math.min(250_000, remaining)));
  const [error, setError] = useState<string | null>(null);

  // The list does not carry the deposit history; fetch it for this goal only.
  const detailQuery = useQuery({
    queryKey: [...queryKeys.goals, goal.id],
    queryFn: () => getGoal(goal.id),
    staleTime: 60_000
  });
  const history = (detailQuery.data?.history ?? []).filter((entry) => Number(entry.amount) > 0).slice(0, 3);

  const parsed = amountText.trim() ? parseAmountInput(amountText) : null;
  const amount = parsed && parsed > 0 ? parsed : 0;
  // The server refuses more than the target, so the last deposit fills it exactly.
  const effective = Math.min(amount, remaining);
  const after = current + effective;
  const afterPercent = target > 0 ? Math.min(100, Math.round((after / target) * 100)) : 0;
  const leftAfter = Math.max(0, target - after);

  const saveMutation = useMutation({
    mutationFn: () => updateGoal(goal.id, { currentAmount: String(after) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.goals });
      showSnack(
        leftAfter === 0
          ? { title: `${goal.name} tercapai!`, detail: "Hore, Saku ikut senang.", mood: "wow" }
          : { title: `${formatPlainAmount(effective)} ditabung`, detail: `Tinggal ${formatPlainAmount(leftAfter)} lagi`, mood: "happy" }
      );
      onClose();
    },
    onError: (caughtError) =>
      setError(
        caughtError instanceof ApiClientError || caughtError instanceof Error
          ? caughtError.message
          : "Tabungan belum tersimpan. Coba lagi."
      )
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!effective) {
      setError("Isi nominalnya dulu, misalnya 250.000.");
      return;
    }

    setError(null);
    saveMutation.mutate();
  }

  return (
    <BottomSheet
      footer={
        <StickerButton form={formId} fullWidth isLoading={saveMutation.isPending} type="submit">
          {effective ? `Tabung ${formatPlainAmount(effective)}` : "Tabung"}
        </StickerButton>
      }
      leading={
        <span
          aria-hidden="true"
          className="saku-line-thin flex size-11 shrink-0 items-center justify-center rounded-full"
          style={{ background: visual.background }}
        >
          <visual.Icon className="size-5" strokeWidth={2.3} />
        </span>
      }
      onClose={onClose}
      open
      subtitle={describeGoalWhen(goal)}
      title={`Tabung ke ${goal.name}`}
    >
      <form id={formId} noValidate onSubmit={handleSubmit}>
        <SheetFieldLabel className="mt-1" htmlFor={amountId}>
          Nominal
        </SheetFieldLabel>
        <div className="saku-line flex min-h-[60px] items-baseline gap-2 rounded-saku-control bg-saku-paper px-3.5 py-2 focus-within:ring-4 focus-within:ring-saku-accent/30">
          <span aria-hidden="true" className="font-saku-head text-lg font-semibold text-saku-muted">
            Rp
          </span>
          <input
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent font-saku-head leading-10 font-semibold text-saku-ink outline-none placeholder:text-saku-muted/60"
            id={amountId}
            inputMode="decimal"
            onChange={(event) => setAmountText(formatAmountInput(event.target.value))}
            placeholder="0"
            style={{ fontSize: "30px" }}
            value={amountText}
          />
        </div>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map((value) => (
            <StickerChip active={amount === value} key={value} onClick={() => setAmountText(formatPlainAmount(value))}>
              {formatCompactAmount(value)}
            </StickerChip>
          ))}
        </div>

        <div className="saku-line-thin mt-3.5 rounded-[18px] bg-saku-bg px-3.5 py-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-saku-head text-[19px] font-semibold">
              {formatPlainAmount(after)} / {formatPlainAmount(target)}
            </span>
            <span className="text-xs font-extrabold text-saku-muted">
              {percent}% → {afterPercent}%
            </span>
          </div>
          <div className="saku-line-thin relative mt-2 h-4 overflow-hidden rounded-full bg-saku-paper">
            <div className="absolute inset-y-0 left-0 border-r-2 border-saku-ink bg-saku-coin-soft" style={{ width: `${afterPercent}%` }} />
            <div className="absolute inset-y-0 left-0 border-r-2 border-saku-ink bg-saku-coin" style={{ width: `${percent}%` }} />
          </div>
          <div className="mt-2.5 flex items-center gap-2.5">
            <SakuMascot animated mood={leftAfter === 0 ? "wow" : "happy"} size={42} />
            <p className="text-[13px] font-extrabold" aria-live="polite">
              {leftAfter === 0
                ? "Wah, targetnya langsung tercapai!"
                : effective
                  ? `Mantap! Tinggal ${formatPlainAmount(leftAfter)} lagi.`
                  : `Masih kurang ${formatPlainAmount(remaining)}.`}
            </p>
          </div>
        </div>
        {amount > remaining ? (
          <p className="mt-2 text-xs font-extrabold text-saku-muted">
            Cukup {formatPlainAmount(remaining)} untuk mencapai target, jadi yang ditabung {formatPlainAmount(remaining)}.
          </p>
        ) : null}

        {history.length > 0 ? (
          <>
            <SheetFieldLabel>Riwayat</SheetFieldLabel>
            <ul className="flex flex-col gap-1.5">
              {history.map((entry) => (
                <li className="flex justify-between text-[13px] font-extrabold" key={entry.id}>
                  <span className="text-saku-muted">{historyDateFormatter.format(new Date(entry.createdAt))}</span>
                  <span className="font-saku-head font-semibold text-saku-income">+{formatPlainAmount(Number(entry.amount))}</span>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {error ? <SheetError>{error}</SheetError> : null}
      </form>
    </BottomSheet>
  );
}

/** "Tabung": add money to a goal, previewing the progress before and after. */
export function SaveToGoalSheet({ goal, visual, onClose }: SaveToGoalSheetProps) {
  // Re-mounts per goal so the amount starts fresh each time.
  return goal && visual ? <SaveForm goal={goal} key={goal.id} onClose={onClose} visual={visual} /> : null;
}
