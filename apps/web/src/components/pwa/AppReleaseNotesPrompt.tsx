import { useEffect, useState } from "react";
import { CheckCircle2, Sparkles, X } from "lucide-react";
import { useAuth } from "../../features/auth/auth-context";
import {
  hasSeenCurrentReleaseNotes,
  markCurrentReleaseNotesSeen,
  SAKUIN_RELEASE_NOTES,
  SAKUIN_RELEASE_TITLE
} from "../../lib/release-notes";

export function AppReleaseNotesPrompt() {
  const { isAuthenticated } = useAuth();
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setShouldShow(false);
      return;
    }

    const isAssistantRoute = window.location.pathname.startsWith("/asisten");

    if (isAssistantRoute || hasSeenCurrentReleaseNotes()) {
      setShouldShow(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShouldShow(true);
    }, 900);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isAuthenticated]);

  function dismiss() {
    markCurrentReleaseNotesSeen();
    setShouldShow(false);
  }

  if (!shouldShow) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-[calc(var(--sakuin-mobile-nav-height)+0.75rem)] z-[270] px-4 lg:bottom-5 lg:left-auto lg:right-5 lg:max-w-sm lg:px-0">
      <section className="overflow-hidden rounded-3xl border border-[var(--sakuin-border)] bg-white shadow-[0_24px_70px_rgba(0,0,0,0.16)]">
        <div className="h-1 w-full bg-[var(--sakuin-primary)]" />

        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--sakuin-secondary)] text-white">
              <Sparkles className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-[var(--sakuin-text)]">
                {SAKUIN_RELEASE_TITLE}
              </p>
              <p className="mt-1 text-xs font-semibold leading-5 text-zinc-600">
                Update fitur masuk otomatis dari Sakuin. Tidak perlu install
                ulang.
              </p>
            </div>

            <button
              aria-label="Tutup info update Sakuin"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200 hover:text-[var(--sakuin-text)]"
              onClick={dismiss}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid gap-2">
            {SAKUIN_RELEASE_NOTES.map((note) => (
              <div className="flex items-start gap-2" key={note}>
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--sakuin-text)]" />
                <p className="text-xs font-semibold leading-5 text-zinc-700">
                  {note}
                </p>
              </div>
            ))}
          </div>

          <button
            className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-2xl bg-[var(--sakuin-secondary)] px-4 text-xs font-black text-white transition hover:bg-[var(--sakuin-secondary)]"
            onClick={dismiss}
            type="button"
          >
            Mengerti
          </button>
        </div>
      </section>
    </div>
  );
}
