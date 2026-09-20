import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { SakuMascot } from "../saku";
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
    <div className="fixed inset-x-0 bottom-[calc(var(--sakuin-mobile-nav-height)+0.75rem)] z-[270] px-3 lg:right-5 lg:bottom-5 lg:left-auto lg:max-w-sm lg:px-0">
      <section className="saku-line rounded-saku-card bg-saku-paper p-4 font-saku-body text-saku-ink shadow-saku motion-safe:animate-saku-rise">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="saku-line-thin flex size-11 shrink-0 items-end justify-center overflow-hidden rounded-full bg-saku-coin-soft">
            <SakuMascot mood="wow" size={40} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-saku-head text-lg font-semibold">{SAKUIN_RELEASE_TITLE}</p>
            <p className="text-xs font-bold text-saku-muted">Perbaikan ini memerlukan APK 2.4.0.</p>
          </div>
          <button
            aria-label="Tutup info update Sakuin"
            className="saku-line-thin flex size-9 shrink-0 items-center justify-center rounded-full bg-saku-paper focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30"
            onClick={dismiss}
            type="button"
          >
            <X aria-hidden="true" className="size-4" strokeWidth={2.6} />
          </button>
        </div>
        <ul className="mt-3 space-y-1.5">
          {SAKUIN_RELEASE_NOTES.map((note) => (
            <li className="flex items-start gap-2 text-sm font-bold" key={note}>
              <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-saku-income" strokeWidth={2.6} />
              {note}
            </li>
          ))}
        </ul>
        <button
          className="saku-line-thin saku-press mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-saku-accent font-saku-head text-base font-semibold text-white shadow-saku-xs"
          onClick={dismiss}
          type="button"
        >
          Oke, mengerti
        </button>
      </section>
    </div>
  );
}
