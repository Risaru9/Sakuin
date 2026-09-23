import { useEffect, useId, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileLock2, KeyRound, ShieldCheck, Smartphone, Trash2, UserRound } from "lucide-react";
import { AppShell } from "../../components/layout/AppShell";
import { BottomSheet, showSnack, StickerButton, StickerCard } from "../../components/saku";
import { useAppVersion } from "../../components/pwa/use-app-version";
import { ApiClientError } from "../../lib/api-client";
import { queryKeys } from "../../lib/query-keys";
import { useAuth } from "../auth/auth-context";
import { requestPasswordReset } from "../auth/auth.service";
import { formatPlainAmount } from "../beranda/beranda-data";
import { getUserProfile, updateUserProfile } from "../profile/profile.service";
import type { UserProfile } from "../profile/profile.types";
import { amountToInput, formatAmountInput, parseAmountInput } from "../transactions/amount-input";
import { FloatingSnackHost, getInitials, MenuRow, MenuSection, SheetError, SheetFieldLabel, SubPageHeader, type MenuItem } from "./SubPageParts";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiClientError || error instanceof Error ? error.message : fallback;
}

function ProfileSheet({ open, profile, onClose }: { open: boolean; profile: UserProfile | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { updateAuthUser } = useAuth();
  const formId = useId();
  const nameId = useId();
  const safeId = useId();
  const [name, setName] = useState("");
  const [safeText, setSafeText] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(profile?.name ?? "");
      setSafeText(profile && Number(profile.safeBalanceLimit) > 0 ? amountToInput(profile.safeBalanceLimit) : "");
      setError(null);
    }
  }, [open, profile]);

  const saveMutation = useMutation({
    mutationFn: (safeBalanceLimit: number) => updateUserProfile({ name: name.trim(), safeBalanceLimit: String(safeBalanceLimit) }),
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKeys.profile, saved);
      updateAuthUser({ name: saved.name, safeBalanceLimit: saved.safeBalanceLimit });
      void queryClient.invalidateQueries({ queryKey: queryKeys.summary });
      showSnack({ title: "Profil disimpan", mood: "happy" });
      onClose();
    },
    onError: (caughtError) => setError(errorMessage(caughtError, "Profil belum tersimpan. Coba lagi."))
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const safe = safeText.trim() ? parseAmountInput(safeText) : 0;

    if (!name.trim()) {
      setError("Nama tidak boleh kosong.");
      return;
    }

    if (safe === null || safe < 0) {
      setError("Saldo aman harus berupa angka, misalnya 500.000.");
      return;
    }

    setError(null);
    saveMutation.mutate(safe);
  }

  return (
    <BottomSheet
      footer={
        <StickerButton form={formId} fullWidth isLoading={saveMutation.isPending} type="submit">
          Simpan
        </StickerButton>
      }
      onClose={onClose}
      open={open}
      subtitle={profile?.email}
      title="Ubah profil"
    >
      <form id={formId} noValidate onSubmit={handleSubmit}>
        <SheetFieldLabel className="mt-1" htmlFor={nameId}>
          Nama
        </SheetFieldLabel>
        <input
          autoComplete="name"
          className="saku-line min-h-[50px] w-full rounded-saku-control bg-saku-paper px-3.5 text-base font-extrabold text-saku-ink outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30"
          id={nameId}
          maxLength={100}
          onChange={(event) => setName(event.target.value)}
          value={name}
        />

        <SheetFieldLabel htmlFor={safeId}>Saldo aman (boleh kosong)</SheetFieldLabel>
        <div className="saku-line flex min-h-[56px] items-baseline gap-2 rounded-saku-control bg-saku-paper px-3.5 py-1.5 focus-within:ring-4 focus-within:ring-saku-accent/30">
          <span aria-hidden="true" className="font-saku-head text-lg font-semibold text-saku-muted">
            Rp
          </span>
          <input
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent font-saku-head leading-10 font-semibold text-saku-ink outline-none placeholder:text-saku-muted/60"
            id={safeId}
            inputMode="decimal"
            onChange={(event) => setSafeText(formatAmountInput(event.target.value))}
            placeholder="0"
            style={{ fontSize: "26px" }}
            value={safeText}
          />
        </div>
        <p className="mt-1.5 px-1 text-xs font-bold text-saku-muted">
          Uang yang ingin selalu tersisa. Saku memperingatkan kalau saldomu turun di bawahnya.
        </p>

        {error ? <SheetError>{error}</SheetError> : null}
      </form>
    </BottomSheet>
  );
}

