import { lazy, Suspense, type ReactNode } from "react";
import {
  createBrowserRouter,
  Link,
  Navigate,
  useRouteError,
  useSearchParams
} from "react-router-dom";
import {
  CheckCircle2,
  Download,
  ExternalLink,
  Loader2,
  Mail,
  MoreVertical,
  RefreshCcw,
  ShieldCheck,
  Share2,
  Smartphone
} from "lucide-react";
import { InstallAppButton } from "../components/pwa/InstallAppButton";
import { SakuinIdentityLogo } from "../components/brand/SakuinIdentityLogo";
import { ErrorBoundary } from "../components/ui/ErrorBoundary";
import { useAuth } from "../features/auth/auth-context";

const SUPPORT_EMAIL = "sakuinofficial@gmail.com";
const ACCOUNT_DELETION_MAILTO = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
  "Request hapus akun Sakuin"
)}&body=${encodeURIComponent(
  "Halo Sakuin,\n\nSaya ingin mengajukan penghapusan akun Sakuin.\n\nEmail akun Sakuin:\nAlasan opsional:\n\nSaya memahami bahwa tim Sakuin perlu memverifikasi kepemilikan akun sebelum menghapus data."
)}`;
const APK_DOWNLOAD_PATH = "/downloads/sakuin.apk";

const LandingPage = lazy(() =>
  import("../features/landing/LandingPage").then((module) => ({
    default: module.LandingPage
  }))
);

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

const BerandaPage = lazy(() =>
  import("../features/beranda/BerandaPage").then((module) => ({
    default: module.BerandaPage
  }))
);

const SearchPage = lazy(() =>
  import("../features/beranda/SearchPage").then((module) => ({
    default: module.SearchPage
  }))
);

const LaporanPage = lazy(() =>
  import("../features/laporan/LaporanPage").then((module) => ({
    default: module.LaporanPage
  }))
);

const LainnyaPage = lazy(() =>
  import("../features/lainnya/LainnyaPage").then((module) => ({
    default: module.LainnyaPage
  }))
);

const RekeningPage = lazy(() =>
  import("../features/lainnya/RekeningPage").then((module) => ({
    default: module.RekeningPage
  }))
);

const KategoriPage = lazy(() =>
  import("../features/lainnya/KategoriPage").then((module) => ({
    default: module.KategoriPage
  }))
);

const BerulangPage = lazy(() =>
  import("../features/lainnya/BerulangPage").then((module) => ({
    default: module.BerulangPage
  }))
);

const PengingatPage = lazy(() =>
  import("../features/lainnya/PengingatPage").then((module) => ({
    default: module.PengingatPage
  }))
);

const AkunPage = lazy(() =>
  import("../features/lainnya/AkunPage").then((module) => ({
    default: module.AkunPage
  }))
);

const TargetPage = lazy(() =>
  import("../features/lainnya/TargetPage").then((module) => ({
    default: module.TargetPage
  }))
);

const ExportPage = lazy(() =>
  import("../features/lainnya/ExportPage").then((module) => ({
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

// Development-only previews; the ternaries let the production build drop the chunks.
const SakuPlaygroundPage = import.meta.env.DEV
  ? lazy(() =>
      import("../features/dev/SakuPlaygroundPage").then((module) => ({
        default: module.SakuPlaygroundPage
      }))
    )
  : null;

const BerandaPreviewPage = import.meta.env.DEV
  ? lazy(() =>
      import("../features/dev/BerandaPreviewPage").then((module) => ({
        default: module.BerandaPreviewPage
      }))
    )
  : null;

const SearchPreviewPage = import.meta.env.DEV
  ? lazy(() =>
      import("../features/dev/BerandaPreviewPage").then((module) => ({
        default: module.SearchPreviewPage
      }))
    )
  : null;

const LaporanPreviewPage = import.meta.env.DEV
  ? lazy(() =>
      import("../features/dev/BerandaPreviewPage").then((module) => ({
        default: module.LaporanPreviewPage
      }))
    )
  : null;

const LainnyaPreviewPage = import.meta.env.DEV
  ? lazy(() =>
      import("../features/dev/BerandaPreviewPage").then((module) => ({
        default: module.LainnyaPreviewPage
      }))
    )
  : null;

const LainnyaSectionPreviewPage = import.meta.env.DEV
  ? lazy(() =>
      import("../features/dev/BerandaPreviewPage").then((module) => ({
        default: module.LainnyaSectionPreviewPage
      }))
    )
  : null;

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--sakuin-bg)] px-4">
      <div className="sakuin-enter flex items-center gap-4 rounded-3xl border border-[var(--sakuin-border)] bg-white px-6 py-5 shadow-[0_18px_45px_rgba(37,99,235,0.12)]">
        <span className="sakuin-pulse-ring flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--sakuin-primary)] text-white">
          <Loader2 className="h-5 w-5 animate-spin text-white" />
        </span>
        <div>
          <p className="text-sm font-black tracking-wide text-[var(--sakuin-text)]">
            Memuat Sakuin
          </p>
          <p className="mt-0.5 text-xs font-semibold text-zinc-500">
            Menyiapkan data keuanganmu...
          </p>
        </div>
      </div>
    </main>
  );
}

function PageSuspense({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LoadingScreen />}>{children}</Suspense>;
}

function RouteErrorFallback() {
  const error = useRouteError();

  console.error("[RouteErrorFallback] Terjadi error route:", error);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--sakuin-bg)] px-4 py-8 text-[var(--sakuin-text)]">
      <section className="w-full max-w-md rounded-3xl border border-[var(--sakuin-border)] bg-white p-6 text-center shadow-[0_22px_55px_rgba(37,99,235,0.14)] sm:p-7">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
          <RefreshCcw className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-xl font-black tracking-tight text-[var(--sakuin-text)]">
          Sakuin perlu dimuat ulang
        </h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-zinc-600">
          Ada bagian aplikasi yang belum terbaca sempurna. Muat ulang halaman
          untuk mengambil versi terbaru.
        </p>
        <button
          className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--sakuin-secondary)] px-4 text-sm font-black text-white shadow-sm transition hover:bg-[var(--sakuin-primary)]"
          onClick={() => window.location.reload()}
          type="button"
        >
          Muat Ulang
        </button>
        <Link
          className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[var(--sakuin-border)] bg-white px-4 text-sm font-black text-[var(--sakuin-text)] shadow-sm transition hover:bg-[var(--sakuin-primary-soft)]"
          to="/dashboard"
        >
          Kembali ke Catatan
        </Link>
      </section>
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
                <a
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--sakuin-secondary)] bg-[var(--sakuin-primary-soft)] px-6 text-base font-bold text-[var(--sakuin-text)] shadow-sm transition hover:bg-[var(--sakuin-primary)]"
                  download="sakuin.apk"
                  href={APK_DOWNLOAD_PATH}
                >
                  <Download className="h-5 w-5" />
                  Download APK Android
                </a>
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

function EmailImportCallbackPage() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get("emailImport") ?? searchParams.get("status");
  const message = searchParams.get("message");
  const isConnected = status === "connected";
  const appUrl = `com.sakuin.app://email-import?status=${encodeURIComponent(
    isConnected ? "connected" : "error"
  )}${message ? `&message=${encodeURIComponent(message)}` : ""}`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--sakuin-bg)] px-4 py-8 text-[var(--sakuin-text)]">
      <section className="w-full max-w-md rounded-3xl border border-[var(--sakuin-border)] bg-white p-5 text-center shadow-[0_22px_55px_rgba(37,99,235,0.14)] sm:p-7">
        <div
          className={[
            "mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-white",
            isConnected ? "bg-emerald-600" : "bg-rose-600"
          ].join(" ")}
        >
          {isConnected ? (
            <CheckCircle2 className="h-7 w-7" />
          ) : (
            <ExternalLink className="h-7 w-7" />
          )}
        </div>

        <h1 className="mt-5 text-2xl font-black tracking-tight text-[var(--sakuin-text)]">
          {isConnected ? "Gmail berhasil terhubung" : "Koneksi Gmail gagal"}
        </h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-zinc-600">
          {isConnected
            ? "Sakuin siap mendeteksi email transaksi m-banking dan memetakannya ke rekening bank yang sesuai."
            : message ?? "Kembali ke Sakuin lalu coba hubungkan Gmail kembali."}
        </p>

        <div className="mt-6 grid gap-2">
          <a
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--sakuin-secondary)] px-4 text-sm font-black text-white shadow-sm transition hover:bg-[var(--sakuin-primary)]"
            href={appUrl}
          >
            Buka aplikasi Sakuin
          </a>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--sakuin-border)] bg-white px-4 text-sm font-black text-[var(--sakuin-text)] shadow-sm transition hover:bg-[var(--sakuin-primary-soft)]"
            to="/profile?section=automation"
          >
            Buka Otomasi M-Banking
          </Link>
        </div>

        <p className="mt-4 text-xs font-bold leading-5 text-zinc-500">
          Data dan backend fitur tetap disimpan agar bisa dilanjutkan lagi nanti.
        </p>
      </section>
    </main>
  );
}

// Old Profile links: only the Gmail section still lives there; the rest moved under Lainnya.
function ProfileRedirect() {
  const [searchParams] = useSearchParams();
  const section = searchParams.get("section");

  if (section === "automation") {
    return (
      <ProtectedRoute>
        <ProfilePage />
      </ProtectedRoute>
    );
  }

  return <Navigate replace to={section === "notifications" ? "/lainnya/pengingat" : "/lainnya/akun"} />;
}

const routes = [
  {
    path: "/",
    element: (
      <GuestRoute>
        <LandingPage />
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
    path: "/email-import/callback",
    element: <EmailImportCallbackPage />
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
        <BerandaPage />
      </ProtectedRoute>
    )
  },
  {
    path: "/cari",
    element: (
      <ProtectedRoute>
        <SearchPage />
      </ProtectedRoute>
    )
  },
  {
    path: "/laporan",
    element: (
      <ProtectedRoute>
        <LaporanPage />
      </ProtectedRoute>
    )
  },
  {
    path: "/lainnya",
    element: (
      <ProtectedRoute>
        <LainnyaPage />
      </ProtectedRoute>
    )
  },
  {
    path: "/lainnya/rekening",
    element: (
      <ProtectedRoute>
        <RekeningPage />
      </ProtectedRoute>
    )
  },
  {
    path: "/lainnya/target",
    element: (
      <ProtectedRoute>
        <TargetPage />
      </ProtectedRoute>
    )
  },
  {
    path: "/lainnya/berulang",
    element: (
      <ProtectedRoute>
        <BerulangPage />
      </ProtectedRoute>
    )
  },
  {
    path: "/lainnya/pengingat",
    element: (
      <ProtectedRoute>
        <PengingatPage />
      </ProtectedRoute>
    )
  },
  {
    path: "/lainnya/export",
    element: (
      <ProtectedRoute>
        <ExportPage />
      </ProtectedRoute>
    )
  },
  {
    path: "/lainnya/akun",
    element: (
      <ProtectedRoute>
        <AkunPage />
      </ProtectedRoute>
    )
  },
  {
    path: "/lainnya/kategori",
    element: (
      <ProtectedRoute>
        <KategoriPage />
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
    // The transaction list now lives on Beranda; keep old links and bookmarks working.
    path: "/transactions",
    element: <Navigate to="/dashboard" replace />
  },
  {
    path: "/goals",
    element: <Navigate to="/lainnya/target" replace />
  },
  {
    path: "/export",
    element: <Navigate to="/lainnya/export" replace />
  },
  {
    path: "/profile",
    element: <ProfileRedirect />
  },

  ...(SakuPlaygroundPage &&
  BerandaPreviewPage &&
  SearchPreviewPage &&
  LaporanPreviewPage &&
  LainnyaPreviewPage &&
  LainnyaSectionPreviewPage
    ? [
        {
          path: "/dev/saku",
          element: (
            <PageSuspense>
              <SakuPlaygroundPage />
            </PageSuspense>
          )
        },
        {
          path: "/dev/beranda",
          element: (
            <PageSuspense>
              <BerandaPreviewPage />
            </PageSuspense>
          )
        },
        {
          path: "/dev/cari",
          element: (
            <PageSuspense>
              <SearchPreviewPage />
            </PageSuspense>
          )
        },
        {
          path: "/dev/laporan",
          element: (
            <PageSuspense>
              <LaporanPreviewPage />
            </PageSuspense>
          )
        },
        {
          path: "/dev/lainnya",
          element: (
            <PageSuspense>
              <LainnyaPreviewPage />
            </PageSuspense>
          )
        },
        {
          path: "/dev/lainnya/:section",
          element: (
            <PageSuspense>
              <LainnyaSectionPreviewPage />
            </PageSuspense>
          )
        }
      ]
    : []),

  {
    path: "*",
    element: <Navigate to="/" replace />
  },
] satisfies Parameters<typeof createBrowserRouter>[0];

export const router = createBrowserRouter(
  routes.map((route) => ({
    errorElement: <RouteErrorFallback />,
    ...route
  }))
);
