import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Link, Navigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  ExternalLink,
  Loader2,
  Mail,
  MessageSquare,
  MoreVertical,
  RefreshCcw,
  ShieldCheck,
  Share2,
  Smartphone,
  Tags,
  Target,
  WalletCards
} from "lucide-react";
import { InstallAppButton } from "../components/pwa/InstallAppButton";
import { SakuinIdentityLogo } from "../components/brand/SakuinIdentityLogo";
import { buttonClassName } from "../components/ui/button";
import { ErrorBoundary } from "../components/ui/ErrorBoundary";
import { useAuth } from "../features/auth/auth-context";

const FEEDBACK_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfr2eAUDvktXBFQwBo8SkB--6AWi0K9ooIeilwLUZIVxoZLbg/viewform?usp=dialog";

const FEEDBACK_QR_IMAGE_PATH = "/image/feedback-sakuin.png";
const SUPPORT_EMAIL = "sakuinofficial@gmail.com";
const ACCOUNT_DELETION_MAILTO = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
  "Request hapus akun Sakuin"
)}&body=${encodeURIComponent(
  "Halo Sakuin,\n\nSaya ingin mengajukan penghapusan akun Sakuin.\n\nEmail akun Sakuin:\nAlasan opsional:\n\nSaya memahami bahwa tim Sakuin perlu memverifikasi kepemilikan akun sebelum menghapus data."
)}`;

const LoginPage = lazy(() =>
  import("../features/auth/pages/LoginPage").then((module) => ({
    default: module.LoginPage
  }))
);

const OAuthCallbackPage = lazy(() =>
  import("../features/auth/pages/OAuthCallbackPage").then((module) => ({
    default: module.OAuthCallbackPage
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


const AsistenPage = lazy(() =>
  import("../features/ai/pages/AsistenPage").then((module) => ({
    default: module.AsistenPage
  }))
);

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="flex items-center gap-4 rounded-2xl border border-[var(--sakuin-border)] bg-white px-6 py-5 shadow-sm">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--sakuin-text)]" />
        <p className="text-sm font-semibold tracking-wide text-zinc-600">
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
        "Input pemasukan dan pengeluaran harian tanpa spreadsheet manual."
    },
    {
      icon: Tags,
      title: "Rapikan kategori",
      description:
        "Pisahkan uang makan, transport, hiburan, tabungan, dan kebutuhan lain."
    },
    {
      icon: Target,
      title: "Pantau target",
      description:
        "Lihat progress tabungan supaya tujuan finansial tidak cuma jadi niat."
    },
    {
      icon: Download,
      title: "Export laporan",
      description:
        "Unduh data saat kamu butuh arsip, audit pribadi, atau analisis lanjutan."
    }
  ];

  const usageSteps = [
    {
      title: "Buat akun atau login",
      description:
        "Mulai dari akun pribadi agar data keuanganmu tersimpan terpisah dan aman."
    },
    {
      title: "Catat uang masuk dan keluar",
      description:
        "Masukkan nominal, kategori, tanggal, dan catatan singkat saat transaksi terjadi."
    },
    {
      title: "Baca ringkasan harian",
      description:
        "Gunakan dashboard untuk melihat saldo, pemasukan, pengeluaran, dan tren."
    },
    {
      title: "Perbaiki kebiasaan",
      description:
        "Review pola pengeluaran, set target tabungan, lalu ambil keputusan lebih sadar."
    }
  ];

  const benefits = [
    "Tidak perlu mengingat transaksi dari kepala.",
    "Lebih cepat sadar saat pengeluaran mulai bocor.",
    "Target tabungan terlihat jelas dan mudah dipantau.",
    "Data bisa diekspor saat kamu butuh laporan."
  ];

  return (
    <main className="min-h-screen bg-white text-[var(--sakuin-text)] selection:bg-[var(--sakuin-primary-soft)]">
      <section className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <header className="sticky top-4 z-50 flex items-center justify-between rounded-2xl border border-[var(--sakuin-border)] bg-white px-4 py-3 shadow-sm sm:px-5">
          <Link className="min-w-0" to="/">
            <SakuinIdentityLogo />
          </Link>
          <div className="flex shrink-0 items-center gap-2.5">
            <Link
              className={buttonClassName({
                variant: "ghost",
                size: "sm",
                className: "hidden font-semibold !text-[var(--sakuin-text)] hover:!bg-[var(--sakuin-primary-soft)] sm:inline-flex"
              })}
              to="/privacy"
            >
              Privasi
            </Link>
            <Link
              className={buttonClassName({
                variant: "ghost",
                size: "sm",
                className: "hidden font-semibold !text-[var(--sakuin-text)] hover:!bg-[var(--sakuin-primary-soft)] sm:inline-flex"
              })}
              to="/login"
            >
              Login
            </Link>
            <Link
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[var(--sakuin-secondary)] px-5 text-sm font-semibold !text-white shadow-sm transition hover:bg-[var(--sakuin-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sakuin-focus)]"
              to="/register"
            >
              <span>Daftar</span>
              <ArrowRight className="ml-2 h-4 w-4 !text-white" />
            </Link>
          </div>
        </header>

        <section className="grid min-h-[calc(100vh-7rem)] grid-cols-1 items-center gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:py-14">
          <div className="flex flex-col items-start">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--sakuin-primary)] bg-[var(--sakuin-primary-soft)] px-3.5 py-1.5 text-xs font-bold text-[var(--sakuin-text)]">
              <ShieldCheck className="h-4 w-4" />
              Catat uang pribadi dengan lebih sadar
            </div>

            <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-tight text-[var(--sakuin-text)] sm:text-5xl lg:text-6xl xl:text-[4rem] xl:leading-[1.05]">
              Sakuin membantu kamu tahu uangmu pergi ke mana.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-700 sm:text-lg">
              Sakuin adalah web app pengelola keuangan pribadi untuk mencatat
              pemasukan, pengeluaran, kategori, dan target tabungan. Tujuannya
              sederhana: membantu kamu membangun kebiasaan finansial yang rapi
              tanpa proses yang rumit.
            </p>

            <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[var(--sakuin-secondary)] px-6 text-base font-bold !text-white shadow-sm transition hover:bg-[var(--sakuin-secondary)] sm:w-auto"
                to="/register"
              >
                <span>Mulai catat sekarang</span>
                <ArrowRight className="ml-2 h-4 w-4 !text-white" />
              </Link>
              <Link
                className={buttonClassName({
                  variant: "secondary",
                  size: "lg",
                  className:
                    "min-h-12 w-full rounded-xl border border-[var(--sakuin-border)] bg-[var(--sakuin-primary-soft)] px-6 text-base font-bold !text-[var(--sakuin-text)] shadow-sm transition hover:bg-[var(--sakuin-primary-soft)] sm:w-auto"
                })}
                to="/login"
              >
                Masuk akun
              </Link>
              <div className="w-full sm:w-auto">
                <a
                  href="/downloads/sakuin.apk"
                  download="sakuin.apk"
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[var(--sakuin-border)] bg-white px-6 text-base font-bold text-[var(--sakuin-text)] shadow-sm transition hover:bg-zinc-50 sm:w-auto"
                >
                  <Download className="h-5 w-5" />
                  <span>Download Aplikasi</span>
                </a>
              </div>
            </div>

            <div className="mt-10 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[var(--sakuin-border)] bg-white p-4 shadow-sm">
                <p className="text-2xl font-black text-[var(--sakuin-text)]">30 detik</p>
                <p className="mt-1 text-sm font-medium text-zinc-600">
                  Cukup untuk review transaksi harian.
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--sakuin-border)] bg-[var(--sakuin-primary-soft)] p-4 shadow-sm">
                <p className="text-2xl font-black text-[var(--sakuin-text)]">4 fitur</p>
                <p className="mt-1 text-sm font-medium text-zinc-700">
                  Transaksi, kategori, goals, export.
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--sakuin-border)] bg-white p-4 shadow-sm">
                <p className="text-2xl font-black text-[var(--sakuin-text)]">Mobile</p>
                <p className="mt-1 text-sm font-medium text-zinc-600">
                  Nyaman dipakai dari HP sehari-hari.
                </p>
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-md lg:ml-auto lg:max-w-lg">
            <div className="rounded-3xl border border-[var(--sakuin-secondary)] bg-white p-4 shadow-[0_24px_60px_rgba(37,99,235,0.16)] sm:p-5">
              <div className="rounded-2xl bg-[var(--sakuin-secondary)] p-5 text-white sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium text-zinc-400">Saldo bulan ini</p>
                    <p className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Rp 7.500.000</p>
                  </div>
                  <span className="rounded-full bg-[var(--sakuin-primary)] px-2.5 py-1 text-xs font-bold text-white">
                    Terkontrol
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3.5">
                    <p className="text-xs font-medium text-zinc-400">Masuk</p>
                    <p className="mt-0.5 text-sm font-black text-white">+ Rp 10 jt</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3.5">
                    <p className="text-xs font-medium text-zinc-400">Keluar</p>
                    <p className="mt-0.5 text-sm font-black text-white">- Rp 2,5 jt</p>
                  </div>
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[var(--sakuin-border)] bg-[var(--sakuin-primary-soft)] p-4">
                  <p className="text-xs font-bold uppercase text-zinc-500">Goals aktif</p>
                  <p className="mt-0.5 text-xl font-black text-slate-900">3</p>
                </div>
                <div className="rounded-2xl border border-[var(--sakuin-border)] bg-white p-4">
                  <p className="text-xs font-bold uppercase text-zinc-500">Export</p>
                  <p className="mt-0.5 text-xl font-black text-slate-900">3 Jenis</p>
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-[var(--sakuin-border)] bg-white p-4">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--sakuin-primary)] text-white">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-[var(--sakuin-text)]">Dibangun dari feedback</p>
                    <p className="mt-0.5 text-xs font-medium leading-relaxed text-zinc-600">
                      Masukan user dipakai untuk menentukan fitur berikutnya.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[var(--sakuin-secondary)] bg-[var(--sakuin-secondary)] py-12 text-white sm:py-16">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
            <div>
              <p className="text-sm font-bold uppercase text-white">
                Apa itu Sakuin?
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                Tempat sederhana untuk mencatat dan memahami keuangan pribadi.
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                "Bukan aplikasi akuntansi rumit.",
                "Bukan spreadsheet yang harus dirapikan manual.",
                "Bukan sekadar catatan, tapi bahan evaluasi."
              ].map((item) => (
                <div
                  className="rounded-2xl border border-white/15 bg-white/5 p-5"
                  key={item}
                >
                  <p className="text-sm font-semibold leading-6 text-zinc-100">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-18">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <p className="text-sm font-bold uppercase text-zinc-500">
                Cara menggunakan
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-[var(--sakuin-text)] sm:text-4xl">
                Alurnya dibuat untuk kebiasaan harian, bukan pekerjaan tambahan.
              </h2>
              <p className="mt-4 text-base leading-7 text-zinc-600">
                Kamu cukup mencatat transaksi, membaca ringkasan, lalu melakukan
                evaluasi kecil. Semakin rutin dipakai, semakin jelas pola uangmu.
              </p>
            </div>

            <div className="grid gap-3">
              {usageSteps.map((step, index) => (
                <div
                  className="grid grid-cols-[3rem_1fr] gap-4 rounded-2xl border border-[var(--sakuin-border)] bg-white p-4 shadow-sm"
                  key={step.title}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--sakuin-primary)] text-base font-black text-white">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[var(--sakuin-text)]">
                      {step.title}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-zinc-600">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center justify-center rounded-full bg-[var(--sakuin-primary-soft)] px-3 py-1 text-xs font-bold uppercase text-[var(--sakuin-text)]">
              Fungsi utama
            </span>
            <h2 className="mt-4 text-2xl font-black tracking-tight text-[var(--sakuin-text)] sm:text-3xl">
              Fitur yang fokus pada masalah nyata user.
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-600 sm:text-base">
              Tidak dibuat untuk terlihat ramai. Setiap fitur membantu kamu
              mencatat, memahami, atau mengevaluasi uang pribadi.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featureCards.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  className="rounded-2xl border border-[var(--sakuin-border)] bg-white p-5 shadow-sm"
                  key={feature.title}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--sakuin-primary)] text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-black text-[var(--sakuin-text)]">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="py-12 sm:py-16">
          <div className="grid grid-cols-1 gap-6 rounded-3xl border border-[var(--sakuin-primary)] bg-[var(--sakuin-primary)] p-6 text-white shadow-[0_20px_50px_rgba(37,99,235,0.15)] sm:p-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase text-white/80">
                Keuntungan untuk user
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white">
                Yang berubah bukan cuma catatan, tapi cara melihat uang.
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {benefits.map((benefit) => (
                <div
                  className="rounded-2xl border border-[var(--sakuin-border)] bg-white p-4"
                  key={benefit}
                >
                  <div className="flex gap-3">
                    <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--sakuin-secondary)]" />
                    <p className="text-sm font-semibold leading-6 text-[var(--sakuin-text)]">
                      {benefit}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="feedback" className="py-12 sm:py-16">
          <div className="grid grid-cols-1 gap-8 rounded-3xl border border-[var(--sakuin-border)] bg-zinc-50 p-5 shadow-sm sm:p-8 lg:grid-cols-[1fr_0.8fr] lg:items-center lg:gap-12">
            <div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--sakuin-secondary)] text-white">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-2xl font-black tracking-tight text-[var(--sakuin-text)] sm:text-3xl">
                Punya saran, keluhan, atau ide fitur?
              </h2>
              <p className="mt-3 text-sm leading-7 text-zinc-600 sm:text-base">
                Sakuin terus dikembangkan berdasarkan kebutuhan nyata pengguna.
                Feedback kamu membantu menentukan fitur mana yang paling layak
                diprioritaskan berikutnya.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--sakuin-secondary)] px-6 text-base font-bold !text-white shadow-sm transition hover:bg-[var(--sakuin-secondary)] sm:w-auto"
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
                    className:
                      "min-h-12 w-full rounded-xl border border-[var(--sakuin-border)] bg-[var(--sakuin-primary-soft)] px-6 font-bold !text-[var(--sakuin-text)] shadow-sm transition hover:bg-[var(--sakuin-primary-soft)] sm:w-auto"
                  })}
                  to="/register"
                >
                  Coba Sakuin
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--sakuin-border)] bg-white p-5 text-center sm:p-6">
              <div className="mx-auto max-w-[14rem] rounded-xl border border-[var(--sakuin-border)] bg-white p-3">
                <img
                  alt="QR Code Form Feedback Sakuin"
                  className="mx-auto aspect-square w-full object-contain"
                  loading="lazy"
                  src={FEEDBACK_QR_IMAGE_PATH}
                />
              </div>
              <h3 className="mt-4 text-sm font-black text-[var(--sakuin-text)]">
                Scan QR untuk memberi feedback
              </h3>
              <p className="mx-auto mt-1 max-w-[16rem] text-xs font-medium text-zinc-600">
                Arahkan kamera HP ke QR code, atau klik tombol di atas.
              </p>
            </div>
          </div>
        </section>

        <section className="pb-16 pt-8 text-center">
          <div className="mx-auto max-w-3xl rounded-3xl border border-[var(--sakuin-border)] bg-white p-8 shadow-sm sm:p-12">
            <h2 className="text-3xl font-black tracking-tight text-[var(--sakuin-text)] sm:text-4xl">
              Mulai pahami keuanganmu dari transaksi hari ini.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-zinc-600 sm:text-base">
              Tidak perlu menunggu akhir bulan. Catat sedikit demi sedikit,
              lalu biarkan datanya membantu kamu mengambil keputusan.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[var(--sakuin-secondary)] px-6 text-base font-bold !text-white shadow-sm transition hover:bg-[var(--sakuin-secondary)] sm:w-auto"
                to="/register"
              >
                <span>Buat akun gratis</span>
                <ArrowRight className="ml-2 h-4 w-4 !text-white" />
              </Link>

              <Link
                className={buttonClassName({
                  variant: "secondary",
                  size: "lg",
                  className:
                    "min-h-12 w-full rounded-xl border border-[var(--sakuin-border)] bg-[var(--sakuin-primary-soft)] px-6 font-bold !text-[var(--sakuin-text)] shadow-sm transition hover:bg-[var(--sakuin-primary-soft)] sm:w-auto"
                })}
                to="/login"
              >
                Login
              </Link>

              <div className="w-full sm:w-auto">
                <a
                  href="/downloads/sakuin.apk"
                  download="sakuin.apk"
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[var(--sakuin-border)] bg-white px-6 text-base font-bold text-[var(--sakuin-text)] shadow-sm transition hover:bg-zinc-50 sm:w-auto"
                >
                  <Download className="h-5 w-5" />
                  <span>Download Aplikasi</span>
                </a>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-zinc-500">
              <Link className="hover:text-[var(--sakuin-text)]" to="/privacy">
                Kebijakan Privasi
              </Link>
              <span aria-hidden="true">.</span>
              <Link className="hover:text-[var(--sakuin-text)]" to="/account-deletion">
                Hapus Akun
              </Link>
              <span aria-hidden="true">.</span>
              <Link className="hover:text-[var(--sakuin-text)]" to="/install">
                Install Sakuin
              </Link>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function InstallGuidePage() {
  const installSteps = [
    {
      icon: Smartphone,
      title: "Android Chrome atau Edge",
      description:
        "Tap tombol Install Sakuin. Jika dialog tidak muncul, buka menu browser lalu pilih Install app atau Add to Home screen.",
      steps: ["Buka sakuin-web.vercel.app", "Tap menu tiga titik", "Pilih Install app", "Buka Sakuin dari home screen"]
    },
    {
      icon: Share2,
      title: "iPhone atau iPad",
      description:
        "iOS biasanya memakai jalur Share dari Safari. Setelah ditambahkan, Sakuin akan tampil seperti aplikasi di home screen.",
      steps: ["Buka Sakuin di Safari", "Tap tombol Share", "Pilih Add to Home Screen", "Tap Add"]
    },
    {
      icon: MoreVertical,
      title: "Laptop atau desktop",
      description:
        "Chrome dan Edge dapat memasang Sakuin sebagai app window terpisah, tanpa tab browser yang mengganggu.",
      steps: ["Buka Sakuin di Chrome/Edge", "Klik ikon install di address bar atau menu", "Pilih Install", "Pin app bila perlu"]
    }
  ];

  return (
    <main className="min-h-screen bg-[var(--sakuin-bg)] px-4 py-5 text-[var(--sakuin-text)] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--sakuin-border)] bg-white px-4 py-3 shadow-sm">
          <Link className="min-w-0" to="/">
            <SakuinIdentityLogo subtitle="Install sebagai aplikasi" />
          </Link>

          <Link
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[var(--sakuin-secondary)] px-4 text-sm font-bold text-white transition hover:bg-[var(--sakuin-secondary)]"
            to="/dashboard"
          >
            Buka App
          </Link>
        </header>

        <section className="py-10 sm:py-14">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--sakuin-border)] bg-[var(--sakuin-primary-soft)] px-3 py-1.5 text-xs font-black text-[var(--sakuin-text)]">
                <Download className="h-4 w-4" />
                Installable PWA
              </span>

              <h1 className="mt-5 text-4xl font-black tracking-tight text-[var(--sakuin-text)] sm:text-5xl">
                Pakai Sakuin seperti aplikasi mobile.
              </h1>

              <p className="mt-4 text-base font-medium leading-8 text-zinc-700">
                Setelah diinstall, Sakuin bisa dibuka dari home screen atau daftar
                aplikasi. Update fitur tetap masuk otomatis dari web, jadi user
                tidak perlu install ulang berkali-kali.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <InstallAppButton
                  label="Install Sakuin"
                  fallbackToGuide={false}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--sakuin-secondary)] px-6 text-base font-bold text-white shadow-sm transition hover:bg-[var(--sakuin-secondary)]"
                />
                <Link
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--sakuin-border)] bg-white px-6 text-base font-bold text-[var(--sakuin-text)] shadow-sm transition hover:bg-[var(--sakuin-primary-soft)]"
                  to="/register"
                >
                  Buat akun
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--sakuin-secondary)] bg-[var(--sakuin-primary)] p-5 shadow-[0_22px_55px_rgba(37,99,235,0.16)]">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--sakuin-secondary)] text-white">
                    <RefreshCcw className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-[var(--sakuin-text)]">
                      Bagaimana update fitur bekerja?
                    </h2>
                    <p className="mt-2 text-sm font-medium leading-6 text-zinc-700">
                      Sakuin mengecek versi baru saat app dibuka kembali. Jika
                      update siap, app menampilkan tombol update. User cukup tap
                      tombol itu atau membuka ulang app.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  {[
                    "Tidak perlu uninstall dan install ulang untuk update fitur web.",
                    "Perubahan besar tetap diuji lewat build sebelum dipush.",
                    "Jika offline, Sakuin menampilkan fallback sampai koneksi kembali."
                  ].map((item) => (
                    <div className="flex items-start gap-3" key={item}>
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--sakuin-text)]" />
                      <p className="text-sm font-semibold leading-6 text-[var(--sakuin-text)]">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 pb-12 lg:grid-cols-3">
          {installSteps.map((item) => {
            const Icon = item.icon;

            return (
              <article
                className="rounded-3xl border border-[var(--sakuin-border)] bg-white p-5 shadow-sm"
                key={item.title}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--sakuin-primary)] text-white">
                  <Icon className="h-6 w-6" />
                </div>

                <h2 className="mt-4 text-lg font-black text-[var(--sakuin-text)]">
                  {item.title}
                </h2>
                <p className="mt-2 text-sm font-medium leading-6 text-zinc-600">
                  {item.description}
                </p>

                <ol className="mt-4 grid gap-2">
                  {item.steps.map((step, index) => (
                    <li
                      className="grid grid-cols-[1.75rem_1fr] gap-2 text-sm font-semibold leading-6 text-[var(--sakuin-text)]"
                      key={step}
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-xs font-black">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}

function PrivacyPolicyPage() {
  const dataItems = [
    "Nama dan email akun.",
    "Data transaksi seperti nominal, tipe, kategori, tanggal, dan catatan.",
    "Kategori, goals tabungan, dan safe balance limit.",
    "Pengaturan reminder dan subscription notifikasi jika diaktifkan.",
    "Prompt yang dikirim ke Asisten Sakuin untuk menjawab konteks finansial.",
    "Data teknis dasar seperti request ID dan waktu request untuk keamanan."
  ];

  const userControls = [
    "Mengubah profile dan safe balance limit.",
    "Membuat, mengubah, dan menghapus transaksi.",
    "Mengelola kategori dan goals.",
    "Mematikan reminder dari Profile.",
    "Mengekspor transaksi saat dibutuhkan.",
    "Meminta penghapusan akun melalui halaman request hapus akun.",
    "Logout dari perangkat yang digunakan."
  ];

  const securityPrinciples = [
    "Password tidak disimpan dalam bentuk plain text.",
    "Endpoint private membutuhkan autentikasi.",
    "Data user dipisahkan berdasarkan akun.",
    "Log tidak boleh menyimpan password, token, atau detail finansial sensitif secara mentah.",
    "Draft transaksi dari AI harus direview user sebelum disimpan."
  ];

  return (
    <main className="min-h-screen bg-white px-4 py-5 text-[var(--sakuin-text)] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--sakuin-border)] bg-white px-4 py-3 shadow-sm">
          <Link className="min-w-0" to="/">
            <SakuinIdentityLogo subtitle="Kebijakan privasi" />
          </Link>

          <Link
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[var(--sakuin-secondary)] px-4 text-sm font-bold text-white transition hover:bg-[var(--sakuin-secondary)]"
            to="/dashboard"
          >
            Buka App
          </Link>
        </header>

        <section className="py-10 sm:py-14">
          <div className="rounded-3xl border border-[var(--sakuin-primary)] bg-[var(--sakuin-primary)] p-6 text-white shadow-[0_20px_50px_rgba(37,99,235,0.15)] sm:p-8">
            <p className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-[var(--sakuin-text)] ring-1 ring-[var(--sakuin-border)]">
              Privacy Policy
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight text-white sm:text-5xl">
              Kebijakan Privasi Sakuin
            </h1>
            <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-white/85 sm:text-base">
              Sakuin memproses data yang kamu masukkan untuk menjalankan fitur
              pencatatan transaksi, dashboard, goals, reminder, export, dan
              Asisten Sakuin. Dokumen ini menjelaskan data apa yang digunakan
              dan untuk apa.
            </p>
            <p className="mt-4 text-xs font-black uppercase text-white/75">
              Berlaku sejak 27 Mei 2026
            </p>
          </div>
        </section>

        <div className="grid gap-5 pb-14 lg:grid-cols-[0.85fr_1.15fr]">
          <aside className="space-y-5">
            <section className="rounded-3xl border border-[var(--sakuin-border)] bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-[var(--sakuin-text)]">Ringkasan</h2>
              <p className="mt-2 text-sm font-medium leading-7 text-zinc-600">
                Sakuin menggunakan data pribadi dan data keuanganmu hanya untuk
                menjalankan fitur aplikasi. Sakuin tidak dirancang untuk menjual
                profil finansial user.
              </p>
            </section>

            <section className="rounded-3xl border border-[var(--sakuin-border)] bg-[var(--sakuin-primary-soft)] p-5 shadow-sm">
              <h2 className="text-lg font-black text-[var(--sakuin-text)]">Kontrol User</h2>
              <ul className="mt-3 grid gap-2">
                {userControls.map((item) => (
                  <li
                    className="flex gap-2 text-sm font-semibold leading-6 text-zinc-700"
                    key={item}
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--sakuin-text)]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          </aside>

          <div className="space-y-5">
            <section className="rounded-3xl border border-[var(--sakuin-border)] bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-xl font-black text-[var(--sakuin-text)]">
                Data yang Diproses
              </h2>
              <ul className="mt-4 grid gap-3">
                {dataItems.map((item) => (
                  <li className="flex gap-3" key={item}>
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--sakuin-primary)] ring-1 ring-[var(--sakuin-border)]" />
                    <p className="text-sm font-medium leading-7 text-zinc-600">
                      {item}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-3xl border border-[var(--sakuin-border)] bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-xl font-black text-[var(--sakuin-text)]">
                Tujuan Penggunaan Data
              </h2>
              <p className="mt-3 text-sm font-medium leading-7 text-zinc-600">
                Data digunakan untuk membuat akun, menyimpan transaksi,
                menampilkan dashboard, mengelola goals, mengirim reminder jika
                kamu mengaktifkannya, menjalankan export, dan membantu Asisten
                Sakuin membaca konteks finansial pribadi.
              </p>
            </section>

            <section className="rounded-3xl border border-[var(--sakuin-border)] bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-xl font-black text-[var(--sakuin-text)]">Asisten Sakuin</h2>
              <p className="mt-3 text-sm font-medium leading-7 text-zinc-600">
                Asisten Sakuin hanya ditujukan untuk membantu membaca kondisi
                keuangan pribadi di Sakuin. Asisten bukan pengganti nasihat
                investasi, pajak, pinjaman, hukum, atau profesional lain.
                Draft transaksi dari AI tidak disimpan otomatis dan harus
                direview user terlebih dahulu.
              </p>
            </section>

            <section className="rounded-3xl border border-[var(--sakuin-border)] bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-xl font-black text-[var(--sakuin-text)]">
                Keamanan dan Penyimpanan
              </h2>
              <ul className="mt-4 grid gap-3">
                {securityPrinciples.map((item) => (
                  <li className="flex gap-3" key={item}>
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--sakuin-text)]" />
                    <p className="text-sm font-medium leading-7 text-zinc-600">
                      {item}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-3xl border border-[var(--sakuin-border)] bg-zinc-50 p-5 shadow-sm sm:p-6">
              <h2 className="text-xl font-black text-[var(--sakuin-text)]">Catatan</h2>
              <p className="mt-3 text-sm font-medium leading-7 text-zinc-600">
                Kebijakan ini dapat diperbarui ketika fitur Sakuin berubah,
                terutama jika ada perubahan pada AI, notifikasi, integrasi pihak
                ketiga, atau distribusi mobile app.
              </p>
              <Link
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--sakuin-border)] bg-white px-4 text-sm font-bold text-[var(--sakuin-text)] shadow-sm transition hover:bg-[var(--sakuin-primary-soft)]"
                to="/account-deletion"
              >
                Ajukan penghapusan akun
              </Link>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function AccountDeletionPage() {
  const deletionSteps = [
    "Buka halaman ini atau link dari Profile.",
    "Kirim email memakai alamat akun Sakuin yang ingin dihapus.",
    "Tim Sakuin akan memverifikasi kepemilikan akun sebelum memproses request.",
    "Setelah valid, data akun dan data aplikasi terkait akan diproses untuk penghapusan sesuai kebijakan."
  ];

  const requestDetails = [
    "Email akun Sakuin yang ingin dihapus.",
    "Nama akun jika masih diingat.",
    "Konfirmasi bahwa kamu memahami akses akun akan hilang setelah data dihapus.",
    "Alasan penghapusan jika ingin memberi masukan, tetapi ini opsional."
  ];

  const deletedData = [
    "Profile akun seperti nama dan email.",
    "Transaksi, kategori custom, goals, dan safe balance limit.",
    "Pengaturan reminder dan push subscription yang terkait akun.",
    "Data aplikasi lain yang terkait langsung dengan akun Sakuin."
  ];

  return (
    <main className="min-h-screen bg-[var(--sakuin-bg)] px-4 py-5 text-[var(--sakuin-text)] sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--sakuin-border)] bg-white px-4 py-3 shadow-sm">
          <Link className="min-w-0" to="/">
            <SakuinIdentityLogo subtitle="Penghapusan akun" />
          </Link>

          <Link
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[var(--sakuin-secondary)] px-4 text-sm font-bold text-white transition hover:bg-[var(--sakuin-secondary)]"
            to="/profile"
          >
            Buka Profile
          </Link>
        </header>

        <section className="py-10 sm:py-14">
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div className="rounded-3xl border border-[var(--sakuin-primary)] bg-[var(--sakuin-primary)] p-6 text-white shadow-[0_20px_50px_rgba(37,99,235,0.15)] sm:p-8">
              <p className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-[var(--sakuin-text)] ring-1 ring-[var(--sakuin-border)]">
                Account Deletion
              </p>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">
                Request hapus akun Sakuin.
              </h1>
              <p className="mt-4 text-sm font-semibold leading-7 text-white/85 sm:text-base">
                User dapat meminta penghapusan akun dan data aplikasi yang
                terhubung dengan akun Sakuin. Untuk menjaga keamanan, request
                perlu diverifikasi dari email akun yang ingin dihapus.
              </p>

              <a
                className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[var(--sakuin-secondary)] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--sakuin-secondary)] sm:w-auto"
                href={ACCOUNT_DELETION_MAILTO}
              >
                <Mail className="mr-2 h-4 w-4 text-white" />
                Kirim request hapus akun
              </a>

              <p className="mt-4 text-xs font-bold leading-5 text-white/75">
                Email support: {SUPPORT_EMAIL}
              </p>
              <p className="mt-2 text-xs font-semibold leading-5 text-white/75">
                Estimasi awal respons: 3-7 hari kerja setelah request diterima.
              </p>
            </div>

            <div className="space-y-5">
              <section className="rounded-3xl border border-[var(--sakuin-border)] bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-xl font-black text-[var(--sakuin-text)]">
                  Cara mengajukan
                </h2>
                <ol className="mt-4 grid gap-3">
                  {deletionSteps.map((step, index) => (
                    <li className="grid grid-cols-[2rem_1fr] gap-3" key={step}>
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--sakuin-primary)] text-sm font-black text-white ring-1 ring-[var(--sakuin-border)]">
                        {index + 1}
                      </span>
                      <p className="text-sm font-medium leading-7 text-zinc-700">
                        {step}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>

              <section className="rounded-3xl border border-[var(--sakuin-border)] bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-xl font-black text-[var(--sakuin-text)]">
                  Yang perlu dicantumkan
                </h2>
                <ul className="mt-4 grid gap-3">
                  {requestDetails.map((item) => (
                    <li className="flex gap-3" key={item}>
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--sakuin-primary)] ring-1 ring-[var(--sakuin-border)]" />
                      <p className="text-sm font-medium leading-7 text-zinc-700">
                        {item}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-3xl border border-[var(--sakuin-border)] bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-xl font-black text-[var(--sakuin-text)]">
                  Data yang diproses untuk dihapus
                </h2>
                <ul className="mt-4 grid gap-3">
                  {deletedData.map((item) => (
                    <li className="flex gap-3" key={item}>
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--sakuin-text)]" />
                      <p className="text-sm font-medium leading-7 text-zinc-700">
                        {item}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-3xl border border-[var(--sakuin-border)] bg-zinc-50 p-5 shadow-sm sm:p-6">
                <h2 className="text-xl font-black text-[var(--sakuin-text)]">
                  Catatan keamanan
                </h2>
                <p className="mt-3 text-sm font-medium leading-7 text-zinc-600">
                  Sakuin dapat menyimpan data terbatas untuk kebutuhan keamanan,
                  pencegahan penyalahgunaan, audit, atau kewajiban legal jika
                  diperlukan. Jika ada data yang tidak dapat langsung dihapus,
                  user akan diberi penjelasan melalui proses support.
                </p>
              </section>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <GuestRoute>
        <HomePage />
      </GuestRoute>
    )
  },
  {
    path: "/install",
    element: <InstallGuidePage />
  },
  {
    path: "/privacy",
    element: <PrivacyPolicyPage />
  },
  {
    path: "/account-deletion",
    element: <AccountDeletionPage />
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
    path: "/oauth-callback",
    element: <OAuthCallbackPage />
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
        <ErrorBoundary fallbackText="Asisten Sakuin sedang tidak aktif" fallbackSubtitle="Terjadi kendala sistem saat memuat fitur Asisten. Anda tetap dapat mencatat transaksi secara manual.">
          <AsistenPage />
        </ErrorBoundary>
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
    path: "*",
    element: <Navigate to="/" replace />
  },
]);
