import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, PlusCircle, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { ApiClientError } from "../../lib/api-client";
import { queryKeys } from "../../lib/query-keys";
import { useToast } from "../../components/toast/ToastProvider";
import { updateGoal } from "./goal.service";
import type { Goal } from "./goal.types";

type AddGoalProgressModalProps = {
  open: boolean;
  goal: Goal | null;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
};

type AddGoalProgressMutationInput = {
  goal: Goal;
  nextCurrentAmount: string;
  optimisticGoal: Goal;
};

function getErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Gagal menambah dana goal.";
}

function normalizeMoneyInput(value: string) {
  return value.replace(/\./g, "").replace(",", ".").trim();
}

function formatRupiah(value: string | number | null | undefined) {
  const numberValue = Number(value ?? 0);

  if (Number.isNaN(numberValue)) {
    return "Rp 0";
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(numberValue);
}

export function AddGoalProgressModal({
  open,
  goal,
  onClose,
  onSuccess
}: AddGoalProgressModalProps) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const currentAmount = Number(goal?.currentAmount ?? 0);
  const targetAmount = Number(goal?.targetAmount ?? 0);
  const remainingAmount = Math.max(0, targetAmount - currentAmount);

  const addProgressMutation = useMutation({
    mutationFn: ({ goal, nextCurrentAmount }: AddGoalProgressMutationInput) => {
      return updateGoal(goal.id, {
        name: goal.name,
        targetAmount: goal.targetAmount,
        currentAmount: nextCurrentAmount,
        deadline: goal.deadline,
        description: goal.description ?? undefined
      });
    },
    onMutate: async ({ optimisticGoal }) => {
      setAmount("");
      setError(null);
      onClose();

      await queryClient.cancelQueries({
        queryKey: queryKeys.goals
      });

      const previousGoals = queryClient.getQueryData<Goal[]>(queryKeys.goals);

      queryClient.setQueryData<Goal[]>(queryKeys.goals, (currentGoals) => {
        if (!currentGoals) {
          return currentGoals;
        }

        return currentGoals.map((item) =>
          item.id === optimisticGoal.id ? optimisticGoal : item
        );
      });

      return {
        previousGoals,
        goalName: optimisticGoal.name
      };
    },
    onError: (caughtError, _input, context) => {
      if (context?.previousGoals) {
        queryClient.setQueryData(queryKeys.goals, context.previousGoals);
      }

      addToast({
        variant: "error",
        title: "Gagal menambah dana goal",
        description: getErrorMessage(caughtError)
      });
    },
    onSuccess: (updatedGoal) => {
      queryClient.setQueryData<Goal[]>(queryKeys.goals, (currentGoals) => {
        if (!currentGoals) {
          return [updatedGoal];
        }

        return currentGoals.map((item) =>
          item.id === updatedGoal.id ? updatedGoal : item
        );
      });

      addToast({
        variant: "success",
        title: "Dana goal berhasil ditambahkan",
        description: `Progress "${updatedGoal.name}" sudah diperbarui.`
      });

      void onSuccess();
    }
  });

  const isSubmitting = addProgressMutation.isPending;

  function handleClose() {
    if (isSubmitting) {
      return;
    }

    setAmount("");
    setError(null);
    onClose();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!goal) {
      return;
    }

    const normalizedAmount = normalizeMoneyInput(amount);
    const addAmount = Number(normalizedAmount);

    if (!normalizedAmount || Number.isNaN(addAmount) || addAmount <= 0) {
      setError("Nominal dana tambahan harus lebih dari 0.");
      return;
    }

    const nextCurrentAmountNumber = currentAmount + addAmount;

    if (nextCurrentAmountNumber > targetAmount) {
      setError(
        `Nominal melebihi target. Sisa dana yang dibutuhkan hanya ${formatRupiah(
          remainingAmount
        )}.`
      );
      return;
    }

    const nextCurrentAmount = String(nextCurrentAmountNumber);

    const optimisticGoal: Goal = {
      ...goal,
      currentAmount: nextCurrentAmount,
      updatedAt: new Date().toISOString()
    };

    setError(null);

    addProgressMutation.mutate({
      goal,
      nextCurrentAmount,
      optimisticGoal
    });
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    setAmount("");
    setError(null);
  }, [open, goal]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && open) {
        handleClose();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open, isSubmitting]);

  if (!open || !goal) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 px-4 py-4 backdrop-blur-md sm:items-center">
      <div className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white p-5 shadow-[0_30px_90px_rgba(15,23,42,0.28)] sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black text-indigo-700">Tambah dana</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
              Tambah nominal goal
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Tambahkan dana ke goal “{goal.name}”.
            </p>
          </div>

          <button
            aria-label="Tutup modal"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            onClick={handleClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-bold text-slate-500">Terkumpul</p>
            <p className="mt-1 text-base font-black text-slate-950">
              {formatRupiah(goal.currentAmount)}
            </p>
          </div>

          <div className="rounded-2xl bg-indigo-50 p-4">
            <p className="text-xs font-bold text-indigo-700">Sisa target</p>
            <p className="mt-1 text-base font-black text-indigo-700">
              {formatRupiah(remainingAmount)}
            </p>
          </div>
        </div>

        {error ? (
          <div className="mb-4 flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            label="Nominal tambahan"
            name="amount"
            type="text"
            inputMode="numeric"
            placeholder="Contoh: 50000"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />

          <div className="grid gap-2 pt-2 sm:grid-cols-2">
            <Button
              disabled={isSubmitting}
              onClick={handleClose}
              type="button"
              variant="secondary"
            >
              Batal
            </Button>

            <Button isLoading={isSubmitting} type="submit">
              <PlusCircle className="h-4 w-4" />
              Tambah dana
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}