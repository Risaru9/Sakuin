import {
  useEffect,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  LogOut,
  RefreshCcw,
  Save,
  UserCircle
} from "lucide-react";
import { AppShell } from "../../components/layout/AppShell";
import { useToast } from "../../components/toast/ToastProvider";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { ApiClientError } from "../../lib/api-client";
import { queryKeys } from "../../lib/query-keys";
import { useAuth } from "../auth/auth-context";
import { getUserProfile, updateUserProfile } from "./profile.service";
import type { UpdateUserProfileInput, UserProfile } from "./profile.types";

const MAX_SAFE_BALANCE_LIMIT = 1_000_000_000_000;
const MAX_SAFE_BALANCE_LIMIT_LABEL = "Rp 1.000.000.000.000";

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

function sanitizeNumericInput(value: string) {
  const digitsOnly = value.replace(/\D/g, "");

  if (!digitsOnly) {
    return "";
  }

  const withoutLeadingZero = digitsOnly.replace(/^0+(?=\d)/, "");
  const numericValue = Number(withoutLeadingZero);

  if (!Number.isFinite(numericValue)) {
    return "";
  }

  if (numericValue > MAX_SAFE_BALANCE_LIMIT) {
    return String(MAX_SAFE_BALANCE_LIMIT);
  }

  return withoutLeadingZero;
}

function preventInvalidSafeBalanceKey(
  event: ReactKeyboardEvent<HTMLInputElement>
) {
  if (["-", "+", "e", "E", ".", ",", " "].includes(event.key)) {
    event.preventDefault();
  }
}

