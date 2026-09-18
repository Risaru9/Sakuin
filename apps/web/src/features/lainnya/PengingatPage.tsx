import { Bell, CheckCircle2, Moon, TriangleAlert } from "lucide-react";
import { AppShell } from "../../components/layout/AppShell";
import { SakuMascot, StickerButton, StickerCard, StickerSwitch } from "../../components/saku";
import { cn } from "../../lib/cn";
import {
  isNativePlatform,
  TRANSACTION_REMINDER_BODY,
  TRANSACTION_REMINDER_POLICY,
  TRANSACTION_REMINDER_TITLE
} from "../../lib/transaction-reminder";
import { useReminderSettings } from "../reminders/use-reminder-settings";
import { FloatingSnackHost, SheetFieldLabel, SubPageHeader } from "./SubPageParts";

const HOUR_LABEL = `${String(TRANSACTION_REMINDER_POLICY.eveningHour).padStart(2, "0")}.00`;

/** Pengingat: one switch for the nightly "don't forget to record" nudge, with a preview. */
export function PengingatPage() {
  const { settings, permission, busy, setEnabled, sendTest } = useReminderSettings();
  const blocked = permission === "denied";
  const unsupported = permission === "unsupported";
  // Only the Android app checks today's entries before reminding.
  const native = isNativePlatform();

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-xl pb-4">
        <SubPageHeader title="Pengingat" />

        <StickerCard className="mt-3.5 flex items-center gap-3 px-3.5 py-3">
          <span aria-hidden="true" className="saku-line-thin flex size-[42px] shrink-0 items-center justify-center rounded-full bg-saku-coin-soft">
            <Bell className="size-5" strokeWidth={2.3} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-black">Ingatkan aku mencatat</p>
            <p className="text-xs font-bold text-saku-muted">{native ? "Lewat notifikasi HP" : "Lewat notifikasi browser"}</p>
          </div>
          <StickerSwitch
            checked={settings.enabled}
            disabled={busy || unsupported}
            label="Ingatkan aku mencatat"
            onCheckedChange={(checked) => void setEnabled(checked)}
          />
        </StickerCard>

        {blocked || unsupported ? (
          <p className="mt-3 flex items-start gap-2 rounded-2xl bg-saku-over-soft px-3 py-2.5 text-sm font-bold text-saku-over-text" role="alert">
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={2.4} />
            {unsupported
              ? "Browser ini belum mendukung notifikasi. Pakai aplikasi Sakuin di HP supaya pengingat bisa muncul."
              : "Notifikasi Sakuin sedang diblokir. Izinkan dulu di pengaturan HP atau browser, lalu nyalakan lagi."}
          </p>
        ) : null}

        <SheetFieldLabel className="mt-5">Kapan diingatkan?</SheetFieldLabel>
        <StickerCard className="overflow-hidden">
          <div className={cn("flex items-center gap-3 px-3.5 py-3", native && "saku-dash-bottom")}>
            <Moon aria-hidden="true" className="size-[18px] shrink-0" strokeWidth={2.4} />
            <p className="min-w-0 flex-1 text-[15px] font-black">Setiap malam</p>
            <p className="font-saku-head text-xl font-semibold">{HOUR_LABEL}</p>
          </div>
          {native ? (
            <div className="flex items-center gap-3 px-3.5 py-3">
              <CheckCircle2 aria-hidden="true" className="size-5 shrink-0 text-saku-income" strokeWidth={2.4} />
              <p className="text-[13px] font-extrabold">Tidak mengingatkan kalau hari ini sudah ada catatan</p>
            </div>
          ) : null}
        </StickerCard>
        <p className="mt-1.5 px-1 text-xs font-bold text-saku-muted">Paling banyak sekali sehari, biar tidak mengganggu.</p>

        <SheetFieldLabel className="mt-5">Contoh notifikasi</SheetFieldLabel>
        <div className="saku-line-thin flex gap-2.5 rounded-[20px] bg-saku-paper p-3 shadow-[0_8px_24px_rgba(29,26,51,0.12)] motion-safe:animate-saku-rise">
          <span aria-hidden="true" className="saku-line-hair flex size-10 shrink-0 items-end justify-center overflow-hidden rounded-xl bg-saku-coin-soft">
            <SakuMascot size={36} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-saku-muted">Sakuin · {HOUR_LABEL}</p>
            <p className="text-sm font-black">{TRANSACTION_REMINDER_TITLE}</p>
            <p className="text-[13px] font-bold text-saku-muted">{TRANSACTION_REMINDER_BODY}</p>
          </div>
        </div>

        {settings.enabled ? (
          <StickerButton className="mt-4 w-full" onClick={() => void sendTest()} size="md" variant="plain">
            Kirim notifikasi tes sekarang
          </StickerButton>
        ) : null}
      </div>

      <FloatingSnackHost />
    </AppShell>
  );
}
