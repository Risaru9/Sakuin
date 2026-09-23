import { useState } from "react";
import { Plus, RefreshCw, Smartphone } from "lucide-react";
import { BottomSheet, SakuMascot, StickerButton } from "../../components/saku";
import type { SummaryData } from "../summary/summary.types";

function WidgetPreviewCard() {
  const budget = <div className="min-w-0 flex-1 text-xs font-black text-saku-watch-text">
    <p>Makanan 86% dari batas</p>
    <div className="mt-1 h-2.5 overflow-hidden rounded-full border border-saku-ink bg-[#F3E8D2]"><div className="h-full w-[86%] border-r border-saku-ink bg-saku-coin" /></div>
  </div>;
  const catat = <span className="flex items-center justify-center gap-2 rounded-full border-2 border-saku-ink bg-saku-coin px-4 py-2 font-saku-head text-lg font-semibold shadow-saku-xs"><Plus size={20} />Catat</span>;
  return <div className="rounded-[26px] border-[2.5px] border-saku-ink bg-saku-bg p-4 shadow-saku-sm" aria-label="Contoh widget">
    <div className="mb-4 flex items-center gap-2"><b className="font-saku-head text-lg">September</b><span className="flex-1 text-[10px] font-bold text-saku-muted">diperbarui 10.12</span><RefreshCw size={24} /></div>
    <div className="flex items-center gap-3">
      <SakuMascot mood="wow" size={66} />
      <div className="flex-1"><p className="text-xs font-black text-saku-muted">Keluar hari ini</p><p className="font-saku-head text-[30px] font-semibold leading-tight">43.000</p><p className="text-xs font-black">Sisa bulan ini 1.240.500</p></div>
    </div>
    <div className="mt-4 rounded-[18px] border-2 border-saku-ink bg-white p-3">{budget}</div>
    <p className="mt-2 text-xs font-bold text-saku-muted">Terakhir: Kopi susu −18.000</p>
    {catat}
  </div>;
}

export function WidgetInstallModal({
  onClose,
  summary: _summary
}: {
  onClose: () => void;
  summary: SummaryData | null;
}) {
  const [pinStatus, setPinStatus] = useState<"idle" | "requested" | "unsupported" | "failed">("idle");

  const isAndroid = typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
  const androidWidgetBridge = typeof window !== "undefined" ? window.AndroidWidgetBridge : undefined;
  const canRequestNativeWidget = Boolean(
    isAndroid &&
      androidWidgetBridge?.requestPinWidget &&
      (!androidWidgetBridge.isWidgetPinningSupported || androidWidgetBridge.isWidgetPinningSupported())
  );

  function handleAddWidget() {
    if (!androidWidgetBridge?.requestPinWidget) {
      setPinStatus("unsupported");
      return;
    }

    try {
      const result = androidWidgetBridge.requestPinWidget();

      if (result === "REQUESTED") {
        setPinStatus("requested");
        return;
      }

      if (result === "UNSUPPORTED_ANDROID_VERSION" || result === "UNSUPPORTED_LAUNCHER") {
        setPinStatus("unsupported");
        return;
      }

      setPinStatus("failed");
    } catch {
      setPinStatus("failed");
    }
  }

  return (
    <BottomSheet
      footer={
        <StickerButton disabled={!canRequestNativeWidget} fullWidth onClick={handleAddWidget}>
          <Smartphone aria-hidden="true" className="size-5" strokeWidth={2.4} />
          Tambahkan widget
        </StickerButton>
      }
      onClose={onClose}
      open
      subtitle="Satu tampilan yang menyesuaikan ruang di HP dan tablet"
      title="Widget Sakuin"
    >
      <p className="mb-1.5 text-xs font-black tracking-[0.05em] text-saku-muted uppercase">Contoh tampilan</p>
      <WidgetPreviewCard />

      <ol className="mt-4 space-y-1.5 text-sm font-bold">
        <li>1. Ketuk "Tambahkan widget", lalu setujui di layar Android.</li>
        <li>2. Kalau tidak muncul, tahan layar utama HP, buka Widget, lalu cari Sakuin.</li>
        <li>3. Di HP atau tablet, widget akan menyesuaikan ruang tanpa mengubah desainnya.</li>
      </ol>

      {pinStatus !== "idle" ? (
        <p
          className={[
            "mt-3 rounded-2xl px-3 py-2 text-sm font-extrabold",
            pinStatus === "requested" ? "bg-saku-income-soft" : "bg-saku-coin-soft text-saku-watch-text"
          ].join(" ")}
          role="status"
        >
          {pinStatus === "requested"
            ? "Permintaan dikirim. Ikuti konfirmasi Android di layar."
            : "HP ini belum bisa memasang langsung. Pakai daftar Widget di layar utama, lalu cari Sakuin."}
        </p>
      ) : null}
    </BottomSheet>
  );
}
