import { Link } from "react-router-dom";
import { BarChart3, Download, MessageCircleHeart, Smartphone, Target, Wallet, type LucideIcon } from "lucide-react";
import { CategoryBadge, SakuMascot, SakuSparkle } from "../../components/saku";

export const FEEDBACK_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfr2eAUDvktXBFQwBo8SkB--6AWi0K9ooIeilwLUZIVxoZLbg/viewform?usp=dialog";
export const SUPPORT_EMAIL = "sakuinofficial@gmail.com";

const APK_PATH = "/downloads/sakuin.apk?v=19";

const FEATURES: Array<{ Icon: LucideIcon; tint: string; title: string; text: string }> = [
  { Icon: Wallet, tint: "#fff0b3", title: "Catat satu baris", text: "Ketik \"kopi 18rb\", tekan Enter. Kategori ditebak otomatis." },
  { Icon: BarChart3, tint: "#d6e4ff", title: "Laporan yang jelas", text: "Uangmu habis di mana, dibanding bulan lalu, dalam satu layar." },
  { Icon: Target, tint: "#d4f5e0", title: "Batas dan target", text: "Pasang batas belanja per kategori dan pantau tabunganmu." },
  { Icon: MessageCircleHeart, tint: "#ffd6e6", title: "Tanya Saku", text: "Tanya boleh tidaknya beli sesuatu, dijawab dari catatanmu." }
];

const INSTALL_STEPS = [
  "Ketuk \"Download aplikasi Android\" di atas.",
  "Buka file sakuin.apk, lalu izinkan pemasangan kalau HP bertanya.",
  "Buka Sakuin, masuk atau buat akun, dan mulai mencatat."
];

const PRIMARY_LINK =
  "saku-line saku-press inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-saku-accent px-6 font-saku-head text-lg font-semibold text-white shadow-saku focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30";
const SECONDARY_LINK =
  "saku-line saku-press inline-flex min-h-13 w-full items-center justify-center rounded-full bg-saku-paper px-6 font-saku-head text-lg font-semibold shadow-saku focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30";

/** Public front page: what Sakuin is, the APK download, and the way into the app. */
export function LandingPage() {
  return (
    <main className="min-h-[100dvh] bg-saku-bg font-saku-body text-saku-ink">
      <div className="mx-auto w-full max-w-xl px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-10">
        <header className="flex items-center justify-between">
          <Link className="flex items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30" to="/">
            <span className="saku-line-thin flex size-10 items-end justify-center overflow-hidden rounded-full bg-saku-coin-soft">
              <SakuMascot size={36} />
            </span>
            <span className="font-saku-head text-2xl font-semibold">Sakuin</span>
          </Link>
          <Link className="saku-line-thin saku-press inline-flex min-h-11 items-center rounded-full bg-saku-paper px-4 text-sm font-black shadow-saku-xs" to="/login">
            Masuk
          </Link>
        </header>

        <section className="relative mt-8">
          <SakuSparkle className="absolute -top-1 left-[92px] text-saku-coin" size={14} />
          <div className="flex items-end gap-3">
            <SakuMascot animated size={96} />
            <p className="saku-line-thin mb-10 rounded-[18px_18px_18px_6px] bg-saku-paper px-3.5 py-2 text-sm font-extrabold shadow-saku-xs">
              Halo! Aku Saku, teman catat uangmu.
            </p>
          </div>
          <h1 className="mt-4 font-saku-head text-[38px] leading-[44px] font-semibold">Catat uang cukup satu baris.</h1>
          <p className="mt-2 text-base font-bold text-saku-muted">
            Ketik, tekan Enter, selesai. Sakuin merapikan sisanya: kategori, laporan, dan batas belanja.
          </p>

          <div className="saku-line mt-5 rounded-saku-card bg-saku-paper p-3 shadow-saku" aria-hidden="true">
            <div className="saku-line-thin flex min-h-12 items-center rounded-full bg-saku-bg px-4 text-base font-extrabold">
              kopi 18rb
              <span className="ml-0.5 h-5 w-0.5 bg-saku-accent motion-safe:animate-pulse" />
            </div>
            <div className="mt-2.5 flex items-center gap-3 px-1">
              <CategoryBadge icon="utensils" size={38} />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-black">Kopi</span>
                <span className="block text-xs font-bold text-saku-muted">Makanan · Hari ini</span>
              </span>
              <span className="font-saku-head text-base font-semibold">−18.000</span>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <a className={PRIMARY_LINK} download="sakuin.apk" href={APK_PATH}>
              <Download aria-hidden="true" className="size-5" strokeWidth={2.6} />
              Download aplikasi Android
            </a>
            <Link className={SECONDARY_LINK} to="/register">
              Mulai di browser
            </Link>
            <p className="text-center text-sm font-bold text-saku-muted">
              Sudah punya akun?{" "}
              <Link className="font-black text-saku-accent" to="/login">
                Masuk
              </Link>
            </p>
          </div>
        </section>

        <section className="mt-10" aria-labelledby="landing-features">
          <h2 className="font-saku-head text-2xl font-semibold" id="landing-features">
            Yang bisa kamu lakukan
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <li className="saku-line flex items-start gap-3 rounded-saku-card bg-saku-paper p-3.5 shadow-saku" key={feature.title}>
                <span
                  aria-hidden="true"
                  className="saku-line-thin flex size-11 shrink-0 items-center justify-center rounded-full"
                  style={{ background: feature.tint }}
                >
                  <feature.Icon className="size-5" strokeWidth={2.4} />
                </span>
                <span className="min-w-0">
                  <span className="block text-base font-black">{feature.title}</span>
                  <span className="block text-sm font-bold text-saku-muted">{feature.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="saku-line-thin mt-10 rounded-saku-card bg-saku-coin-soft p-4" aria-labelledby="landing-install">
          <h2 className="flex items-center gap-2 font-saku-head text-xl font-semibold" id="landing-install">
            <Smartphone aria-hidden="true" className="size-5" strokeWidth={2.4} />
            Cara pasang di Android
          </h2>
          <ol className="mt-3 space-y-2">
            {INSTALL_STEPS.map((step, index) => (
              <li className="flex items-start gap-2.5 text-sm font-bold" key={step}>
                <span className="saku-line-hair flex size-6 shrink-0 items-center justify-center rounded-full bg-saku-paper text-xs font-black">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <Link className="mt-3 inline-block text-sm font-black text-saku-accent" to="/install">
            Panduan lengkap dan pemecahan masalah
          </Link>
        </section>

        <section className="mt-10 text-center">
          <p className="font-saku-head text-xl font-semibold">Punya saran untuk Saku?</p>
          <a
            className="saku-line-thin saku-press mt-3 inline-flex min-h-11 items-center rounded-full bg-saku-paper px-5 text-sm font-black shadow-saku-xs"
            href={FEEDBACK_FORM_URL}
            rel="noreferrer"
            target="_blank"
          >
            Kirim masukan
          </a>
        </section>

        <footer className="mt-10 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs font-bold text-saku-muted">
          <Link to="/privacy">Kebijakan privasi</Link>
          <Link to="/account-deletion">Hapus akun</Link>
          <Link to="/install">Panduan pasang</Link>
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </footer>
      </div>
    </main>
  );
}
