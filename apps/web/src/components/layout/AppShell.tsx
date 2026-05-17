import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  Download,
  Home,
  Settings,
  Target,
  WalletCards
} from "lucide-react";
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

  return (
    <main className="min-h-screen bg-slate-50 pb-24 text-slate-950 lg:pb-0">
      <div className="mx-auto grid w-full max-w-[1440px] lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-screen border-r border-slate-200 bg-white px-5 py-6 lg:flex lg:flex-col">
          <Link className="mb-9 flex items-center gap-3 px-1" to="/dashboard">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
              <WalletCards className="h-5 w-5" />
            </div>

            <div>
              <p className="text-lg font-black leading-none tracking-tight text-slate-950">
                Sakuin
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Finance app
              </p>
            </div>
          </Link>

          <nav className="grid flex-1 content-start gap-1.5">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(location.pathname, item.to);

              return (
                <Link
                  className={
                    active
                      ? "flex items-center gap-3 rounded-2xl bg-slate-950 px-3 py-3 text-sm font-bold shadow-sm"
                      : "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
                  }
                  key={item.to}
                  to={item.to}
                >
                  <Icon
                    className={
                      active
                        ? "h-5 w-5 text-white"
                        : "h-5 w-5 text-slate-400"
                    }
                  />

                  <span className={active ? "text-white" : "text-slate-700"}>
                    {item.sidebarLabel}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="truncate text-sm font-black text-slate-950">
              {displayedName}
            </p>
            <p className="mt-1 truncate text-xs font-medium text-slate-500">
              {displayedEmail}
            </p>
          </div>
        </aside>

        <section className="min-w-0 px-4 py-5 sm:px-8 sm:py-8">
          {children}
        </section>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white px-2 py-2 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(location.pathname, item.to);

            return (
              <Link
                className={
                  active
                    ? "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl bg-slate-950 px-1.5 py-2"
                    : "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1.5 py-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
                }
                key={item.to}
                to={item.to}
              >
                <Icon
                  className={
                    active ? "h-5 w-5 text-white" : "h-5 w-5 text-slate-500"
                  }
                />

                <span
                  className={
                    active
                      ? "text-[9px] font-black text-white"
                      : "text-[9px] font-black text-slate-500"
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