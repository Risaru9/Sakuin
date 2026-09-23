import { useState, type ComponentType } from "react";
import { CalendarDays, PieChart, Repeat } from "lucide-react";
import { StickerCard, StickerSwitch } from "../../components/saku";
import {
  getSakuNotificationPrefs,
  hasNativeWeeklySummary,
  setSakuNotificationPrefs,
  type SakuNotificationPrefs
} from "../../lib/saku-notifications";
import { isNativePlatform, requestNotificationPermission } from "../../lib/transaction-reminder";
import { SheetFieldLabel } from "./SubPageParts";

type Row = {
  key: keyof SakuNotificationPrefs;
  title: string;
  detail: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
};

const ROWS: Row[] = [
  { key: "budget", title: "Batas kategori", detail: "Saat sudah 80% dan saat habis", icon: PieChart },
  { key: "bills", title: "Tagihan besok", detail: "Sehari sebelum transaksi berulang, jam 09.00", icon: Repeat },
  { key: "weekly", title: "Ringkasan mingguan", detail: "Setiap Minggu jam 19.00", icon: CalendarDays }
];

/** "Kabar lain dari Saku": the three APK 2.1 notifications, each with its own switch. */
export function SakuNotificationSwitches() {
  const [prefs, setPrefs] = useState(getSakuNotificationPrefs);
  const native = isNativePlatform();
  const weeklyReady = hasNativeWeeklySummary();

  async function toggle(key: keyof SakuNotificationPrefs, checked: boolean) {
    const next = { ...prefs, [key]: checked };
    setPrefs(next);
    setSakuNotificationPrefs(next);

    if (checked) {
      // Android 13+ asks once; the switch stays on either way so it works after allowing.
      await requestNotificationPermission();
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <SheetFieldLabel className="mt-5">Kabar lain dari Saku</SheetFieldLabel>
        <span className="saku-line-hair mt-3.5 -rotate-2 rounded-full bg-saku-coin px-2 font-saku-head text-xs font-semibold motion-safe:animate-saku-pop">
          Baru!
        </span>
      </div>
      <StickerCard className="overflow-hidden">
        {ROWS.map((row, index) => {
          const needsUpdate = row.key === "weekly" && native && !weeklyReady;
          const disabled = !native || needsUpdate;
          const Icon = row.icon;

          return (
            <div
              className={index < ROWS.length - 1 ? "saku-dash-bottom flex items-center gap-3 px-3.5 py-3" : "flex items-center gap-3 px-3.5 py-3"}
              key={row.key}
            >
              <span aria-hidden="true" className="saku-line-thin flex size-[38px] shrink-0 items-center justify-center rounded-full bg-saku-paper">
                <Icon aria-hidden className="size-[18px]" strokeWidth={2.4} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-black">{row.title}</p>
                <p className="text-xs font-bold text-saku-muted">
                  {needsUpdate ? "Perlu update aplikasi ke versi 2.1" : row.detail}
                </p>
              </div>
              <StickerSwitch
                checked={!disabled && prefs[row.key]}
                disabled={disabled}
                label={row.title}
                onCheckedChange={(checked) => void toggle(row.key, checked)}
              />
            </div>
          );
        })}
      </StickerCard>
      {native ? null : (
        <p className="mt-1.5 px-1 text-xs font-bold text-saku-muted">Khusus aplikasi Sakuin di HP Android.</p>
      )}
    </>
  );
}
