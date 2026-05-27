import { lazy, Suspense, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { Plus } from "lucide-react";
import { queryKeys } from "../../lib/query-keys";

const HIDDEN_ROUTES = ["/dashboard", "/transactions", "/asisten"];

const QuickTransactionModal = lazy(() =>
  import("../../features/transactions/QuickTransactionModal").then((module) => ({
    default: module.QuickTransactionModal
  }))
);

function shouldHideQuickAction(pathname: string) {
  return HIDDEN_ROUTES.some((route) => pathname.startsWith(route));
}

export function MobileQuickTransactionAction() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  if (shouldHideQuickAction(location.pathname)) {
    return null;
  }

  function handleSuccess() {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.transactions.all
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.summary
    });
  }

  return (
    <>
      <button
        aria-label="Catat transaksi cepat"
        className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-4 z-30 inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-black bg-black px-4 text-sm font-black text-white shadow-[5px_5px_0_#fde047] transition active:translate-y-0.5 active:shadow-[3px_3px_0_#fde047] sm:hidden"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <Plus className="h-4 w-4 text-white" />
        <span className="text-white">Catat</span>
      </button>

      {isOpen ? (
        <Suspense fallback={null}>
          <QuickTransactionModal
            open={isOpen}
            onClose={() => setIsOpen(false)}
            onSuccess={handleSuccess}
          />
        </Suspense>
      ) : null}
    </>
  );
}
