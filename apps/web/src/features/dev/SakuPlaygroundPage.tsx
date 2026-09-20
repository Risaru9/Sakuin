import { useState, type ReactNode } from "react";
import { CalendarDays, ChevronDown, Plus } from "lucide-react";
import {
  BottomSheet,
  CategoryBadge,
  SakuMascot,
  SakuSparkle,
  SegmentedControl,
  StickerButton,
  StickerCard,
  StickerChip,
  StickerSwitch
} from "../../components/saku";
import { queryClient } from "../../lib/query-client";
import { queryKeys } from "../../lib/query-keys";
import { QuickComposer } from "../quick-composer/QuickComposer";

// Development-only page (registered under /dev/saku when import.meta.env.DEV) for reviewing
// the Saku cartoon components in isolation while screens are being migrated.

const CATEGORY_ICONS = [
  "utensils",
  "car",
  "shopping-bag",
  "receipt",
  "heart-pulse",
  "book-open",
  "minus-circle",
  "wallet",
  "gift",
  "plus-circle"
];

const SAMPLE_CATEGORIES = [
  ["Gaji", "INCOME", "wallet"],
  ["Bonus", "INCOME", "gift"],
  ["Pemasukan Lainnya", "INCOME", "plus-circle"],
  ["Makanan", "EXPENSE", "utensils"],
  ["Transportasi", "EXPENSE", "car"],
  ["Belanja", "EXPENSE", "shopping-bag"],
  ["Pendidikan", "EXPENSE", "book-open"],
  ["Kesehatan", "EXPENSE", "heart-pulse"],
  ["Tagihan", "EXPENSE", "receipt"],
  ["Pengeluaran Lainnya", "EXPENSE", "minus-circle"]
].map(([name, type, icon], index) => ({
  id: `sample-category-${index}`,
  name,
  type,
  icon,
  color: null,
  isDefault: true,
  limit: null
}));

// Sample reference data so the composer works here without an API or login (dev only).
if (!queryClient.getQueryData(queryKeys.categories)) {
  queryClient.setQueryData(queryKeys.categories, SAMPLE_CATEGORIES);
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 px-1 text-xs font-black tracking-wider text-saku-muted uppercase">{title}</h2>
      {children}
    </section>
  );
}

