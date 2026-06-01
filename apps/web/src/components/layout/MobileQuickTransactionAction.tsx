import {
  lazy,
  Suspense,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState
} from "react";
import { createPortal } from "react-dom";
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
import { useLockBodyScroll } from "../../hooks/use-lock-body-scroll";

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

function PortalLayer({ children }: { children: ReactNode }) {
  const [root, setRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setRoot(document.body);
  }, []);

  if (!root) {
    return null;
  }

  return createPortal(children, root);
}

export function FloatingAssistantButton() {
  const location = useLocation();
  const navigate = useNavigate();
  const [assistantLaunchPhase, setAssistantLaunchPhase] = useState<
    "idle" | "zoom" | "mascot"
  >("idle");
  const launchTimersRef = useRef<number[]>([]);
  const isLaunchingAssistant = assistantLaunchPhase !== "idle";

  useLockBodyScroll(isLaunchingAssistant);

  useEffect(() => {
    return () => {
      launchTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, []);

  useEffect(() => {
    if (!isAssistantRoute(location.pathname)) {
      return;
    }

    launchTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    launchTimersRef.current = [];
    setAssistantLaunchPhase("idle");
  }, [location.pathname]);

  if (isAssistantRoute(location.pathname)) {
    return null;
  }

  function openAssistant() {
    if (isLaunchingAssistant) {
      return;
    }

    setAssistantLaunchPhase("zoom");
    launchTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    launchTimersRef.current = [
      window.setTimeout(() => {
        setAssistantLaunchPhase("mascot");
      }, 650),
      window.setTimeout(() => {
        navigate("/asisten");
      }, 2300)
    ];
  }

  return (
    <>
      {assistantLaunchPhase === "zoom" ? (
        <PortalLayer>
          <div
            aria-hidden="true"
            className="sakuin-assistant-zoom-layer fixed bottom-[calc(var(--sakuin-mobile-nav-height)+1rem)] right-4 z-[360] h-14 w-14 rounded-full bg-gradient-to-br from-sky-400 via-blue-500 to-[var(--sakuin-primary)] lg:bottom-6 lg:right-6"
          />
        </PortalLayer>
      ) : null}

      {assistantLaunchPhase === "mascot" ? (
        <PortalLayer>
          <div
            aria-hidden="true"
            className="sakuin-assistant-mascot-screen fixed inset-0 z-[370] flex items-center justify-center bg-gradient-to-br from-sky-500 via-blue-600 to-[var(--sakuin-primary)] px-6 text-white"
          >
            <div className="sakuin-assistant-mascot-stage text-center">
              <div className="sakuin-assistant-mascot relative mx-auto h-40 w-40 rounded-[2.25rem] bg-white shadow-[0_28px_80px_rgba(15,23,42,0.28)] sm:h-44 sm:w-44">
                <span className="absolute -top-8 left-1/2 h-5 w-1.5 -translate-x-1/2 rounded-full bg-white" />
                <span className="absolute -top-5 left-1/2 h-8 w-8 -translate-x-1/2 rounded-full bg-white shadow-sm" />
                <span className="absolute left-8 top-14 h-5 w-5 rounded-full bg-slate-900 sm:left-9" />
                <span className="absolute right-8 top-14 h-5 w-5 rounded-full bg-slate-900 sm:right-9" />
                <span className="absolute left-1/2 top-24 h-8 w-16 -translate-x-1/2 rounded-b-full border-b-8 border-slate-900" />
                <span className="sakuin-assistant-mascot-arm absolute -right-8 top-14 h-16 w-9 origin-bottom rounded-full bg-white shadow-sm" />
              </div>

              <p className="sakuin-assistant-hello mt-8 text-5xl font-black tracking-normal text-white">
                HAI!
              </p>
              <p className="sakuin-assistant-hello-subtitle mt-3 text-base font-semibold text-white/85">
                Aku siap bantu cek keuanganmu hari ini.
              </p>
            </div>
          </div>
        </PortalLayer>
      ) : null}

      <button
        aria-label="Buka Asisten Sakuin"
        className={[
          "sakuin-floating-assistant sakuin-press sakuin-pulse-ring bottom-[calc(var(--sakuin-mobile-nav-height)+1rem)] left-auto right-4 z-[65] inline-flex h-12 w-12 items-center justify-center overflow-visible rounded-full border border-white/90 bg-gradient-to-br from-sky-400 via-blue-500 to-[var(--sakuin-primary)] text-white shadow-[0_18px_38px_rgba(59,130,246,0.34)] transition duration-200 hover:-translate-y-0.5 hover:scale-105 hover:shadow-[0_22px_42px_rgba(59,130,246,0.42)] focus:outline-none focus:ring-4 focus:ring-sky-300/35 active:translate-y-0.5 active:scale-95 motion-safe:animate-[sakuinFloat_3.6s_ease-in-out_infinite] motion-reduce:transition-none lg:bottom-6 lg:right-6",
          isLaunchingAssistant ? "sakuin-assistant-button-pop" : ""
        ].join(" ")}
        disabled={isLaunchingAssistant}
        onClick={openAssistant}
        title="Buka Asisten Sakuin"
        type="button"
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-white/10 opacity-0 transition group-active:opacity-100"
        />
        <Sparkles aria-hidden="true" className="absolute -right-1 -top-1 h-3.5 w-3.5" />
        <MessageCircle aria-hidden="true" className="sakuin-icon-bounce h-5 w-5" />
      </button>
    </>
  );
}

export function MobileMainActionMenu() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const dialogId = useId();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMenuLayerMounted, setIsMenuLayerMounted] = useState(false);
  const [activeModal, setActiveModal] = useState<ActiveTransactionModal>(null);

  useEscapeToClose(isMenuOpen, () => setIsMenuOpen(false));
  useLockBodyScroll(isMenuOpen);

  useEffect(() => {
    if (isMenuOpen) {
      setIsMenuLayerMounted(true);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsMenuLayerMounted(false);
    }, 180);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isMenuOpen]);

  function openModal(type: Exclude<ActiveTransactionModal, null>) {
    setIsMenuOpen(false);
    setIsMenuLayerMounted(false);
    setActiveModal(type);
  }

  function openExport() {
    setIsMenuOpen(false);
    setIsMenuLayerMounted(false);
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
      {isMenuLayerMounted ? (
        <PortalLayer>
          <>
            <button
              aria-label="Tutup menu aksi transaksi"
              className={[
                "sakuin-fab-backdrop fixed inset-x-0 top-0 bottom-[var(--sakuin-mobile-nav-height)] z-[320] cursor-default bg-slate-950/24 backdrop-blur-[2px] transition-opacity duration-200 motion-reduce:transition-none lg:hidden",
                isMenuOpen
                  ? "pointer-events-auto opacity-100"
                  : "pointer-events-none opacity-0"
              ].join(" ")}
              onClick={() => setIsMenuOpen(false)}
              type="button"
            />

            <div
              aria-hidden={!isMenuOpen}
              aria-label="Menu aksi transaksi"
              className={[
                "pointer-events-none fixed bottom-[calc(var(--sakuin-mobile-nav-height)+1.25rem)] left-1/2 z-[340] h-36 w-52 -translate-x-1/2 transition duration-200 motion-reduce:transition-none lg:hidden",
                isMenuOpen ? "opacity-100" : "opacity-0"
              ].join(" ")}
              id={dialogId}
              role="dialog"
            >
              <button
                aria-label="Catat Biasa"
                className={[
                  "sakuin-press absolute left-[calc(50%_-_1.5rem)] top-0 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/80 bg-[var(--sakuin-primary)] text-white shadow-[0_18px_38px_rgba(37,99,235,0.28)] transition duration-500 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)] hover:-translate-y-0.5 hover:bg-[var(--sakuin-secondary)] focus:outline-none focus:ring-4 focus:ring-[var(--sakuin-focus)]/25 active:scale-95 motion-reduce:transition-none",
                  isMenuOpen
                    ? "sakuin-fab-action-pop pointer-events-auto scale-100 opacity-100"
                    : "pointer-events-none translate-y-8 scale-0 opacity-0"
                ].join(" ")}
                onClick={() => openModal("manual")}
                style={{
                  animationDelay: isMenuOpen ? "40ms" : "0ms",
                  transitionDelay: isMenuOpen ? "40ms" : "0ms"
                }}
                tabIndex={isMenuOpen ? 0 : -1}
                title="Catat Biasa"
                type="button"
              >
                <WalletCards aria-hidden="true" className="sakuin-icon-flip h-5 w-5" />
              </button>

              <button
                aria-label="Catat Cepat"
                className={[
                  "sakuin-press absolute bottom-9 left-5 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/80 bg-[var(--sakuin-secondary)] text-white shadow-[0_18px_38px_rgba(29,78,216,0.26)] transition duration-500 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)] hover:-translate-y-0.5 hover:bg-[var(--sakuin-primary)] focus:outline-none focus:ring-4 focus:ring-[var(--sakuin-focus)]/25 active:scale-95 motion-reduce:transition-none",
                  isMenuOpen
                    ? "sakuin-fab-action-pop pointer-events-auto scale-100 opacity-100"
                    : "pointer-events-none translate-x-8 translate-y-8 scale-0 opacity-0"
                ].join(" ")}
                onClick={() => openModal("quick")}
                style={{
                  animationDelay: isMenuOpen ? "80ms" : "0ms",
                  transitionDelay: isMenuOpen ? "80ms" : "0ms"
                }}
                tabIndex={isMenuOpen ? 0 : -1}
                title="Catat Cepat"
                type="button"
              >
                <MessageSquare aria-hidden="true" className="sakuin-icon-bounce h-5 w-5" />
              </button>

              <button
                aria-label="Export data"
                className={[
                  "sakuin-press absolute bottom-9 right-5 inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--sakuin-border)] bg-white text-[var(--sakuin-primary)] shadow-[0_18px_38px_rgba(37,99,235,0.2)] transition duration-500 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)] hover:-translate-y-0.5 hover:bg-[var(--sakuin-primary-soft)] focus:outline-none focus:ring-4 focus:ring-[var(--sakuin-focus)]/25 active:scale-95 motion-reduce:transition-none",
                  isMenuOpen
                    ? "sakuin-fab-action-pop pointer-events-auto scale-100 opacity-100"
                    : "pointer-events-none -translate-x-8 translate-y-8 scale-0 opacity-0"
                ].join(" ")}
                onClick={openExport}
                style={{
                  animationDelay: isMenuOpen ? "120ms" : "0ms",
                  transitionDelay: isMenuOpen ? "120ms" : "0ms"
                }}
                tabIndex={isMenuOpen ? 0 : -1}
                title="Export"
                type="button"
              >
                <Download aria-hidden="true" className="sakuin-icon-shake h-5 w-5" />
              </button>
            </div>
          </>
        </PortalLayer>
      ) : null}

      <button
        aria-controls={dialogId}
        aria-expanded={isMenuOpen}
        aria-haspopup="dialog"
        aria-label={
          isMenuOpen ? "Tutup menu aksi transaksi" : "Buka menu aksi transaksi"
        }
        className={[
          "sakuin-ripple sakuin-pulse-ring relative -mt-7 mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/80 bg-[var(--sakuin-primary)] text-white shadow-[0_18px_36px_rgba(37,99,235,0.28)] transition duration-200 hover:-translate-y-0.5 hover:bg-[var(--sakuin-secondary)] focus:outline-none focus:ring-4 focus:ring-[var(--sakuin-focus)]/25 active:translate-y-0.5 active:scale-95 motion-reduce:transition-none",
          isMenuOpen ? "bg-[var(--sakuin-secondary)] shadow-[0_12px_28px_rgba(29,78,216,0.24)]" : ""
        ].join(" ")}
        onClick={() => setIsMenuOpen((current) => !current)}
        type="button"
      >
        <Plus
          aria-hidden="true"
          className={[
            "relative h-7 w-7 text-white transition-transform duration-200 motion-reduce:transition-none",
            isMenuOpen ? "rotate-45 scale-110" : "rotate-0"
          ].join(" ")}
        />
      </button>

      {activeModal === "manual" ? (
        <PortalLayer>
          <Suspense fallback={null}>
            <AddTransactionModal
              open
              onClose={() => setActiveModal(null)}
              onSuccess={handleSuccess}
            />
          </Suspense>
        </PortalLayer>
      ) : null}

      {activeModal === "quick" ? (
        <PortalLayer>
          <Suspense fallback={null}>
            <QuickTransactionModal
              open
              onClose={() => setActiveModal(null)}
              onSuccess={handleSuccess}
            />
          </Suspense>
        </PortalLayer>
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
            className="fixed inset-0 z-[55] cursor-default bg-slate-950/15 backdrop-blur-[2px] transition-opacity duration-200 motion-reduce:transition-none"
            onClick={() => setIsMenuOpen(false)}
            type="button"
          />

          <div
            aria-label="Menu aksi transaksi"
            className="sakuin-enter fixed bottom-24 right-6 z-[70] w-full max-w-sm rounded-[1.75rem] border border-[var(--sakuin-border)] bg-white p-3 shadow-[0_24px_70px_rgba(37,99,235,0.16)] transition duration-200 motion-reduce:transition-none"
            id={dialogId}
            role="dialog"
          >
            <div className="mb-2 flex items-center justify-between gap-3 px-1">
              <div>
                <p className="text-sm font-black text-[var(--sakuin-text)]">Aksi cepat</p>
                <p className="text-xs font-semibold text-[var(--sakuin-muted)]">
                  Catat transaksi atau buka export.
                </p>
              </div>

              <button
                aria-label="Tutup menu aksi transaksi"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--sakuin-primary-soft)] text-[var(--sakuin-primary)] transition hover:bg-[var(--sakuin-secondary-soft)] focus:outline-none focus:ring-4 focus:ring-[var(--sakuin-focus)]/25"
                onClick={() => setIsMenuOpen(false)}
                type="button"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-2">
              <button
                className="sakuin-card-lift sakuin-press flex min-h-16 items-center gap-3 rounded-2xl border border-[var(--sakuin-primary)]/10 bg-[var(--sakuin-primary)] px-3.5 py-3 text-left text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--sakuin-secondary)] focus:outline-none focus:ring-4 focus:ring-[var(--sakuin-focus)]/25 active:translate-y-0 motion-reduce:transition-none"
                onClick={() => openModal("quick")}
                type="button"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white">
                  <MessageSquare aria-hidden="true" className="sakuin-icon-bounce h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black">Catat Cepat</span>
                  <span className="block text-xs font-semibold text-white/70">
                    Tulis natural, Sakuin bantu ubah jadi draft.
                  </span>
                </span>
              </button>

              <button
                className="sakuin-card-lift sakuin-press flex min-h-16 items-center gap-3 rounded-2xl border border-[var(--sakuin-border)] bg-[var(--sakuin-primary-soft)] px-3.5 py-3 text-left text-[var(--sakuin-text)] shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--sakuin-secondary-soft)] focus:outline-none focus:ring-4 focus:ring-[var(--sakuin-focus)]/25 active:translate-y-0 motion-reduce:transition-none"
                onClick={() => openModal("manual")}
                type="button"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--sakuin-primary)] ring-1 ring-[var(--sakuin-border)]">
                  <WalletCards aria-hidden="true" className="sakuin-icon-flip h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black">Catat Biasa</span>
                  <span className="block text-xs font-semibold text-[var(--sakuin-muted)]">
                    Isi nominal, kategori, tanggal, dan catatan sendiri.
                  </span>
                </span>
              </button>

              <button
                className="sakuin-card-lift sakuin-press flex min-h-16 items-center gap-3 rounded-2xl border border-[var(--sakuin-border)] bg-white px-3.5 py-3 text-left text-[var(--sakuin-text)] shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--sakuin-primary-soft)] focus:outline-none focus:ring-4 focus:ring-[var(--sakuin-focus)]/25 active:translate-y-0 motion-reduce:transition-none"
                onClick={openExport}
                type="button"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--sakuin-secondary)] text-white">
                  <Download aria-hidden="true" className="sakuin-icon-shake h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black">Export</span>
                  <span className="block text-xs font-semibold text-[var(--sakuin-muted)]">
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
        className="sakuin-floating-action sakuin-ripple sakuin-pulse-ring bottom-24 right-6 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/80 bg-[var(--sakuin-primary)] text-white shadow-[0_18px_36px_rgba(37,99,235,0.28)] transition duration-200 hover:-translate-y-0.5 hover:bg-[var(--sakuin-secondary)] focus:outline-none focus:ring-4 focus:ring-[var(--sakuin-focus)]/25 active:translate-y-0.5 active:scale-95 motion-reduce:transition-none"
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
