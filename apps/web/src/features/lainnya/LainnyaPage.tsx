import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Download,
  Flame,
  HeartHandshake,
  LogOut,
  Repeat,
  ShieldCheck,
  Smartphone,
  Tags,
  Target,
} from "lucide-react";
import { AppShell } from "../../components/layout/AppShell";
import {
  BottomSheet,
  SakuChatInvite,
  SakuMascot,
  SakuSparkle,
  StickerButton
} from "../../components/saku";
import { useToast } from "../../components/toast/ToastProvider";
import { getTransactionReminderSettings } from "../../lib/transaction-reminder";
import { queryKeys } from "../../lib/query-keys";
import { useAuth } from "../auth/auth-context";
import { WidgetInstallModal } from "../android-widget/WidgetInstallModal";
import { getGoals } from "../goals/goal.service";
import { getSummary } from "../summary/summary.service";
import { useReferenceData } from "../transactions/use-reference-data";
import { getInitials, MenuIcon, MenuRow, MenuSection, type MenuItem } from "./SubPageParts";

function canPinAndroidWidget() {
  return typeof window !== "undefined" && typeof window.AndroidWidgetBridge?.requestPinWidget === "function";
}

export function LainnyaPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [widgetOpen, setWidgetOpen] = useState(false);

  const summaryQuery = useQuery({
    queryKey: queryKeys.summary,
    queryFn: () => getSummary(),
    staleTime: 60_000,
    refetchOnWindowFocus: false
  });
  const { categories } = useReferenceData();
  const goalsQuery = useQuery({
    queryKey: queryKeys.goals,
    queryFn: getGoals,
    staleTime: 60_000,
    refetchOnWindowFocus: false
  });

  const name = user?.name ?? "Pengguna Sakuin";
  const streak = summaryQuery.data?.habit?.currentStreakDays ?? 0;
  const runningGoals = (goalsQuery.data ?? []).filter(
    (goal) => Number(goal.currentAmount) < Number(goal.targetAmount)
  ).length;
  const reminder = getTransactionReminderSettings(user?.id);
  const limitedCount = categories.filter((category) => category.type === "EXPENSE" && (category.limit ?? 0) > 0).length;

  const keuangan: MenuItem[] = [
    {
      icon: Tags,
      tint: "#ffe3bd",
      title: "Kategori dan batas",
      subtitle: limitedCount > 0 ? `${limitedCount} kategori punya batas bulanan` : "Atur batas belanja per kategori",
      to: "/lainnya/kategori"
    },
    {
      icon: Target,
      tint: "#d4f5e0",
      title: "Target tabungan",
      subtitle: goalsQuery.data
        ? runningGoals > 0
          ? `${runningGoals} target berjalan`
          : "Belum ada target berjalan"
        : "Kumpulkan uang untuk tujuanmu",
      to: "/lainnya/target"
    },
    {
      icon: Repeat,
      tint: "#e7ddff",
      title: "Transaksi berulang",
      subtitle: "Tagihan dan pemasukan rutin",
      to: "/lainnya/berulang"
    }
  ];

  const bantuan: MenuItem[] = [
    {
      icon: Bell,
      tint: "#fff0b3",
      title: "Pengingat",
      subtitle: reminder.enabled
        ? `Setiap hari pukul ${String(reminder.eveningHour).padStart(2, "0")}.00`
        : "Belum aktif",
      to: "/lainnya/pengingat"
    },
    // Only the Android app can pin its home-screen widget.
    ...(canPinAndroidWidget()
      ? [
          {
            icon: Smartphone,
            tint: "#d6f3f7",
            title: "Widget layar HP",
            subtitle: "Lihat ringkasan tanpa membuka aplikasi",
            onClick: () => setWidgetOpen(true)
          }
        ]
      : [])
  ];

  const dataAkun: MenuItem[] = [
    {
      icon: Download,
      tint: "#ccf1ea",
      title: "Export data",
      subtitle: "Unduh catatanmu",
      to: "/lainnya/export"
    },
    {
      icon: ShieldCheck,
      tint: "#ebe8f2",
      title: "Akun dan keamanan",
      subtitle: "Nama, password, hapus akun",
      to: "/lainnya/akun"
    }
  ];

  function handleLogout() {
    setConfirmLogout(false);
    queryClient.clear();
    logout();
    addToast({
      variant: "info",
      title: "Sampai jumpa lagi!",
      description: "Kamu sudah keluar dari akun Sakuin."
    });
    navigate("/login", { replace: true });
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-xl pb-4">
        <h1 className="px-1 font-saku-head text-[28px] font-semibold">Lainnya</h1>

        <div className="saku-line relative mt-3 rounded-saku-hero bg-saku-accent px-4 py-3.5 text-white shadow-saku">
          <SakuSparkle className="absolute top-3 right-24 text-white" size={12} />
          <SakuSparkle className="absolute right-[118px] bottom-4 text-saku-coin [animation-delay:0.9s]" size={9} />
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-3 pt-2">
              <span
                aria-hidden="true"
                className="saku-line-thin flex size-12 shrink-0 items-center justify-center rounded-full bg-saku-coin font-saku-head text-lg font-semibold text-saku-ink"
              >
                {getInitials(name)}
              </span>
              <div className="min-w-0">
                <p className="truncate font-saku-head text-xl font-semibold">{name}</p>
                <p className="truncate text-xs font-bold text-white/90">{user?.email ?? ""}</p>
              </div>
            </div>
            <SakuChatInvite className="-mt-5 -mr-2" />
          </div>
          {streak > 0 ? (
            <p className="saku-line-thin mt-3 inline-flex -rotate-[1.5deg] items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 text-xs font-black text-saku-ink">
              <Flame aria-hidden="true" className="size-3.5 text-[#e8590c]" strokeWidth={2.4} />
              {streak} hari berturut-turut mencatat
            </p>
          ) : null}
        </div>

        <MenuSection label="Keuangan">
          {keuangan.map((item, index) => (
            <MenuRow isLast={index === keuangan.length - 1} item={item} key={item.title} />
          ))}
        </MenuSection>

        <MenuSection label="Alat bantu">
          {bantuan.map((item, index) => (
            <MenuRow isLast={index === bantuan.length - 1} item={item} key={item.title} />
          ))}
        </MenuSection>

        <MenuSection label="Tentang Sakuin">
          <MenuRow
            isLast
            item={{
              icon: HeartHandshake,
              tint: "#ffd6e6",
              title: "Dukung Sakuin",
              subtitle: "Bantu Sakuin terus berkembang",
              to: "/lainnya/dukung-sakuin"
            }}
          />
        </MenuSection>

        <MenuSection label="Data dan akun">
          {dataAkun.map((item) => (
            <MenuRow isLast={false} item={item} key={item.title} />
          ))}
          <li>
            <button
              className="flex min-h-[60px] w-full items-center gap-3 px-3 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-saku-accent/30"
              onClick={() => setConfirmLogout(true)}
              type="button"
            >
              <MenuIcon danger icon={LogOut} tint="#ffe1dc" />
              <span className="text-[15px] font-black text-saku-over-text">Keluar</span>
            </button>
          </li>
        </MenuSection>
      </div>

      <BottomSheet
        footer={
          <div className="flex gap-2.5">
            <StickerButton onClick={() => setConfirmLogout(false)} variant="plain">
              Batal
            </StickerButton>
            <StickerButton className="flex-1" onClick={handleLogout} variant="danger">
              Ya, keluar
            </StickerButton>
          </div>
        }
        onClose={() => setConfirmLogout(false)}
        open={confirmLogout}
        title="Keluar dari Sakuin?"
      >
        <div className="flex items-center gap-3">
          <SakuMascot mood="worried" size={64} />
          <p className="text-sm font-bold text-saku-muted">
            Catatanmu tetap aman di server. Masuk lagi kapan saja dengan akun yang sama.
          </p>
        </div>
      </BottomSheet>

      {widgetOpen ? (
        <WidgetInstallModal onClose={() => setWidgetOpen(false)} summary={summaryQuery.data ?? null} />
      ) : null}
    </AppShell>
  );
}
