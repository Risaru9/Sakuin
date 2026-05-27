import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Link, Navigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  ExternalLink,
  Loader2,
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
    <main className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="flex items-center gap-4 rounded-2xl border border-black/10 bg-white px-6 py-5 shadow-sm">
        <Loader2 className="h-6 w-6 animate-spin text-black" />
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
    <main className="min-h-screen bg-white text-black selection:bg-yellow-300">
      <section className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <header className="sticky top-4 z-50 flex items-center justify-between rounded-2xl border border-black/10 bg-white px-4 py-3 shadow-sm sm:px-5">
          <Link className="min-w-0" to="/">
            <SakuinIdentityLogo />
          </Link>
          <div className="flex shrink-0 items-center gap-2.5">
            <Link
              className={buttonClassName({
                variant: "ghost",
                size: "sm",
                className: "hidden font-semibold !text-black hover:!bg-yellow-50 sm:inline-flex"
              })}
              to="/login"
            >
              Login
            </Link>
            <Link
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-black px-5 text-sm font-semibold !text-white shadow-sm transition hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
              to="/register"
            >
              <span>Daftar</span>
              <ArrowRight className="ml-2 h-4 w-4 !text-white" />
            </Link>
          </div>
        </header>

        <section className="grid min-h-[calc(100vh-7rem)] grid-cols-1 items-center gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:py-14">
          <div className="flex flex-col items-start">
            <div className="inline-flex items-center gap-2 rounded-full border border-yellow-300 bg-yellow-100 px-3.5 py-1.5 text-xs font-bold text-black">
              <ShieldCheck className="h-4 w-4" />
              Catat uang pribadi dengan lebih sadar
            </div>

            <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-tight text-black sm:text-5xl lg:text-6xl xl:text-[4rem] xl:leading-[1.05]">
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
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-black px-6 text-base font-bold !text-white shadow-sm transition hover:bg-zinc-800 sm:w-auto"
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
                    "min-h-12 w-full rounded-xl border border-black/15 bg-yellow-100 px-6 text-base font-bold !text-black shadow-sm transition hover:bg-yellow-200 sm:w-auto"
                })}
                to="/login"
              >
                Masuk akun
              </Link>
              <div className="w-full sm:w-auto">
                <InstallAppButton
                  label="Install Sakuin"
                  variant="hero"
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-black/15 bg-white px-6 text-base font-bold text-black shadow-sm transition hover:bg-zinc-50 sm:w-auto"
                />
              </div>
            </div>

            <div className="mt-10 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
                <p className="text-2xl font-black text-black">30 detik</p>
                <p className="mt-1 text-sm font-medium text-zinc-600">
                  Cukup untuk review transaksi harian.
                </p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-yellow-100 p-4 shadow-sm">
                <p className="text-2xl font-black text-black">4 fitur</p>
                <p className="mt-1 text-sm font-medium text-zinc-700">
                  Transaksi, kategori, goals, export.
                </p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
                <p className="text-2xl font-black text-black">Mobile</p>
                <p className="mt-1 text-sm font-medium text-zinc-600">
                  Nyaman dipakai dari HP sehari-hari.
                </p>
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-md lg:ml-auto lg:max-w-lg">
            <div className="rounded-3xl border border-black bg-white p-4 shadow-[12px_12px_0_#facc15] sm:p-5">
              <div className="rounded-2xl bg-black p-5 text-white sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium text-zinc-400">Saldo bulan ini</p>
                    <p className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Rp 7.500.000</p>
                  </div>
                  <span className="rounded-full bg-yellow-300 px-2.5 py-1 text-xs font-bold text-black">
                    Terkontrol
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3.5">
                    <p className="text-xs font-medium text-zinc-400">Masuk</p>
                    <p className="mt-0.5 text-sm font-black text-yellow-300">+ Rp 10 jt</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3.5">
                    <p className="text-xs font-medium text-zinc-400">Keluar</p>
                    <p className="mt-0.5 text-sm font-black text-white">- Rp 2,5 jt</p>
                  </div>
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-black/10 bg-yellow-100 p-4">
                  <p className="text-xs font-bold uppercase text-zinc-500">Goals aktif</p>
                  <p className="mt-0.5 text-xl font-black text-slate-900">3</p>
                </div>
                <div className="rounded-2xl border border-black/10 bg-white p-4">
                  <p className="text-xs font-bold uppercase text-zinc-500">Export</p>
                  <p className="mt-0.5 text-xl font-black text-slate-900">3 Jenis</p>
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-black/10 bg-white p-4">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-300 text-black">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-black">Dibangun dari feedback</p>
                    <p className="mt-0.5 text-xs font-medium leading-relaxed text-zinc-600">
                      Masukan user dipakai untuk menentukan fitur berikutnya.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-black bg-black py-12 text-white sm:py-16">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
            <div>
              <p className="text-sm font-bold uppercase text-yellow-300">
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
              <h2 className="mt-3 text-3xl font-black tracking-tight text-black sm:text-4xl">
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
                  className="grid grid-cols-[3rem_1fr] gap-4 rounded-2xl border border-black/10 bg-white p-4 shadow-sm"
                  key={step.title}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-300 text-base font-black text-black">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-black">
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
            <span className="inline-flex items-center justify-center rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold uppercase text-black">
              Fungsi utama
            </span>
            <h2 className="mt-4 text-2xl font-black tracking-tight text-black sm:text-3xl">
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
                  className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm"
                  key={feature.title}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-300 text-black">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-black text-black">
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
          <div className="grid grid-cols-1 gap-6 rounded-3xl border border-black bg-yellow-300 p-6 shadow-[8px_8px_0_#000] sm:p-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase text-black/70">
                Keuntungan untuk user
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-black">
                Yang berubah bukan cuma catatan, tapi cara melihat uang.
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {benefits.map((benefit) => (
                <div
                  className="rounded-2xl border border-black/15 bg-white p-4"
                  key={benefit}
                >
                  <div className="flex gap-3">
                    <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-black" />
                    <p className="text-sm font-semibold leading-6 text-black">
                      {benefit}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="feedback" className="py-12 sm:py-16">
          <div className="grid grid-cols-1 gap-8 rounded-3xl border border-black/10 bg-zinc-50 p-5 shadow-sm sm:p-8 lg:grid-cols-[1fr_0.8fr] lg:items-center lg:gap-12">
            <div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-black text-yellow-300">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-2xl font-black tracking-tight text-black sm:text-3xl">
                Punya saran, keluhan, atau ide fitur?
              </h2>
              <p className="mt-3 text-sm leading-7 text-zinc-600 sm:text-base">
                Sakuin terus dikembangkan berdasarkan kebutuhan nyata pengguna.
                Feedback kamu membantu menentukan fitur mana yang paling layak
                diprioritaskan berikutnya.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-black px-6 text-base font-bold !text-white shadow-sm transition hover:bg-zinc-800 sm:w-auto"
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
                      "min-h-12 w-full rounded-xl border border-black/15 bg-yellow-100 px-6 font-bold !text-black shadow-sm transition hover:bg-yellow-200 sm:w-auto"
                  })}
                  to="/register"
                >
                  Coba Sakuin
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white p-5 text-center sm:p-6">
              <div className="mx-auto max-w-[14rem] rounded-xl border border-black/10 bg-white p-3">
                <img
                  alt="QR Code Form Feedback Sakuin"
                  className="mx-auto aspect-square w-full object-contain"
                  loading="lazy"
                  src={FEEDBACK_QR_IMAGE_PATH}
                />
              </div>
              <h3 className="mt-4 text-sm font-black text-black">
                Scan QR untuk memberi feedback
              </h3>
              <p className="mx-auto mt-1 max-w-[16rem] text-xs font-medium text-zinc-600">
                Arahkan kamera HP ke QR code, atau klik tombol di atas.
              </p>
            </div>
          </div>
        </section>

        <section className="pb-16 pt-8 text-center">
          <div className="mx-auto max-w-3xl rounded-3xl border border-black/10 bg-white p-8 shadow-sm sm:p-12">
            <h2 className="text-3xl font-black tracking-tight text-black sm:text-4xl">
              Mulai pahami keuanganmu dari transaksi hari ini.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-zinc-600 sm:text-base">
              Tidak perlu menunggu akhir bulan. Catat sedikit demi sedikit,
              lalu biarkan datanya membantu kamu mengambil keputusan.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-black px-6 text-base font-bold !text-white shadow-sm transition hover:bg-zinc-800 sm:w-auto"
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
                    "min-h-12 w-full rounded-xl border border-black/15 bg-yellow-100 px-6 font-bold !text-black shadow-sm transition hover:bg-yellow-200 sm:w-auto"
                })}
                to="/login"
              >
                Login
              </Link>

              <div className="w-full sm:w-auto">
                <InstallAppButton
                  label="Install Sakuin"
                  variant="hero"
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-black/15 bg-white px-6 text-base font-bold text-black shadow-sm transition hover:bg-zinc-50 sm:w-auto"
                />
              </div>
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
    <main className="min-h-screen bg-[#f7f5ef] px-4 py-5 text-black sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between gap-4 rounded-2xl border border-black/10 bg-white px-4 py-3 shadow-sm">
          <Link className="min-w-0" to="/">
            <SakuinIdentityLogo subtitle="Install sebagai aplikasi" />
          </Link>

          <Link
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-black px-4 text-sm font-bold text-white transition hover:bg-zinc-800"
            to="/dashboard"
          >
            Buka App
          </Link>
        </header>

        <section className="py-10 sm:py-14">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-yellow-100 px-3 py-1.5 text-xs font-black text-black">
                <Download className="h-4 w-4" />
                Installable PWA
              </span>

              <h1 className="mt-5 text-4xl font-black tracking-tight text-black sm:text-5xl">
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
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-black px-6 text-base font-bold text-white shadow-sm transition hover:bg-zinc-800"
                />
                <Link
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-black/10 bg-white px-6 text-base font-bold text-black shadow-sm transition hover:bg-yellow-50"
                  to="/register"
                >
                  Buat akun
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-black bg-yellow-300 p-5 shadow-[10px_10px_0_#000]">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-black text-yellow-300">
                    <RefreshCcw className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-black">
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
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-black" />
                      <p className="text-sm font-semibold leading-6 text-black">
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
                className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm"
                key={item.title}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-300 text-black">
                  <Icon className="h-6 w-6" />
                </div>

                <h2 className="mt-4 text-lg font-black text-black">
                  {item.title}
                </h2>
                <p className="mt-2 text-sm font-medium leading-6 text-zinc-600">
                  {item.description}
                </p>

                <ol className="mt-4 grid gap-2">
                  {item.steps.map((step, index) => (
                    <li
                      className="grid grid-cols-[1.75rem_1fr] gap-2 text-sm font-semibold leading-6 text-black"
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

export const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />
  },
  {
    path: "/install",
    element: <InstallGuidePage />
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
