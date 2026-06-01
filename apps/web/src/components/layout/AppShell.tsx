import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  Download,
  Home,
  Settings,
  Target,
  WifiOff
} from "lucide-react";
import { SakuinIdentityLogo } from "../brand/SakuinIdentityLogo";
import {
  DesktopMainActionMenu,
  FloatingAssistantButton,
  MobileMainActionMenu
} from "./MobileQuickTransactionAction";
import { useAuth } from "../../features/auth/auth-context";
import {
  getOfflineQueue,
  hasLegacyOfflineQueue,
  syncOfflineTransactions
} from "../../lib/offline-queue";

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
          ? "sakuin-ripple relative flex min-h-14 flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl bg-[var(--sakuin-primary)] px-1.5 py-2 text-white shadow-[0_12px_28px_rgba(37,99,235,0.24)]"
          : "sakuin-press flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1.5 py-2 text-slate-500 transition hover:bg-[var(--sakuin-primary-soft)] active:bg-[var(--sakuin-primary-soft)] active:text-[var(--sakuin-primary)] motion-reduce:transition-none"
      }
      to={item.to}
    >
      {active ? (
        <span
          aria-hidden="true"
          className="absolute inset-x-4 bottom-1 h-1 rounded-full bg-white/70 animate-[sakuinNavMarker_1.8s_ease-in-out_infinite]"
        />
      ) : null}
      <Icon
        aria-hidden="true"
        className={
          active
            ? "sakuin-icon-bounce relative h-5 w-5 text-white"
            : "sakuin-icon-bounce h-5 w-5 text-slate-500"
        }
      />

      <span
        className={
          active
            ? "relative text-[10px] font-black text-white"
            : "text-[10px] font-black text-slate-500"
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

  const [isOffline, setIsOffline] = useState(navigator.onLine === false);
  const [servedFromCache, setServedFromCache] = useState(false);
  const [offlineQueueLength, setOfflineQueueLength] = useState(0);
  const [hasQuarantinedLegacyQueue, setHasQuarantinedLegacyQueue] =
    useState(false);

  useEffect(() => {
    const updateQueueLength = () => {
      setOfflineQueueLength(getOfflineQueue().length);
      setHasQuarantinedLegacyQueue(hasLegacyOfflineQueue());
    };

    updateQueueLength();
    window.addEventListener("sakuin-offline-queue-changed", updateQueueLength);

    if (navigator.onLine !== false) {
      void syncOfflineTransactions();
    }

    const handleOnline = () => {
      setIsOffline(false);
      setServedFromCache(false);
      void syncOfflineTransactions();
    };
    const handleOffline = () => {
      setIsOffline(true);
    };

    const handleCacheHit = () => {
      setServedFromCache(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("sakuin-offline-cache-hit", handleCacheHit);

    return () => {
      window.removeEventListener("sakuin-offline-queue-changed", updateQueueLength);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("sakuin-offline-cache-hit", handleCacheHit);
    };
  }, []);

  const displayedName = profileName ?? user?.name ?? "User";
  const displayedEmail = profileEmail ?? user?.email ?? "-";
  const isAssistantRoute = isActivePath(location.pathname, ASSISTANT_ROUTE);
  const shouldShowMobileNavigation = !isAssistantRoute;

  const showBanner =
    isOffline ||
    servedFromCache ||
    offlineQueueLength > 0 ||
    hasQuarantinedLegacyQueue;
  
  let bannerMessage = "";
  if (hasQuarantinedLegacyQueue) {
    bannerMessage =
      "Ada antrean transaksi offline dari versi lama yang ditahan agar tidak masuk ke akun yang salah. Catat ulang transaksi tersebut setelah memastikan akun yang benar.";
  } else if (isOffline) {
    bannerMessage = offlineQueueLength > 0
      ? `Anda sedang offline. Ada ${offlineQueueLength} transaksi tersimpan lokal yang menunggu sinkronisasi.`
      : "Anda sedang offline. Menampilkan data tersimpan dalam mode read-only.";
  } else if (offlineQueueLength > 0) {
    bannerMessage = `Menyinkronkan ${offlineQueueLength} transaksi offline ke server...`;
  } else {
    bannerMessage = "Koneksi terganggu. Beberapa data diambil dari penyimpanan lokal (cache).";
  }

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
                      ? "sakuin-ripple group relative flex items-center gap-3 overflow-hidden rounded-2xl bg-[var(--sakuin-primary)] px-3 py-3 text-sm font-bold shadow-[0_12px_28px_rgba(37,99,235,0.2)]"
                      : "sakuin-press group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-zinc-600 transition duration-200 hover:-translate-y-0.5 hover:bg-[var(--sakuin-primary-soft)] hover:text-[var(--sakuin-text)]"
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
                    <Icon className="sakuin-icon-bounce h-4.5 w-4.5" />
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
          {showBanner && (
            <div className="mb-6 flex items-center gap-3 rounded-[var(--sakuin-radius-card)] border border-amber-200 bg-amber-50/80 p-4 text-xs sm:text-sm font-bold text-amber-800 shadow-sm backdrop-blur-md">
              <WifiOff className="h-5 w-5 shrink-0 text-amber-600 animate-pulse" />
              <div>{bannerMessage}</div>
            </div>
          )}
          {children}
        </section>
      </div>

      <FloatingAssistantButton />
      <DesktopMainActionMenu />

      {shouldShowMobileNavigation ? (
        <nav
          aria-label="Navigasi utama mobile"
          className="fixed inset-x-0 bottom-0 z-50 min-h-[var(--sakuin-mobile-nav-height)] border-t border-[var(--sakuin-border)] bg-white/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-16px_40px_rgba(37,99,235,0.1)] backdrop-blur lg:hidden"
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
