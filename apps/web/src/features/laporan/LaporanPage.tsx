import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "../../components/layout/AppShell";
import { queryKeys } from "../../lib/query-keys";
import { FinancialCheckupCard } from "../dashboard/dashboard-checkup-card";
import { DashboardGoalsCard } from "../dashboard/dashboard-goals-card";
import { FinancialRhythmCard } from "../dashboard/dashboard-rhythm-card";
import { getErrorMessage } from "../dashboard/dashboard-utils";
import { getDashboardPriorityGoalId } from "../goals/dashboard-goal-priority";
import { getGoals } from "../goals/goal.service";
import { requestComposerFocus } from "../quick-composer/composer-bridge";
import { getSummary } from "../summary/summary.service";

// Interim report page: the insight cards that used to fill the dashboard, gathered under the
// new "Laporan" tab until the redesigned report replaces them.
export function LaporanPage() {
  const navigate = useNavigate();
  const now = new Date();
  const summaryParams = { month: now.getMonth() + 1, year: now.getFullYear() };

  const summaryQuery = useQuery({
    queryKey: [...queryKeys.summary, summaryParams],
    queryFn: () => getSummary(summaryParams),
    staleTime: 60_000,
    refetchOnWindowFocus: false
  });
  const goalsQuery = useQuery({
    queryKey: queryKeys.goals,
    queryFn: getGoals,
    staleTime: 60_000,
    refetchOnWindowFocus: false
  });

  const summary = summaryQuery.data ?? null;
  const goals = goalsQuery.data ?? [];
  const isLoadingSummary = summaryQuery.isPending;

  function openComposer() {
    requestComposerFocus();
    navigate("/dashboard");
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <h1 className="px-1 font-saku-head text-[28px] font-semibold">Laporan</h1>

        {summaryQuery.isError && !summary ? (
          <p className="rounded-2xl bg-saku-over-soft px-4 py-3 text-sm font-extrabold text-saku-over-text" role="alert">
            Laporan gagal dimuat: {getErrorMessage(summaryQuery.error)}
          </p>
        ) : null}

        <FinancialCheckupCard
          financialCheckup={summary?.financialCheckup}
          isLoading={isLoadingSummary}
        />
        <FinancialRhythmCard
          goals={goals}
          isLoading={isLoadingSummary}
          onOpenAddTransaction={openComposer}
          onOpenQuickTransaction={openComposer}
          summary={summary}
        />
        <DashboardGoalsCard
          error={goalsQuery.isError && !goalsQuery.data ? getErrorMessage(goalsQuery.error) : null}
          goals={goals}
          isLoading={goalsQuery.isPending}
          priorityGoalId={getDashboardPriorityGoalId()}
        />
      </div>
    </AppShell>
  );
}
