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
  Bell,
  BellOff,
  CheckCircle2,
  Clock3,
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
import {
  DEFAULT_TRANSACTION_REMINDER_SETTINGS,
  getBrowserNotificationPermission,
  getTransactionReminderSettings,
  requestBrowserNotificationPermission,
  setTransactionReminderSettings,
  type TransactionReminderFrequency,
  type TransactionReminderSettings
} from "../../lib/transaction-reminder";
import { useAuth } from "../auth/auth-context";
import { getUserProfile, updateUserProfile } from "./profile.service";
import type { UpdateUserProfileInput, UserProfile } from "./profile.types";

const MAX_SAFE_BALANCE_LIMIT = 1_000_000_000_000;
const MAX_SAFE_BALANCE_LIMIT_LABEL = "Rp 1.000.000.000.000";

type ProfileFormState = {
  name: string;
  safeBalanceLimit: string;
};

const reminderFrequencyOptions: Array<{
  value: TransactionReminderFrequency;
  label: string;
}> = [
  {
    value: "EVENING",
    label: "Sekali malam"
  },
  {
    value: "EVERY_1_HOUR",
    label: "Setiap 1 jam"
  },
  {
    value: "EVERY_2_HOURS",
    label: "Setiap 2 jam"
  },
  {
    value: "EVERY_4_HOURS",
    label: "Setiap 4 jam"
  }
];

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

function getNotificationPermissionLabel(permission: string) {
  if (permission === "granted") {
    return "Diizinkan";
  }

  if (permission === "denied") {
    return "Diblokir browser";
  }

  if (permission === "unsupported") {
    return "Tidak didukung";
  }

  return "Belum diminta";
}

