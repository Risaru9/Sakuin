import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  Download,
  Home,
  Settings,
  Sparkles,
  Target
} from "lucide-react";
import { FloatingAiButton } from "../ai/FloatingAiButton";
import { SakuinIdentityLogo } from "../brand/SakuinIdentityLogo";
import { useAuth } from "../../features/auth/auth-context";

type AppShellProps = {
  children: ReactNode;
  profileName?: string;
  profileEmail?: string;
};

const navigationItems = [
  {
    label: "Home",
    sidebarLabel: "Dashboard",
    icon: Home,
    to: "/dashboard"
  },
  {
    label: "Transaksi",
    sidebarLabel: "Transaksi",
    icon: BarChart3,
    to: "/transactions"
  },
  {
    label: "Goals",
    sidebarLabel: "Goals",
    icon: Target,
    to: "/goals"
  },
  {
    label: "Export",
    sidebarLabel: "Export Laporan",
    icon: Download,
    to: "/export"
  },
  {
    label: "Profile",
    sidebarLabel: "Profile",
    icon: Settings,
    to: "/profile"
  }
];

function isActivePath(currentPath: string, targetPath: string) {
  if (targetPath === "/dashboard") {
    return currentPath === "/" || currentPath === "/dashboard";
  }

  return currentPath.startsWith(targetPath);
}

export function AppShell({
  children,
  profileName,
  profileEmail
}: AppShellProps) {
  const location = useLocation();
  const { user } = useAuth();

  const displayedName = profileName ?? user?.name ?? "User";
  const displayedEmail = profileEmail ?? user?.email ?? "-";
  const assistantActive = location.pathname.startsWith("/asisten");

  return (
    <main className="min-h-screen bg-[#f7f5ef] pb-24 text-black lg:pb-0">
      <div className="mx-auto grid w-full max-w-[1440px] lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-screen border-r border-black/10 bg-white/95 px-5 py-6 shadow-[12px_0_35px_rgba(0,0,0,0.03)] lg:flex lg:flex-col">
          <Link
            className="mb-8 rounded-2xl px-1 py-1 transition hover:bg-yellow-50"
            to="/dashboard"
          >
            <SakuinIdentityLogo subtitle="Personal finance app" size="md" />
          </Link>

          <nav className="grid content-start gap-1.5">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(location.pathname, item.to);

              return (
                <Link
                  className={
                    active
                      ? "group relative flex items-center gap-3 overflow-hidden rounded-2xl bg-black px-3 py-3 text-sm font-bold shadow-[0_12px_28px_rgba(0,0,0,0.14)]"
                      : "group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-zinc-600 transition duration-200 hover:-translate-y-0.5 hover:bg-yellow-50 hover:text-black"
                  }
                  key={item.to}
                  to={item.to}
                >
                  {active ? (
                    <span className="absolute inset-y-2 left-1 w-1 rounded-full bg-yellow-300 animate-[sakuinNavMarker_1.8s_ease-in-out_infinite]" />
                  ) : null}

                  <span
                    className={
                      active
                        ? "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-yellow-300 text-black"
                        : "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 transition group-hover:bg-yellow-300 group-hover:text-black"
                    }
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </span>

                  <span className={active ? "relative text-white" : "text-zinc-700"}>
                    {item.sidebarLabel}
                  </span>
                </Link>
              );
            })}
          </nav>

          <Link
            className={[
              "group relative mt-6 overflow-hidden rounded-3xl border border-black p-4 transition duration-300 hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-yellow-300/40",
              assistantActive
                ? "bg-black text-white shadow-[6px_6px_0_#fde047]"
                : "bg-yellow-300 text-black shadow-[6px_6px_0_#000] hover:shadow-[9px_9px_0_#000]"
            ].join(" ")}
            to="/asisten"
          >
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.55),transparent)] animate-[sakuinShine_4s_ease-in-out_infinite]" />
            <div className="relative flex items-start gap-3">
              <span
                className={
                  assistantActive
                    ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-300 text-black"
                    : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black text-yellow-300"
                }
              >
                <Sparkles className="h-5 w-5 animate-[sakuinSoftPulse_2.8s_ease-in-out_infinite]" />
              </span>

              <div className="min-w-0">
                <p className="text-sm font-black">Asisten Sakuin</p>
                <p
                  className={
                    assistantActive
                      ? "mt-1 text-xs font-semibold leading-5 text-white/70"
                      : "mt-1 text-xs font-semibold leading-5 text-black/70"
                  }
                >
                  Tanya kondisi uangmu tanpa bongkar banyak menu.
                </p>
              </div>
            </div>
          </Link>

          <div className="mt-auto rounded-3xl border border-black/10 bg-zinc-50 p-4">
            <p className="truncate text-sm font-black text-black">
              {displayedName}
            </p>
            <p className="mt-1 truncate text-xs font-medium text-zinc-500">
              {displayedEmail}
            </p>
          </div>
        </aside>

        <section className="min-w-0 px-4 py-5 sm:px-8 sm:py-8">
          {children}
        </section>
      </div>

      <FloatingAiButton />

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-black/10 bg-white/95 px-2 py-2 shadow-[0_-12px_30px_rgba(0,0,0,0.08)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(location.pathname, item.to);

            return (
              <Link
                className={
                  active
                    ? "relative flex min-h-14 flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl bg-black px-1.5 py-2 shadow-[0_10px_24px_rgba(0,0,0,0.18)]"
                    : "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1.5 py-2 text-zinc-500 transition hover:bg-yellow-50 hover:text-black"
                }
                key={item.to}
                to={item.to}
              >
                {active ? (
                  <span className="absolute left-1/2 top-1 h-1 w-8 -translate-x-1/2 rounded-full bg-yellow-300 animate-[sakuinNavMarker_1.8s_ease-in-out_infinite]" />
                ) : null}

                <Icon
                  className={active ? "relative h-5 w-5 text-yellow-300" : "h-5 w-5 text-zinc-500"}
                />

                <span
                  className={
                    active
                      ? "relative text-[9px] font-black text-white"
                      : "text-[9px] font-black text-zinc-500"
                  }
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </main>
  );
}
