import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Loader2,
  LogOut,
  Save,
  UserCircle
} from "lucide-react";
import { AppShell } from "../../components/layout/AppShell";
import { useToast } from "../../components/toast/ToastProvider";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { ApiClientError } from "../../lib/api-client";
import { useAuth } from "../auth/auth-context";
import { getUserProfile, updateUserProfile } from "./profile.service";
import type { UserProfile } from "./profile.types";

type ProfileFormState = {
  name: string;
  safeBalanceLimit: string;
};

function getErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Terjadi kesalahan.";
}

function normalizeMoneyInput(value: string) {
  return value.replace(/\./g, "").replace(",", ".").trim();
}

function formatRupiah(value: string | number | null | undefined) {
  const numberValue = Number(value ?? 0);

  if (Number.isNaN(numberValue)) {
    return "Rp 0";
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(numberValue);
}

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { addToast } = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<ProfileFormState>({
    name: "",
    safeBalanceLimit: "0"
  });

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  async function loadProfile() {
    setIsLoadingProfile(true);
    setError(null);

    try {
      const data = await getUserProfile();

      setProfile(data);
      setForm({
        name: data.name,
        safeBalanceLimit: String(Math.trunc(Number(data.safeBalanceLimit ?? 0)))
      });
    } catch (caughtError) {
      const message = getErrorMessage(caughtError);

      setError(message);

      addToast({
        variant: "error",
        title: "Gagal mengambil profile",
        description: message
      });
    } finally {
      setIsLoadingProfile(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedSafeLimit = normalizeMoneyInput(form.safeBalanceLimit);
    const safeLimitNumber = Number(normalizedSafeLimit);

    if (!form.name.trim()) {
      const message = "Nama tidak boleh kosong.";

      setError(message);

      addToast({
        variant: "error",
        title: "Profile belum bisa disimpan",
        description: message
      });

      return;
    }

    if (
      !normalizedSafeLimit ||
      Number.isNaN(safeLimitNumber) ||
      safeLimitNumber < 0
    ) {
      const message = "Safe balance limit harus berupa angka minimal 0.";

      setError(message);

      addToast({
        variant: "error",
        title: "Profile belum bisa disimpan",
        description: message
      });

      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const updatedProfile = await updateUserProfile({
        name: form.name.trim(),
        safeBalanceLimit: normalizedSafeLimit
      });

      setProfile(updatedProfile);
      setForm({
        name: updatedProfile.name,
        safeBalanceLimit: String(
          Math.trunc(Number(updatedProfile.safeBalanceLimit ?? 0))
        )
      });

      addToast({
        variant: "success",
        title: "Profile berhasil diperbarui",
        description: "Nama dan batas saldo aman sudah tersimpan."
      });
    } catch (caughtError) {
      const message = getErrorMessage(caughtError);

      setError(message);

      addToast({
        variant: "error",
        title: "Gagal memperbarui profile",
        description: message
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleLogout() {
    addToast({
      variant: "info",
      title: "Logout berhasil",
      description: "Kamu sudah keluar dari akun Sakuin."
    });

    logout();

    navigate("/login", {
      replace: true
    });
  }

  useEffect(() => {
    void loadProfile();
  }, []);

  const displayedName = profile?.name ?? user?.name ?? "User";
  const displayedEmail = profile?.email ?? user?.email ?? "-";
  const displayedSafeLimit =
    profile?.safeBalanceLimit ?? user?.safeBalanceLimit ?? "0";

  return (
    <AppShell profileName={displayedName} profileEmail={displayedEmail}>
      <div className="mb-5">
        <p className="text-sm font-black text-indigo-700">Sakuin Profile</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">
          Pengaturan Akun
        </h1>
        <p className="mt-1 text-sm font-medium text-slate-500">
          Kelola nama akun dan batas saldo aman untuk dashboard.
        </p>
      </div>

      {error ? (
        <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-black">Terjadi kesalahan</p>
              <p className="mt-1 text-sm font-medium text-rose-700">
                {error}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-950/5 sm:rounded-[2rem] sm:p-7">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.25rem] bg-indigo-100 text-indigo-700">
              <UserCircle className="h-7 w-7" />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-black text-indigo-700">Profile</p>
              <h2 className="mt-1 truncate text-2xl font-black tracking-tight text-slate-950">
                {displayedName}
              </h2>
              <p className="mt-1 truncate text-sm font-medium text-slate-500">
                {displayedEmail}
              </p>
            </div>
          </div>

          {isLoadingProfile ? (
            <div className="flex min-h-52 items-center justify-center rounded-2xl bg-slate-50">
              <div className="flex items-center gap-3 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <p className="text-sm font-bold">Mengambil profile...</p>
              </div>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <Input
                label="Nama"
                name="name"
                type="text"
                placeholder="Masukkan nama"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value
                  }))
                }
              />

              <Input
                label="Safe balance limit"
                name="safeBalanceLimit"
                type="text"
                inputMode="numeric"
                placeholder="Contoh: 500000"
                value={form.safeBalanceLimit}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    safeBalanceLimit: event.target.value
                  }))
                }
              />

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500">
                  Fungsi safe balance limit
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Jika saldo kamu berada di bawah batas ini, dashboard akan
                  menampilkan status <strong>Waspada</strong>. Jika saldo berada
                  di atas batas ini, dashboard akan menampilkan status{" "}
                  <strong>Aman</strong>.
                </p>
              </div>

              <div className="grid gap-3 pt-2 sm:grid-cols-2">
                <Button
                  className="rounded-2xl bg-slate-950 text-white hover:bg-black"
                  disabled={isSubmitting}
                  isLoading={isSubmitting}
                  type="submit"
                >
                  <Save className="h-4 w-4" />
                  Simpan Profile
                </Button>

                <Link
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-950 shadow-sm transition hover:bg-slate-100"
                  to="/dashboard"
                >
                  Kembali ke Dashboard
                </Link>
              </div>
            </form>
          )}
        </div>

        <aside className="space-y-5">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:rounded-[2rem]">
            <p className="text-sm font-black text-slate-950">Ringkasan</p>

            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500">Email akun</p>
                <p className="mt-1 truncate text-sm font-black text-slate-950">
                  {displayedEmail}
                </p>
              </div>

              <div className="rounded-2xl bg-indigo-50 p-4">
                <p className="text-xs font-bold text-indigo-700">
                  Safe balance limit
                </p>
                <p className="mt-1 text-lg font-black text-indigo-700">
                  {formatRupiah(displayedSafeLimit)}
                </p>
              </div>

              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="text-xs font-bold text-emerald-700">
                  Status akun
                </p>
                <p className="mt-1 text-lg font-black text-emerald-700">
                  Aktif
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-rose-200 bg-white p-5 shadow-sm sm:rounded-[2rem]">
            <p className="text-sm font-black text-slate-950">Keluar Akun</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Logout akan menghapus sesi login dari browser ini. Data kamu tetap
              tersimpan di backend.
            </p>

            <Button
              className="mt-4 w-full rounded-2xl bg-rose-600 text-white hover:bg-rose-700"
              onClick={handleLogout}
              variant="danger"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}