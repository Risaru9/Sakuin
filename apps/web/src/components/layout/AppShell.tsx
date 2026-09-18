import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChartPie, LayoutGrid, List, WifiOff, type LucideIcon } from "lucide-react";
import { SakuinIdentityLogo } from "../brand/SakuinIdentityLogo";
import { useAuth } from "../../features/auth/auth-context";
import { QuickComposer } from "../../features/quick-composer/QuickComposer";
import { cn } from "../../lib/cn";
import {
  getOfflineQueue,
  hasLegacyOfflineQueue,
  syncOfflineTransactions
} from "../../lib/offline-queue";

type AppShellProps = {
  children: ReactNode;
  profileName?: string;
  profileEmail?: string;
  /** Docks the "kolom catat" at the bottom of the page. */
  showQuickComposer?: boolean;
  /** Narrower side padding on phones for edge-to-edge Saku screens. */
  bleed?: boolean;
  /** Hide the bottom navigation, e.g. on full-screen sub pages such as search. */
  mobileNav?: boolean;
  /**
   * "page": the screen shows its own offline indicator, so the banner only appears for the
   * quarantined legacy queue, which needs the full explanation.
   */
  offlineNotice?: "banner" | "page";
};

type NavigationItem = {
  label: string;
  icon: LucideIcon;
  to: string;
  /** Other paths that belong to this tab. */
  matches: string[];
};

const navigationItems: NavigationItem[] = [
  { label: "Catatan", icon: List, to: "/dashboard", matches: ["/dashboard", "/cari"] },
  { label: "Laporan", icon: ChartPie, to: "/laporan", matches: ["/laporan"] },
  {
    label: "Lainnya",
    icon: LayoutGrid,
    to: "/lainnya",
    // Screens reached from Lainnya keep that tab selected.
    matches: ["/lainnya", "/profile", "/goals", "/export", "/asisten"]
  }
];

function isActiveItem(currentPath: string, item: NavigationItem) {
  return item.matches.some((path) => currentPath === path || currentPath.startsWith(`${path}/`));
}

function MobileNavigationLink({ item, active }: { item: NavigationItem; active: boolean }) {
  const Icon = item.icon;

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30"
      to={item.to}
    >
      <span
        className={cn(
          "flex h-8 w-[60px] items-center justify-center rounded-full border-2",
          active ? "border-saku-ink bg-saku-coin shadow-saku-xs" : "border-transparent"
        )}
      >
        <Icon
          aria-hidden="true"
          className={cn("size-[21px]", active ? "text-saku-ink" : "text-saku-muted")}
          strokeWidth={2.4}
        />
      </span>
      <span className={cn("text-xs font-black", active ? "text-saku-ink" : "text-saku-muted")}>
        {item.label}
      </span>
    </Link>
  );
}

export function AppShell({
  children,
  profileName,
  profileEmail,
  showQuickComposer = false,
  bleed = false,
  mobileNav = true,
  offlineNotice = "banner"
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
  const isAssistantRoute = location.pathname.startsWith("/asisten");
  const shouldShowMobileNavigation = mobileNav && !isAssistantRoute;

  const showBanner =
    hasQuarantinedLegacyQueue ||
    (offlineNotice === "banner" &&
      (isOffline || servedFromCache || offlineQueueLength > 0));

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
      className={cn(
        "min-h-screen bg-saku-bg font-saku-body text-saku-ink lg:pb-0",
        !shouldShowMobileNavigation
          ? "pb-0"
          : showQuickComposer
            ? "pb-[var(--sakuin-mobile-nav-height)]"
            : "pb-[var(--sakuin-mobile-content-bottom)]"
      )}
    >
      <div className="mx-auto grid w-full max-w-[1440px] lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-screen border-r-[2.5px] border-saku-ink bg-saku-paper px-5 py-6 lg:flex lg:flex-col">
          <Link
            className="mb-8 rounded-2xl px-1 py-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30"
            to="/dashboard"
          >
            <SakuinIdentityLogo subtitle="Personal finance app" size="md" />
          </Link>

          <nav aria-label="Navigasi utama" className="grid content-start gap-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActiveItem(location.pathname, item);

              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-12 items-center gap-3 rounded-2xl border-2 px-3 text-[15px] font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30",
                    active
                      ? "border-saku-ink bg-saku-coin text-saku-ink shadow-saku-xs"
                      : "border-transparent text-saku-muted hover:bg-saku-bg hover:text-saku-ink"
                  )}
                  key={item.to}
                  to={item.to}
                >
                  <Icon aria-hidden="true" className="size-5" strokeWidth={2.4} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="saku-line-thin mt-auto rounded-saku-card bg-saku-bg p-4">
            <p className="truncate text-sm font-black">{displayedName}</p>
            <p className="mt-1 truncate text-xs font-bold text-saku-muted">{displayedEmail}</p>
          </div>
        </aside>

        <section
          className={cn(
            "min-w-0 pt-5 sm:px-8 sm:pt-8",
            bleed ? "px-3" : "px-4",
            // With the composer, the page fills the screen so the field stays just above the nav.
            showQuickComposer
              ? "flex min-h-[calc(100dvh-var(--sakuin-mobile-nav-height))] flex-col pb-2 lg:min-h-screen lg:pb-6"
              : "pb-5 sm:pb-8"
          )}
        >
          {showBanner && (
            <div className="mb-6 flex items-center gap-3 rounded-[var(--sakuin-radius-card)] border border-amber-200 bg-amber-50/80 p-4 text-xs sm:text-sm font-bold text-amber-800 shadow-sm backdrop-blur-md">
              <WifiOff className="h-5 w-5 shrink-0 text-amber-600 animate-pulse" />
              <div>{bannerMessage}</div>
            </div>
          )}
          {showQuickComposer ? (
            <>
              <div className="flex-1">{children}</div>
              <div className="sticky bottom-[calc(var(--sakuin-mobile-nav-height)+0.5rem)] z-40 mx-auto mt-4 w-full max-w-xl lg:bottom-6">
                <QuickComposer />
              </div>
            </>
          ) : (
            children
          )}
        </section>
      </div>

      {shouldShowMobileNavigation ? (
        <nav
          aria-label="Navigasi utama mobile"
          className="fixed inset-x-0 bottom-0 z-50 min-h-[var(--sakuin-mobile-nav-height)] border-t-[2.5px] border-saku-ink bg-saku-paper px-3 pt-1.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] font-saku-body lg:hidden"
        >
          <div className="mx-auto grid max-w-lg grid-cols-3">
            {navigationItems.map((item) => (
              <MobileNavigationLink
                active={isActiveItem(location.pathname, item)}
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
