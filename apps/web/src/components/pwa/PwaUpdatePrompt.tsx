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
    <div className="fixed inset-x-0 bottom-4 z-[280] px-4 sm:bottom-5 sm:left-auto sm:right-5 sm:max-w-sm sm:px-0">
      <div className="overflow-hidden rounded-[1.5rem] border border-indigo-100 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
        <div className="h-1 w-full bg-indigo-500" />

        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200">
              <RefreshCcw className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-slate-950">
                Versi baru Sakuin tersedia
              </p>
              <p className="mt-1 text-xs font-medium leading-5 text-slate-600">
                Update aplikasi untuk memakai versi terbaru yang sudah
                dideploy.
              </p>
            </div>

            <button
              aria-label="Tutup update prompt"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
              onClick={onDismiss}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-slate-950 px-4 text-xs font-black text-white transition hover:bg-black"
              onClick={handleUpdateNow}
              type="button"
            >
              Update sekarang
            </button>

            <button
              className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-slate-100 px-4 text-xs font-black text-slate-700 transition hover:bg-slate-200"
              onClick={onDismiss}
              type="button"
            >
              Nanti
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}