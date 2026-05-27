import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  Home,
  MessageCircle,
  Settings,
  Sparkles,
  Target
} from "lucide-react";
import { SakuinIdentityLogo } from "../brand/SakuinIdentityLogo";
import { MobileQuickTransactionAction } from "./MobileQuickTransactionAction";
import { useAuth } from "../../features/auth/auth-context";

type AppShellProps = {
  children: ReactNode;
  profileName?: string;
  profileEmail?: string;
};

const primaryNavigationItems = [
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
    label: "Profile",
    sidebarLabel: "Profile",
    icon: Settings,
    to: "/profile"
  },
  {
    label: "Goals",
    sidebarLabel: "Goals",
    icon: Target,
    to: "/goals"
  }
];

const assistantNavigationItem = {
  label: "Asisten",
  sidebarLabel: "Asisten",
  icon: MessageCircle,
  to: "/asisten"
};

const desktopNavigationItems = [
  primaryNavigationItems[0],
  primaryNavigationItems[1],
  assistantNavigationItem,
  primaryNavigationItems[3],
  primaryNavigationItems[2]
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
  const isAssistantRoute = isActivePath(
    location.pathname,
    assistantNavigationItem.to
  );
  const shouldShowMobileNavigation = !isAssistantRoute;

  return (
    <main
      className={[
        "min-h-screen bg-[#f7f5ef] text-black lg:pb-0",
        shouldShowMobileNavigation
          ? "pb-[var(--sakuin-mobile-content-bottom)]"
          : "pb-0"
      ].join(" ")}
    >
      <div className="mx-auto grid w-full max-w-[1440px] lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-screen border-r border-black/10 bg-white/95 px-5 py-6 shadow-[12px_0_35px_rgba(0,0,0,0.03)] lg:flex lg:flex-col">
          <Link
            className="mb-8 rounded-2xl px-1 py-1 transition hover:bg-yellow-50"
            to="/dashboard"
          >
            <SakuinIdentityLogo subtitle="Personal finance app" size="md" />
          </Link>

          <nav className="grid content-start gap-1.5">
            {desktopNavigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(location.pathname, item.to);
              const isAssistant = item.to === "/asisten";

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
                        : isAssistant
                          ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-yellow-300 text-black transition group-hover:bg-black group-hover:text-yellow-300"
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

      <MobileQuickTransactionAction />

      {shouldShowMobileNavigation ? (
        <nav
          aria-label="Navigasi utama mobile"
          className="fixed inset-x-0 bottom-0 z-50 min-h-[var(--sakuin-mobile-nav-height)] border-t border-black/10 bg-white/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_30px_rgba(0,0,0,0.08)] backdrop-blur lg:hidden"
        >
          <div className="mx-auto grid max-w-lg grid-cols-[1fr_1fr_4.75rem_1fr_1fr] items-end gap-1">
            {[primaryNavigationItems[0], primaryNavigationItems[1]].map((item) => {
              const Icon = item.icon;
              const active = isActivePath(location.pathname, item.to);

              return (
                <Link
                  className={
                    active
                      ? "relative flex min-h-14 flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl bg-black px-1.5 py-2 shadow-[0_10px_24px_rgba(0,0,0,0.18)]"
                      : "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1.5 py-2 text-zinc-500 transition active:bg-yellow-50 active:text-black"
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
                        ? "relative text-[10px] font-black text-white"
                        : "text-[10px] font-black text-zinc-500"
                    }
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}

            <Link
              aria-label="Buka Asisten Sakuin"
              className="relative -mt-8 mx-auto flex min-h-[4.9rem] w-[4.75rem] flex-col items-center justify-center gap-1 rounded-[1.6rem] border border-black bg-yellow-300 px-2 pb-2 pt-3 text-black shadow-[0_14px_28px_rgba(0,0,0,0.22)] transition active:translate-y-0.5 active:shadow-[0_9px_20px_rgba(0,0,0,0.20)]"
              to={assistantNavigationItem.to}
            >
              <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-black text-yellow-300">
                <Sparkles className="absolute -right-1 -top-1 h-3.5 w-3.5" />
                <MessageCircle className="h-5 w-5" />
              </span>
              <span className="text-[10px] font-black text-black">
                Asisten
              </span>
            </Link>

            {[primaryNavigationItems[3], primaryNavigationItems[2]].map((item) => {
              const Icon = item.icon;
              const active = isActivePath(location.pathname, item.to);

              return (
                <Link
                  className={
                    active
                      ? "relative flex min-h-14 flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl bg-black px-1.5 py-2 shadow-[0_10px_24px_rgba(0,0,0,0.18)]"
                      : "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1.5 py-2 text-zinc-500 transition active:bg-yellow-50 active:text-black"
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
                        ? "relative text-[10px] font-black text-white"
                        : "text-[10px] font-black text-zinc-500"
                    }
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </main>
  );
}