export function SakuPlaygroundPage() {
  const [type, setType] = useState<"out" | "in">("out");
  const [reminder, setReminder] = useState(true);
  const [filter, setFilter] = useState("Semua");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [category, setCategory] = useState("utensils");

  return (
    <main className="min-h-screen bg-saku-bg px-4 pt-6 pb-16 font-saku-body text-saku-ink">
      <div className="mx-auto max-w-lg">
        <StickerCard className="relative p-4" hero tone="accent">
          <SakuSparkle className="absolute top-3 left-44 text-white" />
          <SakuSparkle className="absolute top-8 left-52 text-saku-coin [animation-delay:0.8s]" size={10} />
          <SakuMascot animated className="absolute -top-4 right-2" size={70} />
          <p className="font-saku-head text-2xl font-semibold">Saku UI</p>
          <p className="mt-1 max-w-[70%] text-xs font-bold text-white/90">
            Pratinjau komponen gaya kartun. Hanya tersedia saat development.
          </p>
          <span className="saku-line-thin mt-3 inline-flex -rotate-[1.5deg] rounded-full bg-saku-coin px-2.5 py-0.5 text-xs font-black text-saku-ink">
            Masih aman · ±82 rb/hari
          </span>
        </StickerCard>

        <Section title="Saku">
          <StickerCard className="flex items-end justify-around p-4">
            <SakuMascot label="Saku senang" mood="happy" size={80} />
            <SakuMascot label="Saku kaget" mood="wow" size={80} />
            <SakuMascot label="Saku cemas" mood="worried" size={80} />
          </StickerCard>
        </Section>

        <Section title="Tombol">
          <div className="flex flex-col gap-3">
            <StickerButton fullWidth>Simpan perubahan</StickerButton>
            <div className="flex gap-3">
              <StickerButton size="md" variant="coin">
                <Plus aria-hidden="true" className="size-4" strokeWidth={3} />
                Tabung
              </StickerButton>
              <StickerButton size="md" variant="plain">
                Batal
              </StickerButton>
              <StickerButton size="md" variant="danger">
                Hapus
              </StickerButton>
            </div>
            <StickerButton isLoading>Simpan</StickerButton>
          </div>
        </Section>

        <Section title="Chip dan pilihan">
          <div className="flex flex-wrap gap-2">
            {["Semua", "Keluar", "Masuk"].map((label) => (
              <StickerChip active={filter === label} key={label} onClick={() => setFilter(label)}>
                {label}
              </StickerChip>
            ))}
            <StickerChip
              leading={<CategoryBadge icon="utensils" size={24} />}
              tone="highlight"
              trailing={<ChevronDown aria-hidden="true" className="size-3.5" strokeWidth={2.6} />}
            >
              Makanan
            </StickerChip>
            <StickerChip leading={<CalendarDays aria-hidden="true" className="size-4" />}>Hari ini</StickerChip>
          </div>
          <SegmentedControl
            ariaLabel="Jenis transaksi"
            className="mt-3"
            onChange={setType}
            options={[
              { value: "out", label: "Keluar" },
              { value: "in", label: "Masuk" }
            ]}
            value={type}
          />
          <StickerCard className="mt-3 flex items-center gap-3 px-4 py-2">
            <p className="flex-1 text-sm font-black">Ingatkan aku mencatat</p>
            <StickerSwitch checked={reminder} label="Ingatkan aku mencatat" onCheckedChange={setReminder} />
          </StickerCard>
        </Section>

        <Section title="Ikon kategori">
          <StickerCard className="grid grid-cols-5 gap-3 p-4">
            {CATEGORY_ICONS.map((icon) => (
              <div className="flex flex-col items-center gap-1" key={icon}>
                <CategoryBadge icon={icon} size={42} />
                <span className="text-[10px] font-bold text-saku-muted">{icon}</span>
              </div>
            ))}
          </StickerCard>
        </Section>

        <Section title="Popup bawah">
          <StickerButton fullWidth onClick={() => setSheetOpen(true)} variant="coin">
            Buka popup detail
          </StickerButton>
        </Section>

        <Section title="Kolom catat (data contoh)">
          <p className="px-1 text-xs font-bold text-saku-muted">
            Ketik misalnya "kopi susu 18rb". Menyimpan butuh API dan login, jadi di halaman ini
            akan gagal dengan pesan error.
          </p>
        </Section>
        <div className="sticky bottom-4 z-40 mt-4">
          <QuickComposer />
        </div>
      </div>

      <BottomSheet
        footer={
          <StickerButton fullWidth onClick={() => setSheetOpen(false)}>
            Selesai
          </StickerButton>
        }
        onClose={() => setSheetOpen(false)}
        open={sheetOpen}
        subtitle="Kategori dan tanggal dalam satu tempat"
        title="Detail catatan"
      >
        <p className="text-xs font-black tracking-wider text-saku-muted uppercase">Kategori</p>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {CATEGORY_ICONS.slice(0, 7).map((icon) => (
            <button
              aria-pressed={category === icon}
              className="flex min-h-11 flex-col items-center gap-1 rounded-2xl py-1 text-[11px] font-black"
              key={icon}
              onClick={() => setCategory(icon)}
              type="button"
            >
              <CategoryBadge
                className={category === icon ? "shadow-saku-xs motion-safe:animate-saku-wiggle" : undefined}
                icon={icon}
                size={48}
              />
              {icon}
            </button>
          ))}
        </div>
      </BottomSheet>
    </main>
  );
}
