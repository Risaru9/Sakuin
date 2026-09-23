import { Copy, HeartHandshake, Landmark, QrCode, ShieldCheck } from "lucide-react";
import { AppShell } from "../../components/layout/AppShell";
import { SakuMascot, showSnack, StickerButton, StickerCard } from "../../components/saku";
import { SubPageHeader } from "./SubPageParts";

const bankAccount = {
  bank: "Bank Jago",
  number: "100307635788",
  holder: "Rizal Mahardika Putra"
} as const;

async function copyAccountNumber() {
  try {
    await navigator.clipboard.writeText(bankAccount.number);
    showSnack({ title: "Nomor rekening disalin", mood: "happy" });
  } catch {
    showSnack({
      title: "Nomor belum tersalin",
      detail: "Tekan lama nomor rekening untuk menyalinnya.",
      mood: "worried"
    });
  }
}

export function DukungSakuinPage() {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-xl pb-4">
        <SubPageHeader title="Dukung Sakuin" />

        <section className="saku-line relative mt-4 overflow-hidden rounded-saku-hero bg-saku-accent p-5 text-white shadow-saku">
          <div className="flex items-center gap-3">
            <SakuMascot animated size={78} />
            <div className="min-w-0">
              <p className="font-saku-head text-2xl font-semibold leading-tight">Bantu Sakuin tumbuh</p>
              <p className="mt-1 text-sm font-bold leading-5 text-white/90">
                Dukunganmu membantu pengembangan fitur, biaya server, dan persiapan rilis di Play Store.
              </p>
            </div>
          </div>
        </section>

        <p className="mt-5 px-1 text-sm font-bold leading-6 text-saku-muted">
          Dukungan ini sukarela. Transfer ke Bank Jago sudah tersedia; QRIS sedang disiapkan.
        </p>

        <h2 className="mx-1 mt-6 mb-2 font-saku-head text-xl font-semibold">Cara mendukung</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <StickerCard className="flex flex-col p-4">
            <span aria-hidden="true" className="saku-line-thin flex size-12 items-center justify-center rounded-2xl bg-saku-coin-soft">
              <QrCode className="size-6" strokeWidth={2.3} />
            </span>
            <h3 className="mt-3 font-saku-head text-lg font-semibold">QRIS</h3>
            <p className="mt-1 flex-1 text-sm font-bold leading-5 text-saku-muted">
              QRIS merchant resmi untuk dukungan sekali bayar sedang disiapkan.
            </p>
            <span className="saku-line-thin mt-4 self-start rounded-full bg-saku-coin-soft px-3 py-1 text-xs font-black">
              Segera hadir
            </span>
          </StickerCard>

          <StickerCard className="flex flex-col p-4">
            <span aria-hidden="true" className="saku-line-thin flex size-12 items-center justify-center rounded-2xl bg-saku-income-soft">
              <Landmark className="size-6" strokeWidth={2.3} />
            </span>
            <h3 className="mt-3 font-saku-head text-lg font-semibold">Transfer {bankAccount.bank}</h3>
            <p className="mt-1 text-sm font-bold leading-5 text-saku-muted">
              Rekening dukungan Sakuin. Transfer dilakukan melalui aplikasi bank Anda.
            </p>
            <dl className="mt-4 rounded-2xl bg-saku-bg p-3">
              <dt className="text-xs font-black text-saku-muted">Nomor Kantong / rekening</dt>
              <dd className="mt-0.5 select-all break-all font-saku-head text-xl font-semibold tracking-wide">
                {bankAccount.number}
              </dd>
              <dt className="mt-3 text-xs font-black text-saku-muted">Atas nama</dt>
              <dd className="mt-0.5 font-saku-head text-base font-semibold">{bankAccount.holder}</dd>
            </dl>
            <StickerButton className="mt-4" fullWidth onClick={() => void copyAccountNumber()} size="md" variant="coin">
              <Copy aria-hidden="true" className="size-4" strokeWidth={2.4} />
              Salin nomor rekening
            </StickerButton>
          </StickerCard>
        </div>

        <div className="mt-5 flex items-start gap-2.5 rounded-saku-card bg-saku-paper p-4 text-sm font-bold leading-6 text-saku-muted saku-line-thin">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-saku-income" strokeWidth={2.4} />
          <p>Pastikan nama penerima di aplikasi bank adalah {bankAccount.holder} sebelum transfer. Jika berbeda, batalkan. QRIS belum tersedia.</p>
        </div>

        <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs font-black text-saku-muted">
          <HeartHandshake aria-hidden="true" className="size-4" strokeWidth={2.4} />
          Terima kasih sudah menemani Sakuin berkembang.
        </p>
      </div>
    </AppShell>
  );
}
