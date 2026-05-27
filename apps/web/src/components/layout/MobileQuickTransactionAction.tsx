import { lazy, Suspense, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { MessageSquare, Plus, WalletCards, X } from "lucide-react";
import { queryKeys } from "../../lib/query-keys";

const HIDDEN_ROUTES = ["/dashboard", "/asisten"];

type ActiveTransactionModal = "manual" | "quick" | null;

const QuickTransactionModal = lazy(() =>
  import("../../features/transactions/QuickTransactionModal").then((module) => ({
    default: module.QuickTransactionModal
  }))
);

const AddTransactionModal = lazy(() =>
  import("../../features/transactions/AddTransactionModal").then((module) => ({
    default: module.AddTransactionModal
  }))
);

function shouldHideQuickAction(pathname: string) {
  return HIDDEN_ROUTES.some((route) => pathname.startsWith(route));
}

export function MobileQuickTransactionAction() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ActiveTransactionModal>(null);

  if (shouldHideQuickAction(location.pathname)) {
    return null;
  }

  function openModal(type: Exclude<ActiveTransactionModal, null>) {
    setIsMenuOpen(false);
    setActiveModal(type);
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
      {isMenuOpen ? (
        <button
          aria-label="Tutup pilihan catat transaksi"
          className="fixed inset-0 z-30 cursor-default bg-transparent"
          onClick={() => setIsMenuOpen(false)}
          type="button"
        />
      ) : null}

      <div className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-4 z-40 sm:bottom-6 sm:right-6">
        <div
          className={[
            "absolute bottom-16 right-1 grid gap-3 transition-all duration-200 ease-out sm:bottom-[4.35rem] sm:right-1.5",
            isMenuOpen
              ? "pointer-events-auto translate-y-0 opacity-100"
              : "pointer-events-none translate-y-3 opacity-0"
          ].join(" ")}
        >
          <button
            aria-label="Catat Cepat"
            className={[
              "flex h-12 w-12 items-center justify-center rounded-full border border-black bg-black text-yellow-300 shadow-[0_10px_24px_rgba(0,0,0,0.22)] transition-all duration-200 hover:-translate-y-0.5 active:scale-95 sm:h-12 sm:w-12",
              isMenuOpen ? "scale-100" : "scale-75"
            ].join(" ")}
            onClick={() => openModal("quick")}
            title="Catat Cepat"
            type="button"
          >
            <MessageSquare className="h-5 w-5" />
          </button>

          <button
            aria-label="Catat Keuangan Biasa"
            className={[
              "flex h-12 w-12 items-center justify-center rounded-full border border-black bg-yellow-300 text-black shadow-[0_10px_24px_rgba(0,0,0,0.18)] transition-all delay-75 duration-200 hover:-translate-y-0.5 active:scale-95 sm:h-12 sm:w-12",
              isMenuOpen ? "scale-100" : "scale-75"
            ].join(" ")}
            onClick={() => openModal("manual")}
            title="Catat Keuangan Biasa"
            type="button"
          >
            <WalletCards className="h-5 w-5" />
          </button>
        </div>

        <button
          aria-expanded={isMenuOpen}
          aria-label={
            isMenuOpen ? "Tutup pilihan catat transaksi" : "Buka pilihan catat transaksi"
          }
          className={[
            "flex h-14 w-14 items-center justify-center rounded-full border border-black bg-black text-white shadow-[5px_5px_0_#fde047] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[3px_3px_0_#fde047] sm:h-14 sm:w-14",
            isMenuOpen ? "rotate-90" : "rotate-0"
          ].join(" ")}
          onClick={() => setIsMenuOpen((current) => !current)}
          type="button"
        >
          {isMenuOpen ? (
            <X className="h-5 w-5 text-white" />
          ) : (
            <Plus className="h-5 w-5 text-white" />
          )}
        </button>
      </div>

      {activeModal === "manual" ? (
        <Suspense fallback={null}>
          <AddTransactionModal
            open
            onClose={() => setActiveModal(null)}
            onSuccess={handleSuccess}
          />
        </Suspense>
      ) : null}

      {activeModal === "quick" ? (
        <Suspense fallback={null}>
          <QuickTransactionModal
            open
            onClose={() => setActiveModal(null)}
            onSuccess={handleSuccess}
          />
        </Suspense>
      ) : null}
    </>
  );
}
