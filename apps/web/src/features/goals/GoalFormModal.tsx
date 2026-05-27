import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { ApiClientError } from "../../lib/api-client";
import { queryKeys } from "../../lib/query-keys";
import { useToast } from "../../components/toast/ToastProvider";
import { createGoal, updateGoal } from "./goal.service";
import type { CreateGoalInput, Goal, UpdateGoalInput } from "./goal.types";

type GoalFormModalProps = {
  open: boolean;
  goal: Goal | null;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
};

type GoalFormState = {
  name: string;
  targetAmount: string;
  deadline: string;
  description: string;
};

type GoalMutationInput =
  | {
      mode: "create";
      payload: CreateGoalInput;
    }
  | {
      mode: "edit";
      goal: Goal;
      payload: UpdateGoalInput;
      optimisticGoal: Goal;
    };

function getInitialForm(): GoalFormState {
  return {
    name: "",
    targetAmount: "",
    deadline: "",
    description: ""
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Gagal menyimpan goal.";
}

function toDateInputValue(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function toIsoDateOrNull(value: string) {
  if (!value) {
    return null;
  }

  return new Date(`${value}T00:00:00.000`).toISOString();
}

function normalizeMoneyInput(value: string) {
  return value.replace(/\./g, "").replace(",", ".").trim();
}

export function GoalFormModal({
  open,
  goal,
  onClose,
  onSuccess
}: GoalFormModalProps) {
  const isEditMode = Boolean(goal);

  const [form, setForm] = useState<GoalFormState>(getInitialForm);
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const goalMutation = useMutation({
    mutationFn: (input: GoalMutationInput) => {
      if (input.mode === "create") {
        return createGoal(input.payload);
      }

      return updateGoal(input.goal.id, input.payload);
    },
    onMutate: async (input) => {
      setError(null);
      setForm(getInitialForm());
      onClose();

      await queryClient.cancelQueries({
        queryKey: queryKeys.goals
      });

      const previousGoals = queryClient.getQueryData<Goal[]>(queryKeys.goals);

      if (input.mode === "edit") {
        queryClient.setQueryData<Goal[]>(queryKeys.goals, (currentGoals) => {
          if (!currentGoals) {
            return currentGoals;
          }

          return currentGoals.map((item) =>
            item.id === input.goal.id ? input.optimisticGoal : item
          );
        });
      }

      return {
        previousGoals,
        mode: input.mode,
        goalName:
          input.mode === "edit" ? input.optimisticGoal.name : input.payload.name
      };
    },
    onError: (caughtError, _input, context) => {
      if (context?.previousGoals) {
        queryClient.setQueryData(queryKeys.goals, context.previousGoals);
      }

      addToast({
        variant: "error",
        title: "Gagal menyimpan goal",
        description: getErrorMessage(caughtError)
      });
    },
    onSuccess: (savedGoal, input) => {
      queryClient.setQueryData<Goal[]>(queryKeys.goals, (currentGoals) => {
        if (!currentGoals) {
          return [savedGoal];
        }

        if (input.mode === "create") {
          return [savedGoal, ...currentGoals];
        }

        return currentGoals.map((item) =>
          item.id === savedGoal.id ? savedGoal : item
        );
      });

      addToast({
        variant: "success",
        title:
          input.mode === "edit" ? "Goal berhasil diperbarui" : "Goal berhasil dibuat",
        description:
          input.mode === "edit"
            ? `"${savedGoal.name}" sudah diperbarui.`
            : `"${savedGoal.name}" sudah ditambahkan.`
      });

      void onSuccess();
    }
  });

  const isSubmitting = goalMutation.isPending;

  function handleClose() {
    if (isSubmitting) {
      return;
    }

    setError(null);
    setForm(getInitialForm());
    onClose();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedTargetAmount = normalizeMoneyInput(form.targetAmount);
    const targetAmountNumber = Number(normalizedTargetAmount);
    const nextDeadline = toIsoDateOrNull(form.deadline);
    const nextDescription = form.description.trim() || null;

    if (!form.name.trim()) {
      setError("Nama goal wajib diisi.");
      return;
    }

    if (
      !normalizedTargetAmount ||
      Number.isNaN(targetAmountNumber) ||
      targetAmountNumber <= 0
    ) {
      setError("Target amount harus lebih dari 0.");
      return;
    }

    if (goal && Number(goal.currentAmount) > targetAmountNumber) {
      setError(
        "Target amount tidak boleh lebih kecil dari nominal yang sudah terkumpul."
      );
      return;
    }

    setError(null);

    if (goal) {
      const payload: UpdateGoalInput = {
        name: form.name.trim(),
        targetAmount: normalizedTargetAmount,
        currentAmount: goal.currentAmount,
        deadline: nextDeadline,
        description: nextDescription ?? undefined
      };

      const optimisticGoal: Goal = {
        ...goal,
        name: form.name.trim(),
        targetAmount: normalizedTargetAmount,
        deadline: nextDeadline,
        description: nextDescription,
        updatedAt: new Date().toISOString()
      };

      goalMutation.mutate({
        mode: "edit",
        goal,
        payload,
        optimisticGoal
      });

      return;
    }

    const payload: CreateGoalInput = {
      name: form.name.trim(),
      targetAmount: normalizedTargetAmount,
      currentAmount: "0",
      deadline: nextDeadline,
      description: nextDescription ?? undefined
    };

    goalMutation.mutate({
      mode: "create",
      payload
    });
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    if (goal) {
      setForm({
        name: goal.name,
        targetAmount: String(Math.trunc(Number(goal.targetAmount))),
        deadline: toDateInputValue(goal.deadline),
        description: goal.description ?? ""
      });
    } else {
      setForm(getInitialForm());
    }

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

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--sakuin-secondary)]/35 px-4 py-4 backdrop-blur-md sm:items-center">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[2rem] border border-white/70 bg-white p-5 shadow-[0_30px_90px_rgba(15,23,42,0.28)] sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black text-[var(--sakuin-text)]">
              {isEditMode ? "Edit goal" : "Goal baru"}
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
              {isEditMode ? "Ubah detail goal" : "Tambah target tabungan"}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {isEditMode
                ? "Edit hanya untuk mengubah detail goal. Untuk menambah nominal, gunakan tombol Tambah Dana."
                : "Buat target supaya progres tabunganmu lebih jelas dan terukur."}
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

        {error ? (
          <div className="mb-4 flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            label="Nama goal"
            name="name"
            type="text"
            placeholder="Contoh: Beli Laptop"
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                name: event.target.value
              }))
            }
          />

          <Input
            label="Target amount"
            name="targetAmount"
            type="text"
            inputMode="numeric"
            placeholder="Contoh: 10000000"
            value={form.targetAmount}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                targetAmount: event.target.value
              }))
            }
          />

          {goal ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-bold text-slate-500">
                Nominal terkumpul saat ini
              </p>
              <p className="mt-1 text-lg font-black text-slate-950">
                Rp{" "}
                {Number(goal.currentAmount).toLocaleString("id-ID", {
                  maximumFractionDigits: 0
                })}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Nominal ini tidak diedit dari sini. Gunakan fitur Tambah Dana.
              </p>
            </div>
          ) : null}

          <Input
            label="Deadline"
            name="deadline"
            type="date"
            value={form.deadline}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                deadline: event.target.value
              }))
            }
          />

          <label className="block w-full">
            <span className="mb-2 block text-sm font-semibold text-slate-950">
              Deskripsi
            </span>

            <textarea
              className="min-h-24 w-full resize-none rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[var(--sakuin-primary)] focus:ring-4 focus:ring-[var(--sakuin-focus)]/25"
              placeholder="Contoh: Target laptop untuk kuliah dan kerja"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value
                }))
              }
            />
          </label>

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
              {isEditMode ? "Simpan detail" : "Simpan goal"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}