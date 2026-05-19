import {
  lazy,
  Suspense,
  useEffect,
  useState,
  type ReactNode
} from "react";
import { createBrowserRouter, Link, Navigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Download,
  Loader2,
  PiggyBank,
  ServerCrash,
  ShieldCheck,
  Smartphone,
  Tags,
  Target,
  WalletCards
} from "lucide-react";
import { InstallAppButton } from "../components/pwa/InstallAppButton";
import { buttonClassName } from "../components/ui/button";
import { useAuth } from "../features/auth/auth-context";
import { getBackendHealth } from "../features/health/health.service";

const LoginPage = lazy(() =>
  import("../features/auth/pages/LoginPage").then((module) => ({
    default: module.LoginPage
  }))
);

const RegisterPage = lazy(() =>
  import("../features/auth/pages/RegisterPage").then((module) => ({
    default: module.RegisterPage
  }))
);

const ForgotPasswordPage = lazy(() =>
  import("../features/auth/pages/ForgotPasswordPage").then((module) => ({
    default: module.ForgotPasswordPage
  }))
);

const ResetPasswordPage = lazy(() =>
  import("../features/auth/pages/ResetPasswordPage").then((module) => ({
    default: module.ResetPasswordPage
  }))
);

const DashboardPage = lazy(() =>
  import("../features/dashboard/DashboardPage").then((module) => ({
    default: module.DashboardPage
  }))
);

const TransactionsPage = lazy(() =>
  import("../features/transactions/TransactionsPage").then((module) => ({
    default: module.TransactionsPage
  }))
);

const GoalsPage = lazy(() =>
  import("../features/goals/GoalsPage").then((module) => ({
    default: module.GoalsPage
  }))
);

const ExportPage = lazy(() =>
  import("../features/export/ExportPage").then((module) => ({
    default: module.ExportPage
  }))
);

const ProfilePage = lazy(() =>
  import("../features/profile/ProfilePage").then((module) => ({
    default: module.ProfilePage
  }))
);

const CategoriesPage = lazy(() =>
  import("../features/categories/CategoriesPage").then((module) => ({
    default: module.CategoriesPage
  }))
);

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

function PageSuspense({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LoadingScreen />}>{children}</Suspense>;
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <PageSuspense>{children}</PageSuspense>;
}

function GuestRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <PageSuspense>{children}</PageSuspense>;
}