function getHourOptions() {
  return Array.from({ length: 24 }, (_, hour) => ({
    value: hour,
    label: `${String(hour).padStart(2, "0")}:00`
  }));
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
  const [reminderSettings, setReminderSettingsState] =
    useState<TransactionReminderSettings>(
      DEFAULT_TRANSACTION_REMINDER_SETTINGS
    );
  const [notificationPermission, setNotificationPermission] = useState(() =>
    getBrowserNotificationPermission()
  );

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
      queryClient.setQueryData<UserProfile>(queryKeys.profile, updatedProfile);

      setForm({
        name: updatedProfile.name,
        safeBalanceLimit: toFormSafeBalanceLimit(updatedProfile.safeBalanceLimit)
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
      const message =
        "Safe balance limit wajib diisi. Gunakan 0 jika tidak ingin memakai batas aman.";

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

  function saveReminderSettings(settings: TransactionReminderSettings) {
    setTransactionReminderSettings(user?.id, settings);
  }

  async function handleReminderEnabledChange(enabled: boolean) {
    if (enabled) {
      const permission = await requestBrowserNotificationPermission();

      setNotificationPermission(permission);

      if (permission !== "granted") {
        addToast({
          variant: "error",
          title: "Notifikasi belum aktif",
          description:
            "Browser belum memberi izin notifikasi. Kamu masih bisa memakai Review Harian di Dashboard."
        });

        return;
      }
    }

    saveReminderSettings({
      ...reminderSettings,
      enabled
    });

    addToast({
      variant: enabled ? "success" : "info",
      title: enabled ? "Pengingat transaksi aktif" : "Pengingat transaksi mati",
      description: enabled
        ? "Sakuin akan mengingatkan sesuai batas yang kamu pilih."
        : "Sakuin tidak akan mengirim pengingat transaksi dari browser ini."
    });
  }

  function updateReminderSettings(updates: Partial<TransactionReminderSettings>) {
    saveReminderSettings({
      ...reminderSettings,
      ...updates
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

  useEffect(() => {
    setReminderSettingsState(getTransactionReminderSettings(user?.id));
    setNotificationPermission(getBrowserNotificationPermission());

    function handleReminderSettingsChange() {
      setReminderSettingsState(getTransactionReminderSettings(user?.id));
      setNotificationPermission(getBrowserNotificationPermission());
    }

    window.addEventListener(
      "sakuin:transaction-reminder-settings",
      handleReminderSettingsChange
    );

    return () => {
      window.removeEventListener(
        "sakuin:transaction-reminder-settings",
        handleReminderSettingsChange
      );
    };
  }, [user?.id]);

  const displayedName = profile?.name ?? user?.name ?? "User";
  const displayedEmail = profile?.email ?? user?.email ?? "-";
  const displayedSafeLimit =
    profile?.safeBalanceLimit ?? user?.safeBalanceLimit ?? "0";
  const hourOptions = getHourOptions();

  return (
    <AppShell profileName={displayedName} profileEmail={displayedEmail}>
      <div className="mx-auto w-full max-w-7xl space-y-5 pb-6">
        <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-white via-indigo-50/70 to-violet-50 p-4 shadow-xl shadow-slate-950/5 sm:rounded-[2rem] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-black text-indigo-700 ring-1 ring-indigo-100">
                Sakuin Profile
              </p>

              <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Pengaturan Akun
              </h1>

              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                Kelola nama akun dan batas saldo aman untuk membantu dashboard
                membaca kondisi keuanganmu.
              </p>
            </div>

            <Button
              className="w-full rounded-2xl bg-white text-slate-950 shadow-sm hover:bg-slate-50 sm:w-auto"
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
        </section>

        {queryError || error ? (
          <div className="rounded-[1.25rem] border border-rose-200 bg-rose-50 p-4 text-rose-800 shadow-sm sm:rounded-2xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="min-w-0">
                <p className="font-black">Terjadi kesalahan</p>
                <p className="mt-1 break-words text-sm font-medium leading-6 text-rose-700">
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

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="min-w-0 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-xl shadow-slate-950/5 sm:rounded-[2rem]">
            <div className="border-b border-slate-100 p-4 sm:p-6">
              <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.1rem] bg-indigo-100 text-indigo-700 sm:h-14 sm:w-14 sm:rounded-[1.25rem]">
                  <UserCircle className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-black text-indigo-700">
                      Profile
                    </p>

                    {isBackgroundFetching ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-black text-indigo-700">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Sync
                      </span>
                    ) : null}
                  </div>

                  <h2 className="mt-1 truncate text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                    {displayedName}
                  </h2>

                  <p className="mt-1 truncate text-sm font-medium text-slate-500">
                    {displayedEmail}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6">
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

                  <div className="space-y-2">
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

                    <p className="text-xs font-semibold leading-5 text-slate-500">
                      Hanya angka. Minimal Rp 0 dan maksimal{" "}
                      {MAX_SAFE_BALANCE_LIMIT_LABEL}.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                      Fungsi safe balance limit
                    </p>
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                      Jika saldo berada di bawah batas ini, dashboard akan
                      menampilkan status <strong>Waspada</strong>. Jika saldo
                      berada di atas batas ini, dashboard akan menampilkan status{" "}
                      <strong>Aman</strong>.
                    </p>
                  </div>

                  <div className="grid gap-3 pt-2 sm:grid-cols-2">
                    <Button
                      className="min-h-12 rounded-2xl bg-slate-950 text-white hover:bg-black"
                      disabled={isSubmitting}
                      isLoading={isSubmitting}
                      type="submit"
                    >
                      <Save className="h-4 w-4" />
                      Simpan Profile
                    </Button>

                    <Link
                      className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-950 shadow-sm transition hover:bg-slate-100"
                      to="/dashboard"
                    >
                      Kembali ke Dashboard
                    </Link>
                  </div>
                </form>
              )}
            </div>
          </section>

          <aside className="grid min-w-0 gap-5 sm:grid-cols-2 xl:grid-cols-1">
            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[2rem] sm:p-5">
              <p className="text-sm font-black text-slate-950">Ringkasan</p>

              <div className="mt-4 grid gap-3">
                <div className="min-w-0 rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold text-slate-500">
                    Email akun
                  </p>
                  <p className="mt-1 truncate text-sm font-black text-slate-950">
                    {displayedEmail}
                  </p>
                </div>

                <div className="min-w-0 rounded-2xl bg-indigo-50 p-4">
                  <p className="text-xs font-bold text-indigo-700">
                    Safe balance limit
                  </p>
                  <p className="mt-1 break-words text-xl font-black text-indigo-700">
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
            </section>

            <section className="rounded-[1.75rem] border border-indigo-100 bg-white p-4 shadow-sm sm:rounded-[2rem] sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-950">
                    Pengingat Transaksi
                  </p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                    Notifikasi berhenti otomatis jika review harian sudah
                    selesai.
                  </p>
                </div>

                <div
                  className={
                    reminderSettings.enabled
                      ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700"
                      : "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600"
                  }
                >
                  {reminderSettings.enabled ? (
                    <Bell className="h-5 w-5" />
                  ) : (
                    <BellOff className="h-5 w-5" />
                  )}
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black text-slate-700">
                      Status notifikasi
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-500">
                      {getNotificationPermissionLabel(notificationPermission)}
                    </p>
                  </div>

                  <button
                    className={
                      reminderSettings.enabled
                        ? "inline-flex min-h-10 items-center justify-center rounded-2xl bg-slate-950 px-4 text-xs font-black text-white transition hover:bg-black"
                        : "inline-flex min-h-10 items-center justify-center rounded-2xl bg-indigo-700 px-4 text-xs font-black text-white transition hover:bg-indigo-800"
                    }
                    onClick={() =>
                      void handleReminderEnabledChange(!reminderSettings.enabled)
                    }
                    type="button"
                  >
                    {reminderSettings.enabled ? "Matikan" : "Aktifkan"}
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Frekuensi
                  </span>
                  <select
                    className="mt-1 min-h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
                    value={reminderSettings.frequency}
                    onChange={(event) =>
                      updateReminderSettings({
                        frequency: event.target
                          .value as TransactionReminderFrequency
                      })
                    }
                  >
                    {reminderFrequencyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Maksimal per hari
                  </span>
                  <select
                    className="mt-1 min-h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
                    value={reminderSettings.maxPerDay}
                    onChange={(event) =>
                      updateReminderSettings({
                        maxPerDay: Number(event.target.value)
                      })
                    }
                  >
                    <option value={1}>1 kali</option>
                    <option value={2}>2 kali</option>
                    <option value={3}>3 kali</option>
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                      Jangan ganggu
                    </span>
                    <select
                      className="mt-1 min-h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
                      value={reminderSettings.quietStartHour}
                      onChange={(event) =>
                        updateReminderSettings({
                          quietStartHour: Number(event.target.value)
                        })
                      }
                    >
                      {hourOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                      Sampai
                    </span>
                    <select
                      className="mt-1 min-h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
                      value={reminderSettings.quietEndHour}
                      onChange={(event) =>
                        updateReminderSettings({
                          quietEndHour: Number(event.target.value)
                        })
                      }
                    >
                      {hourOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Jam malam
                  </span>
                  <select
                    className="mt-1 min-h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
                    value={reminderSettings.eveningHour}
                    onChange={(event) =>
                      updateReminderSettings({
                        eveningHour: Number(event.target.value)
                      })
                    }
                  >
                    {hourOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-2xl bg-indigo-50 p-3 text-xs font-semibold leading-5 text-indigo-800">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Default-nya 1 kali per hari. Pengingat ini tidak menampilkan
                  nominal, saldo, atau detail transaksi.
                </p>
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-rose-200 bg-white p-4 shadow-sm sm:rounded-[2rem] sm:p-5">
              <p className="text-sm font-black text-slate-950">Keluar Akun</p>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                Logout hanya menghapus sesi login dari browser ini. Data akun
                tetap tersimpan di backend.
              </p>

              <Button
                className="mt-4 min-h-12 w-full rounded-2xl bg-rose-600 text-white hover:bg-rose-700"
                onClick={handleLogout}
                variant="danger"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </section>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
