import { useEffect, useState, type ReactNode } from "react";
import { createBrowserRouter, Link, Navigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  PiggyBank,
  ServerCrash,
  ShieldCheck,
  Smartphone,
  WalletCards
} from "lucide-react";
import { buttonClassName } from "../components/ui/button";
import { useAuth } from "../features/auth/auth-context";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { RegisterPage } from "../features/auth/pages/RegisterPage";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { getBackendHealth } from "../features/health/health.service";
import { ProfilePage } from "../features/profile/ProfilePage";
import { TransactionsPage } from "../features/transactions/TransactionsPage";
import { GoalsPage } from "../features/goals/GoalsPage";
import { ExportPage } from "../features/export/ExportPage";
import { CategoriesPage } from "../features/categories/CategoriesPage";

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="flex items-center gap-3 rounded-[1.5rem] border border-[var(--sakuin-border)] bg-white px-5 py-4 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--sakuin-purple)]" />
        <p className="text-sm font-medium text-[var(--sakuin-muted)]">
          Memuat Sakuin...
        </p>
      </div>
    </main>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function GuestRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function HomePage() {
  const [backendStatus, setBackendStatus] = useState<
    "checking" | "connected" | "error"
  >("checking");

  useEffect(() => {
    let isMounted = true;

    getBackendHealth()
      .then(() => {
        if (isMounted) {
          setBackendStatus("connected");
        }
      })
      .catch(() => {
        if (isMounted) {
          setBackendStatus("error");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-6xl flex-col">
        <header className="flex items-center justify-between rounded-[1.75rem] border border-[var(--sakuin-border)] bg-white/80 px-4 py-3 shadow-sm backdrop-blur sm:px-5">
          <Link className="flex items-center gap-2" to="/">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--sakuin-primary)] text-white">
              <WalletCards className="h-5 w-5" />
            </div>
            <span className="text-lg font-black tracking-tight">Sakuin</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              className={buttonClassName({
                variant: "ghost",
                size: "sm",
                className: "hidden sm:inline-flex"
              })}
              to="/login"
            >
              Login
            </Link>
            <Link
              className={buttonClassName({
                variant: "primary",
                size: "sm"
              })}
              to="/register"
            >
              Mulai
            </Link>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--sakuin-border)] bg-white px-3 py-2 text-xs font-bold text-[var(--sakuin-purple)] shadow-sm">
              <ShieldCheck className="h-4 w-4" />
              Personal finance web app
            </div>

            <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight text-[var(--sakuin-text)] sm:text-5xl lg:text-6xl">
              Finance in your pocket. Lebih rapi, lebih tenang.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--sakuin-muted)] sm:text-lg">
              Sakuin membantu mencatat pemasukan, pengeluaran, target tabungan,
              batas saldo aman, dan export laporan dalam satu web app yang
              nyaman dipakai di HP, tablet, laptop, dan PC.
            </p>

            <div className="mt-7 grid gap-3 sm:flex">
              <Link
                className={buttonClassName({
                  variant: "primary",
                  size: "lg",
                  className: "w-full sm:w-auto"
                })}
                to="/register"
              >
                Buat akun gratis
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                className={buttonClassName({
                  variant: "secondary",
                  size: "lg",
                  className: "w-full sm:w-auto"
                })}
                to="/login"
              >
                Login
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.5rem] border border-[var(--sakuin-border)] bg-white p-4 shadow-sm">
                <PiggyBank className="h-5 w-5 text-[var(--sakuin-purple)]" />
                <p className="mt-3 text-sm font-bold">Goals</p>
                <p className="mt-1 text-xs leading-5 text-[var(--sakuin-muted)]">
                  Pantau target tabungan.
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-[var(--sakuin-border)] bg-white p-4 shadow-sm">
                <WalletCards className="h-5 w-5 text-[var(--sakuin-green)]" />
                <p className="mt-3 text-sm font-bold">Transaksi</p>
                <p className="mt-1 text-xs leading-5 text-[var(--sakuin-muted)]">
                  Catat pemasukan dan pengeluaran.
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-[var(--sakuin-border)] bg-white p-4 shadow-sm">
                <Smartphone className="h-5 w-5 text-[var(--sakuin-amber)]" />
                <p className="mt-3 text-sm font-bold">Mobile-first</p>
                <p className="mt-1 text-xs leading-5 text-[var(--sakuin-muted)]">
                  Nyaman di berbagai perangkat.
                </p>
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-md">
            <div className="rounded-[2rem] border border-[var(--sakuin-border)] bg-white p-5 shadow-xl shadow-black/5">
              <div className="rounded-[1.5rem] bg-[var(--sakuin-primary)] p-5 text-white">
                <p className="text-sm text-white/70">Total Balance</p>
                <p className="mt-2 text-3xl font-black">Rp 7.500.000</p>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white/10 p-3">
                    <p className="text-xs text-white/60">Income</p>
                    <p className="mt-1 font-bold text-emerald-200">
                      + Rp 10 jt
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3">
                    <p className="text-xs text-white/60">Expense</p>
                    <p className="mt-1 font-bold text-rose-200">- Rp 2,5 jt</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[1.5rem] border border-[var(--sakuin-border)] bg-[var(--sakuin-surface-soft)] p-4">
                {backendStatus === "checking" ? (
                  <div className="flex items-center gap-3 text-[var(--sakuin-muted)]">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <div>
                      <p className="text-sm font-bold">Mengecek backend...</p>
                      <p className="text-xs">Menghubungi API Sakuin.</p>
                    </div>
                  </div>
                ) : null}

                {backendStatus === "connected" ? (
                  <div className="flex items-center gap-3 text-[var(--sakuin-green)]">
                    <CheckCircle2 className="h-5 w-5" />
                    <div>
                      <p className="text-sm font-bold">Backend terhubung</p>
                      <p className="text-xs text-[var(--sakuin-muted)]">
                        Frontend berhasil membaca endpoint /health.
                      </p>
                    </div>
                  </div>
                ) : null}

                {backendStatus === "error" ? (
                  <div className="flex items-center gap-3 text-[var(--sakuin-red)]">
                    <ServerCrash className="h-5 w-5" />
                    <div>
                      <p className="text-sm font-bold">Backend belum terhubung</p>
                      <p className="text-xs text-[var(--sakuin-muted)]">
                        Pastikan API berjalan di port 5000.
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />
  },
  {
    path: "/login",
    element: (
      <GuestRoute>
        <LoginPage />
      </GuestRoute>
    )
  },
  {
    path: "/register",
    element: (
      <GuestRoute>
        <RegisterPage />
      </GuestRoute>
    )
  },
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    )
  },
  {
  path: "/transactions",
  element: (
    <ProtectedRoute>
      <TransactionsPage />
    </ProtectedRoute>
  )
},
{
  path: "/goals",
  element: (
    <ProtectedRoute>
      <GoalsPage />
    </ProtectedRoute>
  )
},
{
  path: "/export",
  element: (
    <ProtectedRoute>
      <ExportPage />
    </ProtectedRoute>
  )
},
  {
  path: "/profile",
  element: (
    <ProtectedRoute>
      <ProfilePage />
    </ProtectedRoute>
  )
},
{
  path: "/categories",
  element: (
    <ProtectedRoute>
      <CategoriesPage />
    </ProtectedRoute>
  )
},
  {
    path: "*",
    element: <Navigate to="/" replace />
  }
]);