function StatusBadge({
  backendStatus
}: {
  backendStatus: "checking" | "connected" | "error";
}) {
  if (backendStatus === "checking") {
    return (
      <div className="flex items-center gap-3 text-[var(--sakuin-muted)]">
        <Loader2 className="h-5 w-5 animate-spin" />
        <div>
          <p className="text-sm font-bold">Mengecek backend...</p>
          <p className="text-xs">Menghubungi API Sakuin.</p>
        </div>
      </div>
    );
  }

  if (backendStatus === "connected") {
    return (
      <div className="flex items-center gap-3 text-[var(--sakuin-green)]">
        <CheckCircle2 className="h-5 w-5" />
        <div>
          <p className="text-sm font-bold">Backend terhubung</p>
          <p className="text-xs text-[var(--sakuin-muted)]">
            Frontend berhasil membaca endpoint /health.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-[var(--sakuin-red)]">
      <ServerCrash className="h-5 w-5" />
      <div>
        <p className="text-sm font-bold">Backend belum terhubung</p>
        <p className="text-xs text-[var(--sakuin-muted)]">
          Pastikan API berjalan dan environment frontend sudah benar.
        </p>
      </div>
    </div>
  );
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

  const featureCards = [
    {
      icon: WalletCards,
      title: "Catat transaksi",
      description:
        "Simpan pemasukan dan pengeluaran harian dengan kategori yang rapi."
    },
    {
      icon: Tags,
      title: "Kelola kategori",
      description:
        "Gunakan kategori default atau buat kategori custom sesuai kebiasaanmu."
    },
    {
      icon: Target,
      title: "Pantau goals",
      description:
        "Buat target tabungan dan pantau progress-nya dari satu dashboard."
    },
    {
      icon: Download,
      title: "Export laporan",
      description:
        "Unduh transaksi ke JSON, CSV, atau XLSX untuk arsip dan analisis."
    }
  ];

  const usageSteps = [
    {
      title: "Buat akun",
      description:
        "Daftar dengan email, lalu semua data keuanganmu dipisahkan berdasarkan akun."
    },
    {
      title: "Catat transaksi",
      description:
        "Masukkan income atau expense, pilih kategori, tanggal, dan catatan."
    },
    {
      title: "Pantau dashboard",
      description:
        "Lihat saldo, pengeluaran, pemasukan, trend bulanan, dan transaksi terbaru."
    },
    {
      title: "Evaluasi keuangan",
      description:
        "Gunakan goals, safe balance limit, dan export laporan untuk mengambil keputusan."
    }
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.10),transparent_36%),var(--sakuin-bg)] px-4 py-5 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-7xl">
        <header className="sticky top-4 z-30 flex items-center justify-between rounded-[1.75rem] border border-[var(--sakuin-border)] bg-white/90 px-4 py-3 shadow-sm backdrop-blur-xl sm:px-5">
          <Link className="flex items-center gap-3" to="/">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--sakuin-primary)] text-white shadow-sm">
              <WalletCards className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-lg font-black leading-none tracking-tight text-[var(--sakuin-text)]">
                Sakuin
              </span>
              <span className="mt-1 hidden text-xs font-semibold text-[var(--sakuin-muted)] sm:block">
                Personal finance web app
              </span>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
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
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-black !text-white shadow-sm transition hover:bg-black focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
              to="/register"
            >
              <span className="text-white">Daftar</span>
              <ArrowRight className="ml-2 h-4 w-4 text-white" />
            </Link>
          </div>
        </header>

        <section className="grid min-h-[calc(100vh-6rem)] items-center gap-10 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--sakuin-border)] bg-white px-3 py-2 text-xs font-black text-[var(--sakuin-purple)] shadow-sm">
              <ShieldCheck className="h-4 w-4" />
              Personal finance web app
            </div>

            <h1 className="mt-6 max-w-4xl text-4xl font-black tracking-tight text-[var(--sakuin-text)] sm:text-5xl lg:text-7xl">
              Kelola uang pribadi dengan lebih rapi dan tenang.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--sakuin-muted)] sm:text-lg">
              Sakuin membantu kamu mencatat pemasukan, mengontrol pengeluaran,
              mengatur kategori, memantau target tabungan, menjaga batas saldo
              aman, dan mengekspor laporan transaksi dalam satu webapp yang
              ringan.
            </p>

            <div className="mt-8 grid gap-3 sm:flex">
              <Link
                className="inline-flex min-h-12 w-full items-center justify-center rounded-[1.35rem] bg-slate-950 px-6 text-base font-black !text-white shadow-sm transition hover:bg-black sm:w-auto"
                to="/register"
              >
                <span className="text-white">Mulai gratis</span>
                <ArrowRight className="ml-2 h-4 w-4 text-white" />
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

              <InstallAppButton label="Install Sakuin" variant="hero" />
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.5rem] border border-[var(--sakuin-border)] bg-white p-4 shadow-sm">
                <PiggyBank className="h-5 w-5 text-[var(--sakuin-purple)]" />
                <p className="mt-3 text-sm font-black">Goals</p>
                <p className="mt-1 text-xs leading-5 text-[var(--sakuin-muted)]">
                  Pantau target tabungan.
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-[var(--sakuin-border)] bg-white p-4 shadow-sm">
                <WalletCards className="h-5 w-5 text-[var(--sakuin-green)]" />
                <p className="mt-3 text-sm font-black">Transaksi</p>
                <p className="mt-1 text-xs leading-5 text-[var(--sakuin-muted)]">
                  Catat pemasukan dan pengeluaran.
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-[var(--sakuin-border)] bg-white p-4 shadow-sm">
                <Smartphone className="h-5 w-5 text-[var(--sakuin-amber)]" />
                <p className="mt-3 text-sm font-black">Mobile-first</p>
                <p className="mt-1 text-xs leading-5 text-[var(--sakuin-muted)]">
                  Nyaman di HP, tablet, dan laptop.
                </p>
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-md lg:max-w-lg">
            <div className="rounded-[2rem] border border-[var(--sakuin-border)] bg-white p-5 shadow-2xl shadow-slate-950/10">
              <div className="rounded-[1.5rem] bg-[var(--sakuin-primary)] p-6 text-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-white/70">Total Balance</p>
                    <p className="mt-2 text-4xl font-black">Rp 7.500.000</p>
                  </div>

                  <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-200 ring-1 ring-emerald-300/20">
                    Aman
                  </span>
                </div>

                <div className="mt-7 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-xs text-white/60">Income</p>
                    <p className="mt-1 font-black text-emerald-200">
                      + Rp 10 jt
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-xs text-white/60">Expense</p>
                    <p className="mt-1 font-black text-rose-200">- Rp 2,5 jt</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[1.5rem] border border-[var(--sakuin-border)] bg-[var(--sakuin-surface-soft)] p-4">
                <StatusBadge backendStatus={backendStatus} />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.25rem] bg-slate-50 p-4">
                  <p className="text-xs font-bold text-slate-500">
                    Goals aktif
                  </p>
                  <p className="mt-1 text-xl font-black text-slate-950">3</p>
                </div>

                <div className="rounded-[1.25rem] bg-slate-50 p-4">
                  <p className="text-xs font-bold text-slate-500">
                    Export format
                  </p>
                  <p className="mt-1 text-xl font-black text-slate-950">
                    3 jenis
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-10 sm:py-14">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black text-[var(--sakuin-purple)]">
              Fungsi utama
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-[var(--sakuin-text)] sm:text-4xl">
              Semua kebutuhan dasar pencatatan keuangan pribadi dalam satu tempat.
            </h2>
            <p className="mt-4 text-sm leading-7 text-[var(--sakuin-muted)] sm:text-base">
              Fokus Sakuin adalah membuat pencatatan keuangan menjadi sederhana:
              masukkan transaksi, lihat ringkasan, pantau tujuan, lalu export
              laporan ketika dibutuhkan.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featureCards.map((feature) => {
              const Icon = feature.icon;

              return (
                <div
                  className="rounded-[1.75rem] border border-[var(--sakuin-border)] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                  key={feature.title}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--sakuin-surface-soft)] text-[var(--sakuin-purple)]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-base font-black text-[var(--sakuin-text)]">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--sakuin-muted)]">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-6 py-10 sm:py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="rounded-[2rem] border border-[var(--sakuin-border)] bg-white p-6 shadow-xl shadow-slate-950/5 sm:p-8">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--sakuin-purple-soft)] text-[var(--sakuin-purple)]">
              <BarChart3 className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-3xl font-black tracking-tight text-[var(--sakuin-text)] sm:text-4xl">
              Cara menggunakan Sakuin
            </h2>
            <p className="mt-4 text-sm leading-7 text-[var(--sakuin-muted)] sm:text-base">
              Sakuin dibuat untuk alur yang sederhana. Kamu tidak perlu setup
              rumit. Cukup daftar, catat transaksi, lalu pantau kondisi
              keuangan dari dashboard.
            </p>
          </div>

          <div className="grid gap-4">
            {usageSteps.map((step, index) => (
              <div
                className="flex gap-4 rounded-[1.5rem] border border-[var(--sakuin-border)] bg-white p-5 shadow-sm"
                key={step.title}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">
                  {index + 1}
                </div>
                <div>
                  <h3 className="text-base font-black text-[var(--sakuin-text)]">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-[var(--sakuin-muted)]">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="py-10 sm:py-14">
          <div className="grid gap-5 rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-950/10 sm:p-8 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div>
              <p className="text-sm font-black text-emerald-200">
                Visi Sakuin
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Membantu pengguna lebih sadar dan tenang dalam mengelola uang.
              </h2>
            </div>

            <div className="grid gap-3">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="font-black">Rapi</p>
                <p className="mt-1 text-sm leading-6 text-white/70">
                  Transaksi dicatat dengan kategori, tanggal, dan catatan yang
                  jelas.
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="font-black">Terkontrol</p>
                <p className="mt-1 text-sm leading-6 text-white/70">
                  Dashboard membantu melihat apakah kondisi saldo masih aman.
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="font-black">Bisa dievaluasi</p>
                <p className="mt-1 text-sm leading-6 text-white/70">
                  Export laporan memudahkan analisis lanjutan di spreadsheet.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-10 sm:py-14">
          <div className="rounded-[2rem] border border-[var(--sakuin-border)] bg-white p-6 text-center shadow-xl shadow-slate-950/5 sm:p-8">
            <h2 className="mx-auto max-w-2xl text-3xl font-black tracking-tight text-[var(--sakuin-text)] sm:text-4xl">
              Mulai rapikan pencatatan keuanganmu hari ini.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[var(--sakuin-muted)] sm:text-base">
              Buat akun gratis, catat transaksi pertamamu, dan lihat ringkasan
              kondisi keuangan langsung dari dashboard.
            </p>

            <div className="mt-7 grid gap-3 sm:flex sm:justify-center">
              <Link
                className="inline-flex min-h-12 w-full items-center justify-center rounded-[1.35rem] bg-slate-950 px-6 text-base font-black !text-white shadow-sm transition hover:bg-black sm:w-auto"
                to="/register"
              >
                <span className="text-white">Buat akun gratis</span>
                <ArrowRight className="ml-2 h-4 w-4 text-white" />
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

              <InstallAppButton label="Install Sakuin" variant="hero" />
            </div>
          </div>
        </section>
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
  path: "/forgot-password",
  element: (
    <GuestRoute>
      <ForgotPasswordPage />
    </GuestRoute>
  )
},
{
  path: "/reset-password",
  element: (
    <GuestRoute>
      <ResetPasswordPage />
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