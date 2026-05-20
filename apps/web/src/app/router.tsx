import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Link, Navigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Download,
  ExternalLink,
  Loader2,
  MessageSquare,
  PiggyBank,
  ShieldCheck,
  Smartphone,
  Tags,
  Target,
  WalletCards
} from "lucide-react";
import { SakuinLogo } from "../components/brand/SakuinLogo";
import { InstallAppButton } from "../components/pwa/InstallAppButton";
import { buttonClassName } from "../components/ui/button";
import { useAuth } from "../features/auth/auth-context";

const FEEDBACK_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfr2eAUDvktXBFQwBo8SkB--6AWi0K9ooIeilwLUZIVxoZLbg/viewform?usp=dialog";

const FEEDBACK_QR_IMAGE_PATH = "/image/feedback-sakuin.png";

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

const AsistenPage = lazy(() =>
  import("../features/ai/pages/AsistenPage").then((module) => ({
    default: module.AsistenPage
  }))
);

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50/50 px-4 backdrop-blur-sm">
      <div className="flex items-center gap-4 rounded-2xl border border-white/60 bg-white/80 px-6 py-5 shadow-xl shadow-purple-900/5 backdrop-blur-xl">
        <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
        <p className="text-sm font-semibold tracking-wide text-slate-600">
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

