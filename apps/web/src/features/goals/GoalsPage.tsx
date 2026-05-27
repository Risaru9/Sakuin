import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Edit3,
  Loader2,
  Plus,
  PlusCircle,
  Star,
  Trash2
} from "lucide-react";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { AppShell } from "../../components/layout/AppShell";
import { useToast } from "../../components/toast/ToastProvider";
import { Button } from "../../components/ui/button";
import { ApiClientError } from "../../lib/api-client";
import { queryKeys } from "../../lib/query-keys";
import { AddGoalProgressModal } from "./AddGoalProgressModal";
import {
  clearDashboardPriorityGoalId,
  getDashboardPriorityGoalId,
  setDashboardPriorityGoalId
} from "./dashboard-goal-priority";
import { deleteGoal, getGoals } from "./goal.service";
import type { Goal } from "./goal.types";
import { GoalFormModal } from "./GoalFormModal";

function getErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Terjadi kesalahan.";
}

function toNumber(value: string | number | null | undefined) {
  const numberValue = Number(value ?? 0);

  if (Number.isNaN(numberValue)) {
    return 0;
  }

  return numberValue;
}

function formatRupiah(value: string | number | null | undefined) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(toNumber(value));
}

function formatDate(value: string | null) {
  if (!value) {
    return "Tanpa deadline";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Tanpa deadline";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function getGoalProgress(goal: Goal) {
  const target = toNumber(goal.targetAmount);
  const current = toNumber(goal.currentAmount);

  if (target <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((current / target) * 100));
}

function GoalCard({
  goal,
  onAddProgress,
  onSetDashboardPriority,
  onEdit,
  onDelete,
  isDashboardPriority,
  isDeleting
}: {
  goal: Goal;
  onAddProgress: (goal: Goal) => void;
  onSetDashboardPriority: (goal: Goal) => void;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
  isDashboardPriority: boolean;
  isDeleting: boolean;
}) {
  const progress = getGoalProgress(goal);

  return (
    <div className="rounded-3xl border border-[var(--sakuin-border)] bg-white p-5 shadow-sm transition hover:bg-[var(--sakuin-primary-soft)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-lg font-black text-[var(--sakuin-text)]">
            {goal.name}
          </p>

          <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-zinc-500">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatDate(goal.deadline)}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="rounded-full bg-[var(--sakuin-primary-soft)] px-3 py-1 text-xs font-black text-[var(--sakuin-text)]">
            {progress}%
          </span>

          {isDashboardPriority ? (
            <span className="rounded-full bg-[var(--sakuin-secondary)] px-3 py-1 text-[10px] font-black text-white">
              Dashboard
            </span>
          ) : null}
        </div>
      </div>

      {goal.description ? (
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          {goal.description}
        </p>
      ) : null}

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold text-zinc-500">
          <span className="truncate">{formatRupiah(goal.currentAmount)}</span>
          <span className="shrink-0">{formatRupiah(goal.targetAmount)}</span>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full bg-[var(--sakuin-primary)]"
            style={{
              width: `${progress}%`
            }}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_90px_90px]">
        <button
          className={
            isDashboardPriority
              ? "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--sakuin-secondary)] px-3 text-xs font-black text-white transition hover:bg-[var(--sakuin-secondary)]"
              : "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--sakuin-primary-soft)] px-3 text-xs font-black text-[var(--sakuin-text)] transition hover:bg-[var(--sakuin-primary-soft)]"
          }
          onClick={() => onSetDashboardPriority(goal)}
          type="button"
        >
          {isDashboardPriority ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Star className="h-4 w-4" />
          )}
          {isDashboardPriority ? "Prioritas Aktif" : "Jadikan Prioritas"}
        </button>

        <button
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--sakuin-secondary)] px-3 text-xs font-black text-white transition hover:bg-[var(--sakuin-secondary)]"
          onClick={() => onAddProgress(goal)}
          type="button"
        >
          <PlusCircle className="h-4 w-4" />
          Tambah Dana
        </button>

        <button
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--sakuin-primary-soft)] px-3 text-xs font-black text-[var(--sakuin-text)] transition hover:bg-[var(--sakuin-primary-soft)]"
          onClick={() => onEdit(goal)}
          type="button"
        >
          <Edit3 className="h-4 w-4" />
          Edit
        </button>

        <button
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-rose-50 px-3 text-xs font-black text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isDeleting}
          onClick={() => onDelete(goal)}
          type="button"
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Hapus
        </button>
      </div>
    </div>
  );
}

