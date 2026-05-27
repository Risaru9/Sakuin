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

      {isMenuOpen ? (
        <div className="fixed bottom-[calc(9.75rem+env(safe-area-inset-bottom))] right-4 z-40 w-[min(20rem,calc(100vw-2rem))] rounded-3xl border border-black/10 bg-white p-3 shadow-[0_18px_45px_rgba(0,0,0,0.18)] sm:bottom-24 sm:right-6">
          <div className="mb-2 flex items-center justify-between gap-3 px-1">
            <div>
              <p className="text-sm font-black text-black">Catat transaksi</p>
              <p className="mt-0.5 text-xs font-medium text-zinc-500">
                Pilih cara input yang paling cocok.
              </p>
            </div>
            <button
              aria-label="Tutup menu catat transaksi"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200 hover:text-black"
              onClick={() => setIsMenuOpen(false)}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-2">
            <button
              className="flex w-full items-center gap-3 rounded-2xl border border-black/10 bg-yellow-50 p-3 text-left transition hover:bg-yellow-100 active:scale-[0.99]"
              onClick={() => openModal("manual")}
              type="button"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-yellow-300 text-black">
                <WalletCards className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-black text-black">
                  Catat Keuangan Biasa
                </span>
                <span className="mt-0.5 block text-xs font-medium leading-5 text-zinc-600">
                  Input manual dengan kategori, nominal, tanggal, dan catatan.
                </span>
              </span>
            </button>

            <button
              className="flex w-full items-center gap-3 rounded-2xl border border-black bg-black p-3 text-left transition hover:bg-zinc-900 active:scale-[0.99]"
              onClick={() => openModal("quick")}
              type="button"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-yellow-300 text-black">
                <MessageSquare className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-black text-white">
                  Catat Cepat
                </span>
                <span className="mt-0.5 block text-xs font-medium leading-5 text-white/70">
                  Tulis natural, lalu Sakuin bantu ubah menjadi draft.
                </span>
              </span>
            </button>
          </div>
        </div>
      ) : null}

      <button
        aria-expanded={isMenuOpen}
        aria-label="Buka pilihan catat transaksi"
        className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-4 z-40 inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-black bg-black px-4 text-sm font-black text-white shadow-[5px_5px_0_#fde047] transition hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[3px_3px_0_#fde047] sm:bottom-6 sm:right-6 sm:min-h-14 sm:px-5"
        onClick={() => setIsMenuOpen((current) => !current)}
        type="button"
      >
        <Plus className="h-4 w-4 text-white" />
        <span className="text-white">Catat</span>
      </button>

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
