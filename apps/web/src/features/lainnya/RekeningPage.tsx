import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "../../components/layout/AppShell";
import { queryKeys } from "../../lib/query-keys";
import { DashboardAccountsCard } from "../dashboard/dashboard-accounts-card";
import { getSummary } from "../summary/summary.service";

// Interim "Rekening" screen: the account list, new-account form and transfers that used to
// sit on the dashboard, reachable from Lainnya until the redesigned page replaces them.
export function RekeningPage() {
  const summaryQuery = useQuery({
    queryKey: queryKeys.summary,
    queryFn: () => getSummary(),
    staleTime: 60_000,
    refetchOnWindowFocus: false
  });

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-xl space-y-4">
        <div className="flex items-center gap-2.5">
          <Link
            aria-label="Kembali ke Lainnya"
            className="saku-line-thin saku-press flex size-11 shrink-0 items-center justify-center rounded-full bg-white shadow-saku-xs focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30"
            to="/lainnya"
          >
            <ArrowLeft aria-hidden="true" className="size-[18px]" strokeWidth={2.6} />
          </Link>
          <h1 className="font-saku-head text-[28px] font-semibold">Rekening</h1>
        </div>

        <DashboardAccountsCard transactionCount={summaryQuery.data?.transactionCount ?? 0} />
      </div>
    </AppShell>
  );
}