/** Akun dan keamanan: profile, password reset, app version, privacy and account deletion. */
export function AkunPage() {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const app = useAppVersion();

  const profileQuery = useQuery({
    queryKey: queryKeys.profile,
    queryFn: getUserProfile,
    staleTime: 5 * 60_000
  });
  const profile = profileQuery.data ?? null;
  const name = profile?.name ?? user?.name ?? "Pengguna Sakuin";
  const email = profile?.email ?? user?.email ?? "";
  const safeLimit = Number(profile?.safeBalanceLimit ?? user?.safeBalanceLimit ?? 0);

  const resetMutation = useMutation({
    mutationFn: () => requestPasswordReset({ email }),
    onSuccess: () => showSnack({ title: "Link ganti password dikirim", detail: `Cek email ${email}`, mood: "happy" }),
    onError: (caughtError) =>
      showSnack({ title: "Link belum terkirim", detail: errorMessage(caughtError, "Coba lagi sebentar lagi."), mood: "worried" })
  });

  async function handleCheckAppVersion() {
    const latest = await app.check();
    if (!latest) {
      showSnack({ title: "Cek versi belum berhasil", detail: "Periksa koneksi lalu coba lagi.", mood: "worried" });
    } else if (!app.installed) {
      showSnack({ title: "Versi terpasang belum terbaca", detail: "Tutup aplikasi sepenuhnya lalu buka lagi.", mood: "worried" });
    } else if (latest.latestVersionCode > app.installed.code) {
      showSnack({ title: `APK v${latest.latestVersionName} tersedia`, detail: "Ketuk lagi untuk mengunduh.", mood: "happy" });
    } else {
      showSnack({ title: "APK sudah versi terbaru", detail: `Terpasang v${app.installed.name}.`, mood: "happy" });
    }
  }

  const appItem: MenuItem = app.isApk
    ? app.installed
      ? app.updateAvailable
        ? {
            icon: Smartphone,
            tint: "#fff0b3",
            title: `Perbarui ke v${app.latest?.latestVersionName}`,
            subtitle: `Terpasang v${app.installed.name}. Ketuk untuk mengunduh`,
            onClick: app.openDownload
          }
        : {
            icon: Smartphone,
            tint: "#d6f3f7",
            title: "Aplikasi Android",
            subtitle: app.checking
              ? "Mengecek versi terbaru…"
              : app.latest
                ? `v${app.installed.name} · sudah versi terbaru`
                : `Terpasang v${app.installed.name} · belum dapat cek versi terbaru`,
            onClick: () => void handleCheckAppVersion()
          }
      : {
          icon: Smartphone,
          tint: "#fff0b3",
          title: "Aplikasi Android",
          subtitle: "Versi terpasang belum dapat dibaca",
          onClick: () => void handleCheckAppVersion()
        }
    : {
        icon: Smartphone,
        tint: "#d6f3f7",
        title: "Pasang aplikasi Android",
        subtitle: app.latest ? `Versi terbaru v${app.latest.latestVersionName}, ada widget layar HP` : "Ada widget layar HP",
        onClick: app.openDownload
      };

  const security: MenuItem[] = [
    {
      icon: KeyRound,
      tint: "#e7ddff",
      title: "Ganti password",
      subtitle: resetMutation.isPending ? "Mengirim link…" : "Kirim link ganti password ke email",
      onClick: () => resetMutation.mutate()
    }
  ];

  const data: MenuItem[] = [
    { icon: FileLock2, tint: "#ebe8f2", title: "Kebijakan privasi", subtitle: "Data apa yang disimpan Sakuin", to: "/privacy" },
    {
      icon: Trash2,
      tint: "#ffe1dc",
      title: "Hapus akun",
      subtitle: "Minta hapus akun dan semua catatan",
      to: "/account-deletion",
      danger: true
    }
  ];

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-xl pb-4">
        <SubPageHeader title="Akun dan keamanan" />

        <StickerCard className="mt-3.5 flex items-center gap-3 px-3.5 py-3">
          <span
            aria-hidden="true"
            className="saku-line-thin flex size-12 shrink-0 items-center justify-center rounded-full bg-saku-coin font-saku-head text-lg font-semibold"
          >
            {getInitials(name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-saku-head text-xl font-semibold">{name}</p>
            <p className="truncate text-xs font-bold text-saku-muted">{email}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs font-bold text-saku-muted">
              <ShieldCheck aria-hidden="true" className="size-3.5" strokeWidth={2.4} />
              {safeLimit > 0 ? `Saldo aman ${formatPlainAmount(safeLimit)}` : "Saldo aman belum diatur"}
            </p>
          </div>
          <StickerButton aria-label="Ubah profil" onClick={() => setEditing(true)} size="md" variant="plain">
            <UserRound aria-hidden="true" className="size-4" strokeWidth={2.6} />
            Ubah
          </StickerButton>
        </StickerCard>

        <MenuSection label="Keamanan">
          {security.map((item) => (
            <MenuRow isLast item={item} key={item.title} />
          ))}
        </MenuSection>

        <MenuSection label="Aplikasi">
          <MenuRow isLast item={appItem} />
        </MenuSection>

        <MenuSection label="Data dan privasi">
          {data.map((item, index) => (
            <MenuRow isLast={index === data.length - 1} item={item} key={item.title} />
          ))}
        </MenuSection>
      </div>

      <FloatingSnackHost />
      <ProfileSheet onClose={() => setEditing(false)} open={editing} profile={profile} />
    </AppShell>
  );
}
