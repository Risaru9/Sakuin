import { RefreshCcw, X } from "lucide-react";
import { activateWaitingServiceWorker } from "../../lib/pwa";

type PwaUpdatePromptProps = {
  registration: ServiceWorkerRegistration | null;
  onDismiss: () => void;
};

export function PwaUpdatePrompt({
  registration,
  onDismiss
}: PwaUpdatePromptProps) {
  if (!registration) {
    return null;
  }

  function handleUpdateNow() {
    if (!registration) {
      return;
    }

    activateWaitingServiceWorker(registration);
  }

  return (
    <div className="fixed inset-x-0 bottom-[calc(var(--sakuin-mobile-nav-height)+0.75rem)] z-[280] px-3 sm:right-5 sm:bottom-5 sm:left-auto sm:max-w-sm sm:px-0">
      <div className="saku-line rounded-saku-card bg-saku-paper p-4 font-saku-body text-saku-ink shadow-saku motion-safe:animate-saku-rise">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="saku-line-thin flex size-11 shrink-0 items-center justify-center rounded-full bg-saku-accent-soft">
            <RefreshCcw className="size-5" strokeWidth={2.4} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-saku-head text-lg font-semibold">Versi baru Sakuin siap</p>
            <p className="text-xs font-bold text-saku-muted">Ketuk untuk memakainya. Tidak perlu pasang ulang.</p>
          </div>
          <button
            aria-label="Tutup update prompt"
            className="saku-line-thin flex size-9 shrink-0 items-center justify-center rounded-full bg-saku-paper focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30"
            onClick={onDismiss}
            type="button"
          >
            <X aria-hidden="true" className="size-4" strokeWidth={2.6} />
          </button>
        </div>
        <div className="mt-4 flex gap-2.5">
          <button className="saku-line-thin min-h-11 rounded-full bg-saku-paper px-4 text-sm font-black" onClick={onDismiss} type="button">
            Nanti
          </button>
          <button
            className="saku-line-thin saku-press min-h-11 flex-1 rounded-full bg-saku-accent font-saku-head text-base font-semibold text-white shadow-saku-xs"
            onClick={handleUpdateNow}
            type="button"
          >
            Pakai versi baru
          </button>
        </div>
      </div>
    </div>
  );
}
