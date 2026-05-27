import { lazy, Suspense, useEffect, useId, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Download,
  MessageCircle,
  MessageSquare,
  Plus,
  Sparkles,
  WalletCards,
  X
} from "lucide-react";
import { queryKeys } from "../../lib/query-keys";

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

function isAssistantRoute(pathname: string) {
  return pathname.startsWith("/asisten");
}

function useEscapeToClose(enabled: boolean, onClose: () => void) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, onClose]);
}

export function FloatingAssistantButton() {
  const location = useLocation();

  if (isAssistantRoute(location.pathname)) {
    return null;
  }

  return (
    <Link
      aria-label="Buka Asisten Sakuin"
      className="fixed bottom-[calc(var(--sakuin-mobile-nav-height)+1rem)] right-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full border border-black bg-yellow-300 text-black shadow-[4px_4px_0_#000] transition duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#000] focus:outline-none focus:ring-4 focus:ring-yellow-300/40 active:translate-y-0.5 active:shadow-[2px_2px_0_#000] motion-safe:animate-[sakuinFloat_3.6s_ease-in-out_infinite] motion-reduce:transition-none lg:bottom-6 lg:right-6"
      title="Buka Asisten Sakuin"
      to="/asisten"
    >
      <Sparkles aria-hidden="true" className="absolute -right-1 -top-1 h-3.5 w-3.5" />
      <MessageCircle aria-hidden="true" className="h-5 w-5" />
    </Link>
  );
}

export function MobileMainActionMenu() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const dialogId = useId();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ActiveTransactionModal>(null);

  useEscapeToClose(isMenuOpen, () => setIsMenuOpen(false));

  function openModal(type: Exclude<ActiveTransactionModal, null>) {
    setIsMenuOpen(false);
    setActiveModal(type);
  }

  function openExport() {
    setIsMenuOpen(false);
    navigate("/export");
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
        <>
          <button
            aria-label="Tutup menu aksi transaksi"
            className="fixed inset-0 z-[55] cursor-default bg-black/10 backdrop-blur-[1px] transition-opacity duration-200 motion-reduce:transition-none"
            onClick={() => setIsMenuOpen(false)}
            type="button"
          />

          <div
            aria-label="Menu aksi transaksi"
            className="pointer-events-none fixed bottom-[calc(var(--sakuin-mobile-nav-height)+0.65rem)] left-1/2 z-[70] h-32 w-56 -translate-x-1/2 transition duration-200 motion-reduce:transition-none"
            id={dialogId}
            role="dialog"
          >
            <button
              aria-label="Catat Biasa"
              className="pointer-events-auto absolute left-1/2 top-0 inline-flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full border border-black/10 bg-yellow-300 text-black shadow-[0_14px_28px_rgba(0,0,0,0.18)] transition duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-yellow-300/45 active:scale-95 motion-reduce:transition-none"
              onClick={() => openModal("manual")}
              title="Catat Biasa"
              type="button"
            >
              <WalletCards aria-hidden="true" className="h-5 w-5" />
            </button>

            <button
              aria-label="Catat Cepat"
              className="pointer-events-auto absolute bottom-2 left-7 inline-flex h-12 w-12 items-center justify-center rounded-full border border-black/10 bg-black text-yellow-300 shadow-[0_14px_28px_rgba(0,0,0,0.18)] transition duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-yellow-300/45 active:scale-95 motion-reduce:transition-none"
              onClick={() => openModal("quick")}
              title="Catat Cepat"
              type="button"
            >
              <MessageSquare aria-hidden="true" className="h-5 w-5" />
            </button>

            <button
              aria-label="Export data"
              className="pointer-events-auto absolute bottom-2 right-7 inline-flex h-12 w-12 items-center justify-center rounded-full border border-black/10 bg-white text-black shadow-[0_14px_28px_rgba(0,0,0,0.16)] transition duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-yellow-300/45 active:scale-95 motion-reduce:transition-none"
              onClick={openExport}
              title="Export"
              type="button"
            >
              <Download aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
        </>
      ) : null}

      <button
        aria-controls={dialogId}
        aria-expanded={isMenuOpen}
        aria-haspopup="dialog"
        aria-label={
          isMenuOpen ? "Tutup menu aksi transaksi" : "Buka menu aksi transaksi"
        }
        className={[
          "relative -mt-8 mx-auto flex h-[4.7rem] w-[4.7rem] items-center justify-center rounded-full border border-black bg-black text-yellow-300 shadow-[0_16px_32px_rgba(0,0,0,0.24)] transition duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-yellow-300/45 active:translate-y-0.5 motion-reduce:transition-none",
          isMenuOpen ? "shadow-[0_10px_24px_rgba(0,0,0,0.22)]" : ""
        ].join(" ")}
        onClick={() => setIsMenuOpen((current) => !current)}
        type="button"
      >
        <span className="absolute inset-2 rounded-full bg-yellow-300" />
        <Plus
          aria-hidden="true"
          className={[
            "relative h-7 w-7 text-black transition-transform duration-200 motion-reduce:transition-none",
            isMenuOpen ? "rotate-45" : "rotate-0"
          ].join(" ")}
        />
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

