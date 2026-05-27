import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  Download,
  Home,
  Settings,
  Target
} from "lucide-react";
import { SakuinIdentityLogo } from "../brand/SakuinIdentityLogo";
import {
  DesktopMainActionMenu,
  FloatingAssistantButton,
  MobileMainActionMenu
} from "./MobileQuickTransactionAction";
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
  },
  {
    label: "Export",
    sidebarLabel: "Export",
    icon: Download,
    to: "/export"
  }
];

const ASSISTANT_ROUTE = "/asisten";

const desktopNavigationItems = [
  primaryNavigationItems[0],
  primaryNavigationItems[1],
  primaryNavigationItems[3],
  primaryNavigationItems[4],
  primaryNavigationItems[2]
];

const leftMobileNavigationItems = [
  primaryNavigationItems[0],
  primaryNavigationItems[1]
];

const rightMobileNavigationItems = [
  primaryNavigationItems[3],
  primaryNavigationItems[2]
];

function isActivePath(currentPath: string, targetPath: string) {
  if (targetPath === "/dashboard") {
    return currentPath === "/" || currentPath === "/dashboard";
  }

  return currentPath.startsWith(targetPath);
}

function MobileNavigationLink({
  item,
  currentPath
}: {
  item: (typeof primaryNavigationItems)[number];
  currentPath: string;
}) {
  const Icon = item.icon;
  const active = isActivePath(currentPath, item.to);

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "relative flex min-h-14 flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl bg-black px-1.5 py-2 shadow-[0_10px_24px_rgba(0,0,0,0.18)]"
          : "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1.5 py-2 text-zinc-500 transition active:bg-yellow-50 active:text-black motion-reduce:transition-none"
      }
      to={item.to}
    >
      <Icon
        aria-hidden="true"
        className={
          active
            ? "relative h-5 w-5 text-yellow-300"
            : "h-5 w-5 text-zinc-500"
        }
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
  const isAssistantRoute = isActivePath(location.pathname, ASSISTANT_ROUTE);
  const shouldShowMobileNavigation = !isAssistantRoute;

  return (
    <main
      className={[
        "min-h-screen bg-[var(--sakuin-bg)] text-[var(--sakuin-text)] lg:pb-0",
        shouldShowMobileNavigation
          ? "pb-[var(--sakuin-mobile-content-bottom)]"
          : "pb-0"
      ].join(" ")}
    >
      <div className="mx-auto grid w-full max-w-[1440px] lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-screen border-r border-[var(--sakuin-border)] bg-white/95 px-5 py-6 shadow-[12px_0_35px_rgba(15,23,42,0.03)] lg:flex lg:flex-col">
          <Link
            className="mb-8 rounded-2xl px-1 py-1 transition hover:bg-[var(--sakuin-primary-soft)]"
            to="/dashboard"
          >
            <SakuinIdentityLogo subtitle="Personal finance app" size="md" />
          </Link>

          <nav className="grid content-start gap-1.5">
            {desktopNavigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(location.pathname, item.to);

              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "group relative flex items-center gap-3 overflow-hidden rounded-2xl bg-[var(--sakuin-primary)] px-3 py-3 text-sm font-bold shadow-[0_12px_28px_rgba(10,142,140,0.18)]"
                      : "group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-zinc-600 transition duration-200 hover:-translate-y-0.5 hover:bg-[var(--sakuin-primary-soft)] hover:text-[var(--sakuin-text)]"
                  }
                  key={item.to}
                  to={item.to}
                >
                  <span
                    className={
                      active
                        ? "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--sakuin-primary)]"
                        : "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 transition group-hover:bg-white group-hover:text-[var(--sakuin-primary)]"
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

          <div className="mt-auto rounded-3xl border border-[var(--sakuin-border)] bg-[var(--sakuin-surface-soft)] p-4">
            <p className="truncate text-sm font-black text-[var(--sakuin-text)]">
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

      <FloatingAssistantButton />
      <DesktopMainActionMenu />

      {shouldShowMobileNavigation ? (
        <nav
          aria-label="Navigasi utama mobile"
          className="fixed inset-x-0 bottom-0 z-50 min-h-[var(--sakuin-mobile-nav-height)] border-t border-black/10 bg-white/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_30px_rgba(0,0,0,0.08)] backdrop-blur lg:hidden"
        >
          <div className="mx-auto grid max-w-lg grid-cols-[1fr_1fr_4.75rem_1fr_1fr] items-end gap-1">
            {leftMobileNavigationItems.map((item) => (
              <MobileNavigationLink
                currentPath={location.pathname}
                item={item}
                key={item.to}
              />
            ))}

            <MobileMainActionMenu />

            {rightMobileNavigationItems.map((item) => (
              <MobileNavigationLink
                currentPath={location.pathname}
                item={item}
                key={item.to}
              />
            ))}
          </div>
        </nav>
      ) : null}
    </main>
  );
}