export function GoalsPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const [progressGoal, setProgressGoal] = useState<Goal | null>(null);
  const [dashboardPriorityGoalId, setDashboardPriorityGoalIdState] =
    useState<string | null>(() => getDashboardPriorityGoalId());

  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const goalsQuery = useQuery({
    queryKey: queryKeys.goals,
    queryFn: getGoals
  });

  const goals = goalsQuery.data ?? [];
  const isLoading = goalsQuery.isLoading && !goalsQuery.data;
  const isBackgroundFetching = goalsQuery.isFetching && Boolean(goalsQuery.data);

  const error =
    goalsQuery.error && !goalsQuery.data
      ? getErrorMessage(goalsQuery.error)
      : null;

  const totalTarget = useMemo(() => {
    return goals.reduce((total, goal) => total + toNumber(goal.targetAmount), 0);
  }, [goals]);

  const totalCurrent = useMemo(() => {
    return goals.reduce(
      (total, goal) => total + toNumber(goal.currentAmount),
      0
    );
  }, [goals]);

  const overallProgress = useMemo(() => {
    if (totalTarget <= 0) {
      return 0;
    }

    return Math.min(100, Math.round((totalCurrent / totalTarget) * 100));
  }, [totalCurrent, totalTarget]);

  const deleteGoalMutation = useMutation({
    mutationFn: (goal: Goal) => deleteGoal(goal.id),
    onMutate: async (goal) => {
      setGoalToDelete(null);
      setDeleteError(null);

      await queryClient.cancelQueries({
        queryKey: queryKeys.goals
      });

      const previousGoals = queryClient.getQueryData<Goal[]>(queryKeys.goals);

      queryClient.setQueryData<Goal[]>(queryKeys.goals, (currentGoals) => {
        if (!currentGoals) {
          return currentGoals;
        }

        return currentGoals.filter((item) => item.id !== goal.id);
      });

      if (dashboardPriorityGoalId === goal.id) {
        clearDashboardPriorityGoalId();
        setDashboardPriorityGoalIdState(null);
      }

      return {
        previousGoals,
        deletedGoalName: goal.name
      };
    },
    onError: (caughtError, _goal, context) => {
      if (context?.previousGoals) {
        queryClient.setQueryData(queryKeys.goals, context.previousGoals);
      }

      const message = getErrorMessage(caughtError);

      setDeleteError(message);

      addToast({
        variant: "error",
        title: "Gagal menghapus goal",
        description: message
      });
    },
    onSuccess: (_deletedGoal, _goal, context) => {
      addToast({
        variant: "success",
        title: "Goal berhasil dihapus",
        description: `"${context?.deletedGoalName ?? "Goal"}" sudah dihapus dari daftar goals.`
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.goals
      });

      void queryClient.invalidateQueries({
        queryKey: queryKeys.summary
      });
    }
  });

  function refreshGoalsData() {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.goals
    });

    void queryClient.invalidateQueries({
      queryKey: queryKeys.summary
    });
  }

  function retryGoals() {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.goals
    });
  }

  function handleCreate() {
    setSelectedGoal(null);
    setIsFormOpen(true);
  }

  function handleEdit(goal: Goal) {
    setSelectedGoal(goal);
    setIsFormOpen(true);
  }

  function handleAddProgress(goal: Goal) {
    setProgressGoal(goal);
  }

  function handleSetDashboardPriority(goal: Goal) {
    setDashboardPriorityGoalId(goal.id);
    setDashboardPriorityGoalIdState(goal.id);

    addToast({
      variant: "success",
      title: "Goal prioritas diperbarui",
      description: `"${goal.name}" sekarang tampil sebagai prioritas di dashboard.`
    });

    void queryClient.invalidateQueries({
      queryKey: queryKeys.summary
    });
  }

  function openDeleteDialog(goal: Goal) {
    setDeleteError(null);
    setGoalToDelete(goal);
  }

  function closeDeleteDialog() {
    if (deleteGoalMutation.isPending) {
      return;
    }

    setGoalToDelete(null);
    setDeleteError(null);
  }

  function handleConfirmDelete() {
    if (!goalToDelete) {
      return;
    }

    deleteGoalMutation.mutate(goalToDelete);
  }

  useEffect(() => {
    if (!goalsQuery.data) {
      return;
    }

    const storedPriorityGoalId = getDashboardPriorityGoalId();

    if (
      storedPriorityGoalId &&
      !goalsQuery.data.some((goal) => goal.id === storedPriorityGoalId)
    ) {
      clearDashboardPriorityGoalId();
      setDashboardPriorityGoalIdState(null);
      return;
    }

    setDashboardPriorityGoalIdState(storedPriorityGoalId);
  }, [goalsQuery.data]);

  const deleteDialogDescription = deleteError
    ? `Gagal menghapus goal: ${deleteError}`
    : goalToDelete
      ? `Goal "${goalToDelete.name}" akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`
      : "";

  return (
    <AppShell>
      <header className="mb-5 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-zinc-500">Sakuin Goals</p>

          <h1 className="mt-1 text-2xl font-black tracking-tight text-[var(--sakuin-text)] sm:text-4xl">
            Goals Tabungan
          </h1>

          <p className="mt-1 text-sm font-medium text-zinc-600">
            Pantau target tabungan dan progres pencapaiannya.
          </p>
        </div>

        <Button
          className="rounded-xl bg-[var(--sakuin-secondary)] text-white hover:bg-[var(--sakuin-secondary)] focus-visible:ring-[var(--sakuin-focus)]"
          onClick={handleCreate}
          size="md"
        >
          <Plus className="h-4 w-4" />
          Tambah Goal
        </Button>
      </header>

      <div className="mb-5 rounded-3xl border border-[var(--sakuin-secondary)] bg-[var(--sakuin-primary)] p-5 text-white shadow-[0_20px_50px_rgba(10,142,140,0.15)] sm:p-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-white/85">
              Total Progress Goals
            </p>

            <p className="mt-2 text-4xl font-black">{overallProgress}%</p>

            <p className="mt-2 text-sm text-white/85">
              {formatRupiah(totalCurrent)} terkumpul dari{" "}
              {formatRupiah(totalTarget)} target.
            </p>
          </div>

          {isBackgroundFetching ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-black text-[var(--sakuin-text)]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Memperbarui
            </div>
          ) : null}
        </div>

        <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/60">
          <div
            className="h-full rounded-full bg-[var(--sakuin-secondary)]"
            style={{
              width: `${overallProgress}%`
            }}
          />
        </div>
      </div>

      {error ? (
        <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-black">Gagal mengambil goals</p>
              <p className="mt-1 text-sm font-medium text-rose-700">
                {error}
              </p>
              <button
                className="mt-2 text-sm font-black underline"
                onClick={retryGoals}
                type="button"
              >
                Coba lagi
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex min-h-52 items-center justify-center rounded-3xl border border-[var(--sakuin-border)] bg-white">
          <div className="flex items-center gap-3 text-zinc-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p className="text-sm font-bold">Mengambil goals...</p>
          </div>
        </div>
      ) : null}

      {!isLoading && goals.length === 0 ? (
        <div className="rounded-3xl border border-[var(--sakuin-border)] bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-black text-[var(--sakuin-text)]">Belum ada goal</p>

          <p className="mt-2 text-sm text-zinc-600">
            Tambahkan target tabungan pertama kamu.
          </p>

          <Button
            className="mt-5 rounded-xl bg-[var(--sakuin-secondary)] text-white hover:bg-[var(--sakuin-secondary)]"
            onClick={handleCreate}
          >
            <Plus className="h-4 w-4" />
            Tambah Goal
          </Button>
        </div>
      ) : null}

      {!isLoading && goals.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onAddProgress={handleAddProgress}
              onSetDashboardPriority={handleSetDashboardPriority}
              onEdit={handleEdit}
              onDelete={openDeleteDialog}
              isDashboardPriority={dashboardPriorityGoalId === goal.id}
              isDeleting={
                deleteGoalMutation.isPending &&
                deleteGoalMutation.variables?.id === goal.id
              }
            />
          ))}
        </div>
      ) : null}

      <GoalFormModal
        open={isFormOpen}
        goal={selectedGoal}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedGoal(null);
        }}
        onSuccess={refreshGoalsData}
      />

      <AddGoalProgressModal
        open={Boolean(progressGoal)}
        goal={progressGoal}
        onClose={() => setProgressGoal(null)}
        onSuccess={refreshGoalsData}
      />

      <ConfirmDialog
        open={Boolean(goalToDelete)}
        title="Hapus goal?"
        description={deleteDialogDescription}
        confirmText="Ya, hapus goal"
        cancelText="Batal"
        loading={deleteGoalMutation.isPending}
        loadingText="Menghapus..."
        variant="danger"
        onClose={closeDeleteDialog}
        onConfirm={handleConfirmDelete}
      />
    </AppShell>
  );
}
