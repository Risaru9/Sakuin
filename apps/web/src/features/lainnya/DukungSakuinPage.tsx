import { HeartHandshake, Landmark, QrCode, ShieldCheck } from "lucide-react";
import { AppShell } from "../../components/layout/AppShell";
import { SakuMascot, StickerCard } from "../../components/saku";
import { SubPageHeader } from "./SubPageParts";

const methods = [
  {
    title: "QRIS",
    description: "Pindai kode QR untuk memberi dukungan sekali bayar.",
    Icon: QrCode,
    tint: "bg-saku-coin-soft"
  },
  {
    title: "Transfer bank",
    description: "Kirim dukungan langsung ke rekening resmi Sakuin.",
    Icon: Landmark,
    tint: "bg-saku-income-soft"
  }
];

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
          Dukungan ini sukarela. Metode pembayaran resmi akan ditampilkan di halaman ini saat sudah siap.
        </p>

        <h2 className="mx-1 mt-6 mb-2 font-saku-head text-xl font-semibold">Cara mendukung</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {methods.map(({ title, description, Icon, tint }) => (
            <StickerCard className="flex flex-col p-4" key={title}>
              <span aria-hidden="true" className={`saku-line-thin flex size-12 items-center justify-center rounded-2xl ${tint}`}>
                <Icon className="size-6" strokeWidth={2.3} />
              </span>
              <h3 className="mt-3 font-saku-head text-lg font-semibold">{title}</h3>
              <p className="mt-1 flex-1 text-sm font-bold leading-5 text-saku-muted">{description}</p>
              <span className="saku-line-thin mt-4 self-start rounded-full bg-saku-coin-soft px-3 py-1 text-xs font-black">
                Segera hadir
              </span>
            </StickerCard>
          ))}
        </div>

        <div className="mt-5 flex items-start gap-2.5 rounded-saku-card bg-saku-paper p-4 text-sm font-bold leading-6 text-saku-muted saku-line-thin">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-saku-income" strokeWidth={2.4} />
          <p>Belum ada QR atau rekening yang aktif di Sakuin. Periksa detail pembayaran di sini sebelum mengirim dukungan.</p>
        </div>

        <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs font-black text-saku-muted">
          <HeartHandshake aria-hidden="true" className="size-4" strokeWidth={2.4} />
          Terima kasih sudah menemani Sakuin berkembang.
        </p>
      </div>
    </AppShell>
  );
}