export function DesktopMainActionMenu() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const dialogId = useId();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ActiveTransactionModal>(null);

  useEscapeToClose(isMenuOpen, () => setIsMenuOpen(false));

  if (isAssistantRoute(location.pathname)) {
    return null;
  }

  function openModal(type: Exclude<ActiveTransactionModal, null>) {
    setIsMenuOpen(false);
    setActiveModal(type);
  }

  function openExport() {
    setIsMenuOpen(false);
    navigate("/export");
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
    <div className="hidden lg:block">
      {isMenuOpen ? (
        <>
          <button
            aria-label="Tutup menu aksi transaksi"
            className="fixed inset-0 z-[55] cursor-default bg-black/10 backdrop-blur-[1px] transition-opacity duration-200 motion-reduce:transition-none"
            onClick={() => setIsMenuOpen(false)}
            type="button"
          />

          <div
            aria-label="Menu aksi transaksi"
            className="fixed bottom-24 right-6 z-[70] w-full max-w-sm rounded-[1.75rem] border border-black/10 bg-white p-3 shadow-[0_24px_70px_rgba(0,0,0,0.18)] transition duration-200 motion-reduce:transition-none"
            id={dialogId}
            role="dialog"
          >
            <div className="mb-2 flex items-center justify-between gap-3 px-1">
              <div>
                <p className="text-sm font-black text-black">Aksi cepat</p>
                <p className="text-xs font-semibold text-zinc-500">
                  Catat transaksi atau buka export.
                </p>
              </div>

              <button
                aria-label="Tutup menu aksi transaksi"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200 focus:outline-none focus:ring-4 focus:ring-yellow-300/40"
                onClick={() => setIsMenuOpen(false)}
                type="button"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-2">
              <button
                className="flex min-h-16 items-center gap-3 rounded-2xl border border-black/10 bg-black px-3.5 py-3 text-left text-white shadow-sm transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-yellow-300/40 active:translate-y-0 motion-reduce:transition-none"
                onClick={() => openModal("quick")}
                type="button"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-yellow-300 text-black">
                  <MessageSquare aria-hidden="true" className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black">Catat Cepat</span>
                  <span className="block text-xs font-semibold text-white/70">
                    Tulis natural, Sakuin bantu ubah jadi draft.
                  </span>
                </span>
              </button>

              <button
                className="flex min-h-16 items-center gap-3 rounded-2xl border border-black/10 bg-yellow-50 px-3.5 py-3 text-left text-black shadow-sm transition hover:-translate-y-0.5 hover:bg-yellow-100 focus:outline-none focus:ring-4 focus:ring-yellow-300/40 active:translate-y-0 motion-reduce:transition-none"
                onClick={() => openModal("manual")}
                type="button"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-yellow-300 text-black ring-1 ring-black/10">
                  <WalletCards aria-hidden="true" className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black">Catat Biasa</span>
                  <span className="block text-xs font-semibold text-zinc-600">
                    Isi nominal, kategori, tanggal, dan catatan sendiri.
                  </span>
                </span>
              </button>

              <button
                className="flex min-h-16 items-center gap-3 rounded-2xl border border-black/10 bg-white px-3.5 py-3 text-left text-black shadow-sm transition hover:-translate-y-0.5 hover:bg-zinc-50 focus:outline-none focus:ring-4 focus:ring-yellow-300/40 active:translate-y-0 motion-reduce:transition-none"
                onClick={openExport}
                type="button"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-yellow-300">
                  <Download aria-hidden="true" className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black">Export</span>
                  <span className="block text-xs font-semibold text-zinc-600">
                    Unduh data saat perlu laporan.
                  </span>
                </span>
              </button>
            </div>
          </div>
        </>
      ) : null}

      <button
        aria-controls={dialogId}
        aria-expanded={isMenuOpen}
        aria-haspopup="dialog"
        aria-label={
          isMenuOpen ? "Tutup menu aksi transaksi" : "Buka menu aksi transaksi"
        }
        className="fixed bottom-24 right-6 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full border border-black bg-black text-yellow-300 shadow-[4px_4px_0_#fde047] transition duration-200 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#fde047] focus:outline-none focus:ring-4 focus:ring-yellow-300/40 active:translate-y-0.5 active:shadow-[2px_2px_0_#fde047] motion-reduce:transition-none"
        onClick={() => setIsMenuOpen((current) => !current)}
        type="button"
      >
        <Plus
          aria-hidden="true"
          className={[
            "h-5 w-5 transition-transform duration-200 motion-reduce:transition-none",
            isMenuOpen ? "rotate-45" : "rotate-0"
          ].join(" ")}
        />
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
    </div>
  );
}
