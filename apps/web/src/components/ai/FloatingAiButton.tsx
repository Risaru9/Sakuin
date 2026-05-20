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
      className="fixed bottom-24 right-4 z-30 inline-flex min-h-14 items-center gap-2 rounded-full bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 px-4 text-sm font-black text-white shadow-xl shadow-violet-500/25 ring-1 ring-violet-200/60 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-violet-500/30 focus:outline-none focus:ring-4 focus:ring-violet-500/25 lg:bottom-6 lg:right-6"
      to="/asisten"
    >
      <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
        <Sparkles className="absolute -right-1 -top-1 h-3.5 w-3.5 text-violet-100" />
        <MessageCircle className="h-5 w-5" />
      </span>

      <span className="hidden sm:inline">Asisten</span>
    </Link>
  );
}