function HomePage() {
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
        "Daftar dengan email atau Google, lalu semua data keuanganmu dipisahkan berdasarkan akun."
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
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 selection:bg-purple-500/30">
      
      {/* BACKGROUND AMBIENT EFFECT */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -left-[10%] -top-[10%] h-[40rem] w-[40rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.07),transparent_60%)]"></div>
        <div className="absolute -right-[10%] top-[20%] h-[40rem] w-[40rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.05),transparent_60%)]"></div>
        <div className="absolute -bottom-[20%] left-[20%] h-[50rem] w-[50rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.05),transparent_60%)]"></div>
      </div>

      <section className="relative z-10 mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        
        {/* HEADER */}
        <header className="sticky top-4 z-50 flex items-center justify-between rounded-full border border-slate-200/60 bg-white/80 px-4 py-2.5 shadow-md backdrop-blur-xl sm:px-6">
        <Link className="min-w-0" to="/">
          <SakuinLogo subtitle="Personal finance web app" size="md" />
        </Link>

          <div className="flex shrink-0 items-center gap-2.5">
            <Link
              className={buttonClassName({
                variant: "ghost",
                size: "sm",
                className: "hidden sm:inline-flex font-bold !text-slate-700 hover:!text-slate-900"
              })}
              to="/login"
            >
              Login
            </Link>

            <Link
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-black !text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
              to="/register"
            >
              <span>Daftar</span>
              <ArrowRight className="ml-2 h-4 w-4 !text-white" />
            </Link>
          </div>
        </header>

        {/* HERO SECTION */}
        <section className="grid min-h-[calc(100vh-7rem)] grid-cols-1 items-center gap-12 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:py-16">
          <div className="flex flex-col items-start">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-200/60 bg-purple-50/60 px-3.5 py-1.5 text-xs font-bold text-purple-700 shadow-sm backdrop-blur-md">
              <ShieldCheck className="h-4 w-4" />
              Personal finance web app
            </div>

            <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl xl:text-[4rem] xl:leading-[1.1]">
              Kelola uang pribadi dengan lebih rapi & tenang.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Sakuin membantu kamu mencatat pemasukan, mengontrol pengeluaran,
              mengatur kategori, dan memantau target tabungan dalam satu *webapp* yang ringan dan aman.
            </p>

            <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-slate-950 px-6 text-base font-black !text-white shadow-md transition hover:bg-slate-800 sm:w-auto"
                to="/register"
              >
                <span>Mulai gratis</span>
                <ArrowRight className="ml-2 h-4 w-4 !text-white" />
              </Link>
              
              <Link
                className={buttonClassName({
                  variant: "secondary",
                  size: "lg",
                  className: "min-h-12 rounded-xl border border-slate-200 bg-white/80 px-6 text-base font-black !text-slate-900 shadow-sm transition hover:bg-slate-50 w-full sm:w-auto"
                })}
                to="/login"
              >
                Login
              </Link>

              <div className="w-full sm:w-auto">
                 <InstallAppButton label="Install Sakuin" variant="hero" />
              </div>
            </div>

            <div className="mt-10 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { icon: PiggyBank, title: "Goals", desc: "Pantau tabungan", color: "text-purple-600", bg: "bg-purple-100/70" },
                { icon: WalletCards, title: "Transaksi", desc: "Catat keuangan", color: "text-emerald-600", bg: "bg-emerald-100/70" },
                { icon: Smartphone, title: "Mobile-first", desc: "Nyaman di semua HP", color: "text-amber-600", bg: "bg-amber-100/70" }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl border border-slate-200/50 bg-white/50 p-3.5 shadow-sm backdrop-blur-sm">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.bg} ${item.color}`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black truncate text-slate-900">{item.title}</p>
                    <p className="text-xs font-medium truncate text-slate-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* HERO VISUAL MOCKUP */}
          <div className="mx-auto w-full max-w-md lg:ml-auto lg:max-w-lg">
            <div className="rounded-[2rem] border border-slate-200/60 bg-white/60 p-4 shadow-xl backdrop-blur-md sm:p-5">
              
              <div className="rounded-[1.5rem] bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white shadow-md sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium text-slate-400">Total Balance</p>
                    <p className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Rp 7.500.000</p>
                  </div>
                  <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-300 ring-1 ring-emerald-500/30">
                    Aman
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white/5 p-3.5 ring-1 ring-white/10">
                    <p className="text-xs font-medium text-slate-400">Income</p>
                    <p className="mt-0.5 text-sm font-black text-emerald-400">+ Rp 10 jt</p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3.5 ring-1 ring-white/10">
                    <p className="text-xs font-medium text-slate-400">Expense</p>
                    <p className="mt-0.5 text-sm font-black text-rose-400">- Rp 2,5 jt</p>
                  </div>
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200/40 bg-white/90 p-4 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Goals Aktif</p>
                  <p className="mt-0.5 text-xl font-black text-slate-900">3</p>
                </div>
                <div className="rounded-2xl border border-slate-200/40 bg-white/90 p-4 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Export Format</p>
                  <p className="mt-0.5 text-xl font-black text-slate-900">3 Jenis</p>
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-purple-100 bg-purple-50/50 p-4 shadow-sm">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 shadow-inner">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">Bantu kembangkan Sakuin</p>
                    <p className="mt-0.5 text-xs font-medium leading-relaxed text-slate-500">
                      Masukan dari pengguna membantu kami menentukan perbaikan berikutnya.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* FEEDBACK SECTION */}
        <section id="feedback" className="py-12 sm:py-16">
          <div className="grid grid-cols-1 gap-6 rounded-[2rem] border border-slate-200/60 bg-white/60 p-5 shadow-lg backdrop-blur-md sm:p-8 lg:grid-cols-[1fr_0.8fr] lg:items-center lg:gap-12">
            <div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                Punya saran, keluhan, atau ide fitur?
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
                Sakuin terus dikembangkan berdasarkan kebutuhan nyata pengguna.
                Kamu bisa membantu dengan mengisi *form feedback* singkat mengenai kenyamanan sistem.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-purple-600 px-6 text-base font-black !text-white shadow-md transition hover:bg-purple-700 sm:w-auto"
                  href={FEEDBACK_FORM_URL}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span className="text-white">Isi Form Feedback</span>
                  <ExternalLink className="ml-2 h-4 w-4 !text-white" />
                </a>
                <Link
                  className={buttonClassName({
                    variant: "secondary",
                    size: "lg",
                    className: "min-h-12 rounded-xl border border-slate-200 bg-white px-6 font-black !text-slate-800 shadow-sm transition hover:bg-slate-50 w-full sm:w-auto"
                  })}
                  to="/register"
                >
                  Coba Sakuin
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/60 bg-slate-50/80 p-5 text-center sm:p-6">
              <div className="mx-auto rounded-xl bg-white p-3 shadow-inner max-w-[14rem] border border-slate-100">
                <img
                  alt="QR Code Form Feedback Sakuin"
                  className="mx-auto aspect-square w-full object-contain"
                  loading="lazy"
                  src={FEEDBACK_QR_IMAGE_PATH}
                />
              </div>
              <h3 className="mt-4 text-sm font-black text-slate-900">Scan QR untuk memberi feedback</h3>
              <p className="mx-auto mt-1 max-w-[16rem] text-xs font-medium text-slate-500">
                Arahkan kamera HP ke QR code, atau klik tombol di atas.
              </p>
            </div>
          </div>
        </section>

        {/* FEATURES SECTION (NO HOVER FOR NON-BUTTONS) */}
        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-600">
              Fungsi Utama
            </span>
            <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Semua kebutuhan dasar pencatatan keuangan pribadi.
            </h2>
            <p className="mt-3 text-sm text-slate-500 sm:text-base">
              Fokus Sakuin adalah membuat manajemen keuangan sesederhana mungkin tanpa komplikasi alur kerja.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featureCards.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  className="rounded-2xl border border-slate-200/60 bg-white/70 p-5 shadow-sm backdrop-blur-sm"
                  key={feature.title}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-black text-slate-900">{feature.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* HOW TO USE SECTION */}
        <section className="grid grid-cols-1 gap-10 py-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:py-16">
          <div className="rounded-2xl border border-slate-200/60 bg-gradient-to-br from-slate-50 to-slate-100/50 p-6 shadow-sm sm:p-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Cara menggunakan Sakuin
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Sakuin dibuat untuk ekosistem instan. Anda tidak memerlukan konfigurasi berbelit-belit untuk memulai pelacakan keuangan harian.
            </p>
          </div>

          <div className="grid gap-3">
            {usageSteps.map((step, index) => (
              <div
                className="flex gap-4 rounded-2xl border border-slate-200/50 bg-white/60 p-4.5 shadow-sm"
                key={step.title}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white">
                  {index + 1}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">{step.title}</h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* VISION SECTION */}
        <section className="py-12 sm:py-16">
          <div className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-6 shadow-xl sm:p-10">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-purple-500/10 blur-2xl"></div>
            
            <div className="relative z-10 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Visi Sakuin
                </span>
                <h2 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
                  Membantu pengguna lebih sadar & tenang dalam mengelola uang.
                </h2>
              </div>

              <div className="grid gap-3">
                {[
                  { title: "Rapi", desc: "Transaksi dicatat dengan kategori, tanggal, dan anotasi jelas." },
                  { title: "Terkontrol", desc: "Dasbor informatif membantu mengamankan batas saldo aman harian." },
                  { title: "Bisa Dievaluasi", desc: "Ekspor berkas fleksibel memudahkan prapemrosesan di spreadsheet." }
                ].map((item, i) => (
                  <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm font-black text-white">{item.title}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="pb-16 pt-8 text-center">
          <div className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200/60 bg-white/60 p-8 shadow-md backdrop-blur-md sm:p-12">
            <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Mulai rapikan pencatatan keuanganmu hari ini.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-sm text-slate-500 sm:text-base">
              Registrasi dalam beberapa detik, pantau arus kas harian, dan kendalikan penuh sirkulasi finansial Anda.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-slate-950 px-6 text-base font-black !text-white shadow-md transition hover:bg-slate-800 sm:w-auto"
                to="/register"
              >
                <span>Buat akun gratis</span>
                <ArrowRight className="ml-2 h-4 w-4 !text-white" />
              </Link>

              <Link
                className={buttonClassName({
                  variant: "secondary",
                  size: "lg",
                  className: "min-h-12 w-full rounded-xl border border-slate-200 bg-white/80 px-6 font-black !text-slate-900 shadow-sm transition hover:bg-slate-50 sm:w-auto"
                })}
                to="/login"
              >
                Login
              </Link>
              
              <div className="w-full sm:w-auto">
                 <InstallAppButton label="Install Sakuin" variant="hero" />
              </div>
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
    path: "/asisten",
    element: (
      <ProtectedRoute>
        <AsistenPage />
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
  },
]);