function normalizeMoneyInput(value: string) {
  return sanitizeNumericInput(value);
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

function toFormSafeBalanceLimit(value: string | number | null | undefined) {
  return sanitizeNumericInput(String(Math.trunc(Number(value ?? 0))));
}

export function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout, updateAuthUser } = useAuth();
  const { addToast } = useToast();

  const [form, setForm] = useState<ProfileFormState>({
    name: "",
    safeBalanceLimit: "0"
  });

  const [error, setError] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: queryKeys.profile,
    queryFn: getUserProfile
  });

  const profile = profileQuery.data ?? null;
  const isLoadingProfile = profileQuery.isLoading && !profileQuery.data;
  const isBackgroundFetching =
    profileQuery.isFetching && Boolean(profileQuery.data);

  const queryError =
    profileQuery.error && !profileQuery.data
      ? getErrorMessage(profileQuery.error)
      : null;

  const updateProfileMutation = useMutation({
    mutationFn: (input: UpdateUserProfileInput) => updateUserProfile(input),
    onMutate: async (input) => {
      setError(null);

      await queryClient.cancelQueries({
        queryKey: queryKeys.profile
      });

      const previousProfile = queryClient.getQueryData<UserProfile>(
        queryKeys.profile
      );

      const optimisticProfile: UserProfile = {
        id: previousProfile?.id ?? user?.id ?? "",
        name: input.name,
        email: previousProfile?.email ?? user?.email ?? "-",
        safeBalanceLimit: input.safeBalanceLimit,
        createdAt: previousProfile?.createdAt,
        updatedAt: new Date().toISOString()
      };

      queryClient.setQueryData<UserProfile>(
        queryKeys.profile,
        optimisticProfile
      );

      updateAuthUser({
        name: input.name,
        safeBalanceLimit: input.safeBalanceLimit
      });

      return {
        previousProfile
      };
    },
    onError: (caughtError, _input, context) => {
      if (context?.previousProfile) {
        queryClient.setQueryData(queryKeys.profile, context.previousProfile);

        updateAuthUser({
          name: context.previousProfile.name,
          safeBalanceLimit: context.previousProfile.safeBalanceLimit
        });
      }

      const message = getErrorMessage(caughtError);

      setError(message);

      addToast({
        variant: "error",
        title: "Gagal memperbarui profile",
        description: message
      });
    },
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData<UserProfile>(
        queryKeys.profile,
        updatedProfile
      );

      setForm({
        name: updatedProfile.name,
        safeBalanceLimit: toFormSafeBalanceLimit(
          updatedProfile.safeBalanceLimit
        )
      });

      updateAuthUser({
        name: updatedProfile.name,
        safeBalanceLimit: updatedProfile.safeBalanceLimit
      });

      addToast({
        variant: "success",
        title: "Profile berhasil diperbarui",
        description: "Nama dan batas saldo aman sudah tersimpan."
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.profile
      });

      void queryClient.invalidateQueries({
        queryKey: queryKeys.summary
      });
    }
  });

  const isSubmitting = updateProfileMutation.isPending;

  function refreshProfile() {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.profile
    });
  }

  function handleSafeBalanceChange(value: string) {
    const sanitizedValue = sanitizeNumericInput(value);

    setForm((current) => ({
      ...current,
      safeBalanceLimit: sanitizedValue
    }));

    if (Number(sanitizedValue || 0) > MAX_SAFE_BALANCE_LIMIT) {
      setError(`Safe balance limit maksimal ${MAX_SAFE_BALANCE_LIMIT_LABEL}.`);
    } else if (error?.includes("Safe balance limit")) {
      setError(null);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
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

    if (normalizedSafeLimit === "") {
      const message = "Safe balance limit wajib diisi. Gunakan 0 jika tidak ingin memakai batas aman.";

      setError(message);

      addToast({
        variant: "error",
        title: "Profile belum bisa disimpan",
        description: message
      });

      return;
    }

    if (
      Number.isNaN(safeLimitNumber) ||
      safeLimitNumber < 0 ||
      safeLimitNumber > MAX_SAFE_BALANCE_LIMIT
    ) {
      const message = `Safe balance limit harus angka 0 sampai ${MAX_SAFE_BALANCE_LIMIT_LABEL}.`;

      setError(message);

      addToast({
        variant: "error",
        title: "Profile belum bisa disimpan",
        description: message
      });

      return;
    }

    setError(null);

    updateProfileMutation.mutate({
      name: form.name.trim(),
      safeBalanceLimit: normalizedSafeLimit
    });
  }

  function handleLogout() {
    addToast({
      variant: "info",
      title: "Logout berhasil",
      description: "Kamu sudah keluar dari akun Sakuin."
    });

    queryClient.clear();
    logout();

    navigate("/login", {
      replace: true
    });
  }

  useEffect(() => {
    if (!profile) {
      return;
    }

    setForm({
      name: profile.name,
      safeBalanceLimit: toFormSafeBalanceLimit(profile.safeBalanceLimit)
    });
  }, [profile]);

  const displayedName = profile?.name ?? user?.name ?? "User";
  const displayedEmail = profile?.email ?? user?.email ?? "-";
  const displayedSafeLimit =
    profile?.safeBalanceLimit ?? user?.safeBalanceLimit ?? "0";

  return (
    <AppShell profileName={displayedName} profileEmail={displayedEmail}>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-indigo-700">Sakuin Profile</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Pengaturan Akun
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Kelola nama akun dan batas saldo aman untuk dashboard.
          </p>
        </div>

        <Button
          className="rounded-2xl"
          disabled={profileQuery.isFetching}
          onClick={refreshProfile}
          type="button"
          variant="secondary"
        >
          {profileQuery.isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCcw className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {queryError || error ? (
        <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-black">Terjadi kesalahan</p>
              <p className="mt-1 text-sm font-medium text-rose-700">
                {queryError ?? error}
              </p>

              {queryError ? (
                <button
                  className="mt-2 text-sm font-black underline"
                  onClick={refreshProfile}
                  type="button"
                >
                  Coba lagi
                </button>
              ) : null}
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
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-black text-indigo-700">Profile</p>

                {isBackgroundFetching ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-black text-indigo-700">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Sync
                  </span>
                ) : null}
              </div>

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
                pattern="[0-9]*"
                placeholder="Contoh: 500000"
                value={form.safeBalanceLimit}
                onKeyDown={preventInvalidSafeBalanceKey}
                onChange={(event) =>
                  handleSafeBalanceChange(event.target.value)
                }
              />

              <p className="-mt-2 text-xs font-medium text-slate-500">
                Hanya angka. Minimal Rp 0 dan maksimal{" "}
                {MAX_SAFE_BALANCE_LIMIT_LABEL}.
              </p>

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
                <p className="mt-1 inline-flex items-center gap-2 text-lg font-black text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
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