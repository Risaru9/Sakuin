import { Link, useLocation } from "react-router-dom";
import { MessageCircle, Sparkles } from "lucide-react";

export function FloatingAiButton() {
  const location = useLocation();

  if (location.pathname.startsWith("/asisten")) {
    return null;
  }

  return (
    <Link
      aria-label="Buka Asisten Sakuin"
      className="group fixed bottom-24 right-4 z-30 inline-flex min-h-14 items-center gap-2 overflow-hidden rounded-full border border-black bg-yellow-300 px-3.5 text-sm font-black text-black shadow-[6px_6px_0_#000] ring-1 ring-yellow-100 transition duration-300 animate-[sakuinFloat_3.6s_ease-in-out_infinite] hover:-translate-y-1 hover:shadow-[9px_9px_0_#000] focus:outline-none focus:ring-4 focus:ring-yellow-300/40 lg:bottom-6 lg:right-6 lg:px-4"
      to="/asisten"
    >
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.65),transparent)] animate-[sakuinShine_4.2s_ease-in-out_infinite]" />

      <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-black text-yellow-300">
        <Sparkles className="absolute -right-1 -top-1 h-3.5 w-3.5 text-black animate-[sakuinSoftPulse_2.8s_ease-in-out_infinite]" />
        <MessageCircle className="h-5 w-5" />
      </span>

      <span className="relative hidden sm:inline">Asisten</span>
    </Link>
  );
}
