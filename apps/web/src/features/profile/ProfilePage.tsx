import {
  useEffect,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent
} from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  BellOff,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Home,
  Loader2,
  LogOut,
  RefreshCcw,
  Repeat2,
  Save,
  ShieldCheck,
  Smartphone,
  UserCircle,
  WalletCards
} from "lucide-react";
import { AppShell } from "../../components/layout/AppShell";

import { ApkAppCard } from "../../components/pwa/ApkAppCard";
import { useToast } from "../../components/toast/ToastProvider";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { ApiClientError } from "../../lib/api-client";
import { queryKeys } from "../../lib/query-keys";
import {
  DEFAULT_TRANSACTION_REMINDER_SETTINGS,
  applyTransactionReminderPolicy,
  getNotificationPermission,
  getTransactionReminderSettings,
  setTransactionReminderSettings,
  sendTestTransactionReminder,
  subscribeBrowserToPushReminder,
  unsubscribeBrowserFromPushReminder,
  isNativePlatform,
  type TransactionReminderSettings
} from "../../lib/transaction-reminder";
import { useAuth } from "../auth/auth-context";
import {
  getRemoteReminderSettings,
  updateRemoteReminderSettings
} from "../reminders/reminder.service";
import { getCategories } from "../categories/category.service";
import {
  createRecurringRule,
  deleteRecurringRule,
  getRecurringRules,
  updateRecurringRule
} from "../recurring/recurring.service";
import { RecurringRuleManager } from "../recurring/RecurringRuleManager";
import type { RecurringRule } from "../recurring/recurring.types";
import { EmailDetectionCard } from "../email-imports/EmailDetectionCard";
import { getUserProfile, updateUserProfile } from "./profile.service";
import type { UpdateUserProfileInput, UserProfile } from "./profile.types";

const MAX_SAFE_BALANCE_LIMIT = 1_000_000_000_000;
const MAX_SAFE_BALANCE_LIMIT_LABEL = "Rp 1.000.000.000.000";

type ProfileFormState = {
  name: string;
  safeBalanceLimit: string;
};

type ProfileSection = "profile" | "automation" | "notifications" | "account";

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

function formatHourLabel(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function getReminderFrequencySummary(settings: TransactionReminderSettings) {
  return `Otomatis, maksimal ${settings.maxPerDay} kali per hari`;
}

export function ProfilePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
  const [notificationPermission, setNotificationPermission] = useState("default");
  const [notificationTestStatus, setNotificationTestStatus] = useState<
    "idle" | "sent" | "failed"
  >("idle");

  // Support deep link: /profile?section=notifications
  const initialSection = ((): ProfileSection => {
    const param = searchParams.get("section");
    if (param === "notifications" || param === "automation" || param === "account") {
      return param as ProfileSection;
    }
    return "profile";
  })();

  const [activeSection, setActiveSection] =
    useState<ProfileSection>(initialSection);
  const [pendingRecurringRuleId, setPendingRecurringRuleId] = useState<
    string | null
  >(null);

  const profileQuery = useQuery({
    queryKey: queryKeys.profile,
    queryFn: getUserProfile
  });

  const recurringQuery = useQuery({
    queryKey: queryKeys.recurring,
    queryFn: getRecurringRules
  });

  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => getCategories()
  });

  const profile = profileQuery.data ?? null;
  const recurringRules = recurringQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const isLoadingProfile = profileQuery.isLoading && !profileQuery.data;
  const isLoadingRecurring = recurringQuery.isLoading && !recurringQuery.data;
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
    const policySettings = applyTransactionReminderPolicy(settings);

    setReminderSettingsState(policySettings);
    setTransactionReminderSettings(user?.id, policySettings);

    updateRemoteReminderSettings(policySettings).catch((caughtError: unknown) => {
      const message = getErrorMessage(caughtError);

      addToast({
        variant: "error",
        title: "Pengaturan pengingat belum tersimpan",
        description: message
      });
    });
  }

  async function handleReminderEnabledChange(enabled: boolean) {
    try {
      if (enabled) {
        await subscribeBrowserToPushReminder();
        getNotificationPermission().then(setNotificationPermission);
      } else {
        await unsubscribeBrowserFromPushReminder();
      }

      saveReminderSettings({
        ...reminderSettings,
        enabled
      });

      addToast({
        variant: enabled ? "success" : "info",
        title: enabled
          ? "Pengingat transaksi aktif"
          : "Pengingat transaksi mati",
        description: enabled
          ? "Sakuin akan mengingatkan sesuai batas yang kamu pilih."
          : "Sakuin tidak akan mengirim pengingat transaksi dari browser ini."
      });
    } catch (caughtError) {
      const nextPermission = await getNotificationPermission();
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Browser belum bisa mengaktifkan pengingat transaksi.";

      setNotificationPermission(nextPermission);

      if (enabled && nextPermission === "granted") {
        saveReminderSettings({
          ...reminderSettings,
          enabled: true
        });

        addToast({
          variant: "info",
          title: "Pengingat lokal aktif",
          description: `Push server belum tersambung: ${message}. Sakuin tetap bisa mengingatkan saat app sedang terbuka.`
        });

        return;
      }

      addToast({
        variant: "error",
        title: "Notifikasi belum aktif",
        description: message
      });

      if (enabled) {
        saveReminderSettings({
          ...reminderSettings,
          enabled: false
        });
      } else {
        addToast({
          variant: "error",
          title: "Subscription belum bisa dimatikan",
          description: "Coba lagi beberapa saat lagi."
        });
      }
    }
  }

  async function handleTestNotification() {
    try {
      setNotificationTestStatus("idle");
      await sendTestTransactionReminder();
      getNotificationPermission().then(setNotificationPermission);
      setNotificationTestStatus("sent");

      addToast({
        variant: "success",
        title: "Tes notifikasi dikirim",
        description: isNativePlatform()
          ? "Notifikasi sistem HP akan muncul beberapa detik lagi."
          : "Notifikasi sistem browser akan muncul beberapa detik lagi."
      });
    } catch (caughtError) {
      getNotificationPermission().then(setNotificationPermission);
      setNotificationTestStatus("failed");

      addToast({
        variant: "error",
        title: "Tes notifikasi belum berhasil",
        description:
          caughtError instanceof Error
            ? caughtError.message
            : "Browser belum bisa menampilkan notifikasi Sakuin."
      });
    }
  }

  function updateReminderSettings(updates: Partial<TransactionReminderSettings>) {
    saveReminderSettings({
      ...reminderSettings,
      ...updates
    });
  }

  async function handleCreateRecurringRule(payload: {
    categoryId: string;
    type: "INCOME" | "EXPENSE";
    amount: string;
    frequency: "WEEKLY" | "MONTHLY";
    dayOfWeek?: number | null;
    dayOfMonth?: number | null;
    note?: string | null;
  }) {
    try {
      await createRecurringRule({
        ...payload,
        interval: 1,
        startDate: new Date().toISOString(),
        autoPost: true,
        isActive: true
      });

      void queryClient.invalidateQueries({ queryKey: queryKeys.recurring });
      void queryClient.invalidateQueries({ queryKey: queryKeys.summary });

      addToast({
        variant: "success",
        title: "Recurring rule tersimpan",
        description: "Transaksi rutin akan diproses saat jatuh tempo."
      });
    } catch (caughtError) {
      addToast({
        variant: "error",
        title: "Recurring rule gagal dibuat",
        description: getErrorMessage(caughtError)
      });

      throw caughtError;
    }
  }

  async function handleDeleteRecurringRule(ruleId: string) {
    setPendingRecurringRuleId(ruleId);

    try {
      await deleteRecurringRule(ruleId);
      void queryClient.invalidateQueries({ queryKey: queryKeys.recurring });
      void queryClient.invalidateQueries({ queryKey: queryKeys.summary });

      addToast({
        variant: "info",
        title: "Recurring rule dihapus",
        description: "Rule tidak akan membuat transaksi baru lagi."
      });
    } catch (caughtError) {
      addToast({
        variant: "error",
        title: "Recurring rule gagal dihapus",
        description: getErrorMessage(caughtError)
      });
    } finally {
      setPendingRecurringRuleId(null);
    }
  }

  async function handleToggleRecurringRule(rule: RecurringRule) {
    setPendingRecurringRuleId(rule.id);

    try {
      await updateRecurringRule(rule.id, {
        isActive: !rule.isActive
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.recurring });
      void queryClient.invalidateQueries({ queryKey: queryKeys.summary });

      addToast({
        variant: "success",
        title: !rule.isActive ? "Recurring rule aktif" : "Recurring rule pause",
        description: !rule.isActive
          ? "Rule akan diproses saat jatuh tempo."
          : "Rule berhenti sementara dan bisa diaktifkan lagi."
      });
    } catch (caughtError) {
      addToast({
        variant: "error",
        title: "Recurring rule gagal diubah",
        description: getErrorMessage(caughtError)
      });
    } finally {
      setPendingRecurringRuleId(null);
    }
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
    setReminderSettingsState(
      applyTransactionReminderPolicy(getTransactionReminderSettings(user?.id))
    );
    getNotificationPermission().then(setNotificationPermission);

    getRemoteReminderSettings()
      .then((settings) => {
        const nextSettings: TransactionReminderSettings = {
          enabled: settings.enabled,
          frequency: settings.frequency,
          eveningHour: settings.eveningHour,
          quietStartHour: settings.quietStartHour,
          quietEndHour: settings.quietEndHour,
          maxPerDay: settings.maxPerDay,
          timezoneOffsetMinutes: settings.timezoneOffsetMinutes
        };
        const policySettings = applyTransactionReminderPolicy(nextSettings);

        setReminderSettingsState(policySettings);
        setTransactionReminderSettings(user?.id, policySettings);
      })
      .catch(() => {
        // Local settings remain usable if backend sync is temporarily unavailable.
      });

    function handleReminderSettingsChange() {
      setReminderSettingsState(
        applyTransactionReminderPolicy(getTransactionReminderSettings(user?.id))
      );
      getNotificationPermission().then(setNotificationPermission);
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
  const recurringActiveCount = recurringRules.filter((rule) => rule.isActive).length;
  const profileSections: Array<{
    id: ProfileSection;
    label: string;
    description: string;
    icon: typeof UserCircle;
  }> = [
    {
      id: "profile",
      label: "Data diri",
      description: "Nama dan saldo aman",
      icon: UserCircle
    },
    {
      id: "automation",
      label: "Otomasi",
      description:
        recurringRules.length > 0
          ? `M-Banking + ${recurringActiveCount} rule aktif`
          : "M-Banking & recurring",
      icon: Repeat2
    },
    {
      id: "notifications",
      label: "Pengingat",
      description: reminderSettings.enabled ? "Aktif" : "Nonaktif",
      icon: Bell
    },
    {
      id: "account",
      label: "Akun & App",
      description: "PWA, hapus akun, logout",
      icon: ShieldCheck
    }
  ];

  return (
    <AppShell profileName={displayedName} profileEmail={displayedEmail}>
      <div className="mx-auto w-full max-w-6xl space-y-5 pb-6">
        <section className="overflow-hidden rounded-3xl border border-[var(--sakuin-border)] bg-white shadow-sm">
          <div className="flex min-h-32 items-start justify-between gap-4 bg-gradient-to-br from-[var(--sakuin-primary)] via-[var(--sakuin-secondary)] to-emerald-500 p-4 text-white sm:p-6">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-white/75">
                Akun
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-4xl">
                Profile Sakuin
              </h1>
            </div>

            <button
              aria-label="Refresh profile"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/25 transition hover:bg-white/25 disabled:opacity-60"
              disabled={profileQuery.isFetching}
              onClick={refreshProfile}
              type="button"
            >
              {profileQuery.isFetching ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <RefreshCcw className="h-5 w-5" />
              )}
            </button>
          </div>

          <div className="-mt-12 px-4 pb-4 sm:px-6 sm:pb-6">
            <div className="rounded-3xl border border-[var(--sakuin-border)] bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.12)] sm:p-5">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--sakuin-primary)] text-white ring-4 ring-white">
                  <UserCircle className="h-9 w-9" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <h2 className="truncate text-lg font-black tracking-tight text-[var(--sakuin-text)] sm:text-2xl">
                      {displayedName}
                    </h2>
                    {isBackgroundFetching ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--sakuin-primary)]" />
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-sm font-semibold text-zinc-500">
                    {displayedEmail}
                  </p>
                </div>

                <CheckCircle2 className="hidden h-6 w-6 shrink-0 text-emerald-600 sm:block" />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  className="inline-flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-2xl border border-[var(--sakuin-border)] bg-white px-3 text-sm font-black text-[var(--sakuin-text)] transition hover:bg-[var(--sakuin-primary-soft)]"
                  onClick={() => setActiveSection("profile")}
                  type="button"
                >
                  <UserCircle className="h-4 w-4 shrink-0" />
                  <span className="truncate">Lihat Profile</span>
                </button>

                <Link
                  className="inline-flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-2xl border border-[var(--sakuin-border)] bg-white px-3 text-sm font-black text-[var(--sakuin-text)] transition hover:bg-[var(--sakuin-primary-soft)]"
                  to="/dashboard"
                >
                  <Home className="h-4 w-4 shrink-0" />
                  <span className="truncate">Dashboard</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {queryError || error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 shadow-sm">
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

        <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
            <section className="overflow-hidden rounded-3xl border border-[var(--sakuin-border)] bg-white shadow-sm">
              <div className="bg-gradient-to-br from-emerald-400 via-cyan-500 to-[var(--sakuin-primary)] p-4 text-white sm:p-5">
                <div className="flex items-start gap-3">
                  <WalletCards className="mt-0.5 h-5 w-5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase text-white/80">
                      Safe balance limit
                    </p>
                    <p className="mt-2 break-words text-2xl font-black tracking-tight text-white">
                      {formatRupiah(displayedSafeLimit)}
                    </p>
                  </div>
                </div>
                <button
                  className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-white px-4 text-sm font-black text-[var(--sakuin-text)] shadow-sm transition hover:bg-[var(--sakuin-primary-soft)]"
                  onClick={() => setActiveSection("profile")}
                  type="button"
                >
                  Atur Limit
                </button>
              </div>
            </section>

            <nav className="overflow-hidden rounded-3xl border border-[var(--sakuin-border)] bg-white shadow-sm">
              {profileSections.map((section) => {
                const SectionIcon = section.icon;
                const isActive = activeSection === section.id;

                return (
                  <button
                    className={[
                      "flex w-full items-center gap-3 border-b border-[var(--sakuin-border)] px-4 py-4 text-left transition last:border-b-0",
                      isActive
                        ? "bg-[var(--sakuin-primary-soft)]"
                        : "bg-white hover:bg-zinc-50"
                    ].join(" ")}
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    type="button"
                  >
                    <span
                      className={[
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
                        isActive
                          ? "bg-[var(--sakuin-primary)] text-white"
                          : "bg-zinc-100 text-zinc-600"
                      ].join(" ")}
                    >
                      <SectionIcon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black text-[var(--sakuin-text)]">
                        {section.label}
                      </span>
                      <span className="mt-0.5 block truncate text-xs font-semibold text-zinc-500">
                        {section.description}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
                  </button>
                );
              })}
            </nav>
          </aside>

          <main className="min-w-0 space-y-5">
            {activeSection === "profile" ? (
              <section className="min-w-0 overflow-hidden rounded-3xl border border-[var(--sakuin-border)] bg-white shadow-sm">
                <div className="border-b border-[var(--sakuin-border)] p-4 sm:p-6">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--sakuin-primary)] text-white">
                      <UserCircle className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-[var(--sakuin-text)]">
                        Data Diri
                      </p>
                      <p className="mt-1 text-xs font-semibold text-zinc-500">
                        {displayedEmail}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-6">
                  {isLoadingProfile ? (
                    <div className="flex min-h-52 items-center justify-center rounded-2xl bg-[var(--sakuin-primary-soft)]">
                      <div className="flex items-center gap-3 text-zinc-600">
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
                        className="rounded-xl border-[var(--sakuin-border)] focus:border-[var(--sakuin-primary)] focus:ring-[var(--sakuin-focus)]/25"
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
                          className="rounded-xl border-[var(--sakuin-border)] focus:border-[var(--sakuin-primary)] focus:ring-[var(--sakuin-focus)]/25"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="Contoh: 500000"
                          value={form.safeBalanceLimit}
                          onKeyDown={preventInvalidSafeBalanceKey}
                          onChange={(event) =>
                            handleSafeBalanceChange(event.target.value)
                          }
                        />

                        <p className="text-xs font-semibold leading-5 text-zinc-600">
                          Minimal Rp 0 dan maksimal{" "}
                          {MAX_SAFE_BALANCE_LIMIT_LABEL}.
                        </p>
                      </div>

                      <Button
                        className="min-h-12 w-full rounded-xl bg-[var(--sakuin-secondary)] text-white hover:bg-[var(--sakuin-secondary)] focus-visible:ring-[var(--sakuin-focus)]"
                        disabled={isSubmitting}
                        isLoading={isSubmitting}
                        type="submit"
                      >
                        <Save className="h-4 w-4" />
                        Simpan Profile
                      </Button>
                    </form>
                  )}
                </div>
              </section>
            ) : null}

            {activeSection === "automation" ? (
              <div className="grid gap-5">
                <EmailDetectionCard />
                <RecurringRuleManager
                  categories={categories}
                  isLoading={isLoadingRecurring || categoriesQuery.isLoading}
                  onCreateRule={handleCreateRecurringRule}
                  onDeleteRule={handleDeleteRecurringRule}
                  onToggleRule={handleToggleRecurringRule}
                  pendingRuleId={pendingRecurringRuleId}
                  recurringRules={recurringRules}
                  title="Auto Recurring + Review Ringan"
                />
              </div>
            ) : null}

            {activeSection === "notifications" ? (
              <section className="rounded-3xl border border-[var(--sakuin-border)] bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-[var(--sakuin-text)]">
                    Pengingat Transaksi
                  </p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-zinc-600">
                    Notifikasi berhenti otomatis jika review harian sudah
                    selesai.
                  </p>
                </div>

                <div
                  className={
                    reminderSettings.enabled
                      ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--sakuin-primary)] text-white"
                      : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600"
                  }
                >
                  {reminderSettings.enabled ? (
                    <Bell className="h-5 w-5" />
                  ) : (
                    <BellOff className="h-5 w-5" />
                  )}
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-[var(--sakuin-primary-soft)] p-3">
                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-[var(--sakuin-text)]">
                      Izin notifikasi sistem
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-zinc-600">
                      {getNotificationPermissionLabel(notificationPermission)}
                    </p>
                    <p className="mt-1 text-xs font-medium leading-5 text-zinc-600">
                      Ini adalah notifikasi yang muncul di bar notifikasi HP,
                      bukan pesan di dalam aplikasi.
                    </p>
                    {notificationTestStatus === "sent" ? (
                      <p className="mt-2 text-xs font-black text-emerald-700">
                        Tes terkirim. Cek panel notifikasi HP/browser.
                      </p>
                    ) : null}
                    {notificationTestStatus === "failed" ? (
                      <p className="mt-2 text-xs font-black text-rose-700">
                        Tes belum berhasil. Cek izin notifikasi perangkat.
                      </p>
                    ) : null}
                  </div>

                  <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
                    <button
                      className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--sakuin-border)] bg-white px-4 text-xs font-black text-[var(--sakuin-text)] shadow-sm transition hover:bg-white/80"
                      onClick={() => void handleTestNotification()}
                      type="button"
                    >
                      Tes
                    </button>
                    <button
                      className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[var(--sakuin-secondary)] px-4 text-xs font-black text-white transition hover:bg-[var(--sakuin-secondary)]"
                      onClick={() =>
                        void handleReminderEnabledChange(!reminderSettings.enabled)
                      }
                      type="button"
                    >
                      {reminderSettings.enabled ? "Matikan" : "Aktifkan"}
                    </button>
                  </div>
                </div>

                {notificationPermission === "denied" && (
                  <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs font-medium leading-5 text-amber-800 border border-amber-200">
                    Notifikasi diblokir oleh perangkat/browser Anda. Aktifkan ulang izin notifikasi dari pengaturan OS/Aplikasi agar reminder Sakuin bisa berjalan.
                  </div>
                )}
              </div>

              <div className="mt-4 grid gap-2 rounded-2xl border border-[var(--sakuin-border)] bg-white p-3">
                <p className="text-xs font-black uppercase text-zinc-500">
                  Aturan anti-risih
                </p>

                <div className="grid gap-2 text-xs font-semibold leading-5 text-zinc-700">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--sakuin-text)]" />
                    <p>{getReminderFrequencySummary(reminderSettings)}.</p>
                  </div>

                  <div className="flex items-start gap-2">
                    <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--sakuin-text)]" />
                    <p>
                      Tidak mengganggu dari{" "}
                      {formatHourLabel(reminderSettings.quietStartHour)} sampai{" "}
                      {formatHourLabel(reminderSettings.quietEndHour)}.
                    </p>
                  </div>

                  <div className="flex items-start gap-2">
                    <BellOff className="mt-0.5 h-4 w-4 shrink-0 text-[var(--sakuin-text)]" />
                    <p>
                      Berhenti otomatis setelah review harian ditandai selesai.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-xs font-black uppercase text-zinc-500">
                      Jangan ganggu
                    </span>
                    <select
                      className="mt-1 min-h-11 w-full rounded-xl border border-[var(--sakuin-border)] bg-white px-3 text-sm font-bold text-[var(--sakuin-text)] outline-none transition focus:border-[var(--sakuin-primary)] focus:ring-4 focus:ring-[var(--sakuin-focus)]/25"
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
                    <span className="text-xs font-black uppercase text-zinc-500">
                      Sampai
                    </span>
                    <select
                      className="mt-1 min-h-11 w-full rounded-xl border border-[var(--sakuin-border)] bg-white px-3 text-sm font-bold text-[var(--sakuin-text)] outline-none transition focus:border-[var(--sakuin-primary)] focus:ring-4 focus:ring-[var(--sakuin-focus)]/25"
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
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-2xl bg-[var(--sakuin-primary-soft)] p-3 text-xs font-semibold leading-5 text-zinc-700">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Pengingat berjalan otomatis dengan aturan aplikasi. Pengingat
                  ini tidak menampilkan nominal, saldo, atau detail transaksi.
                </p>
              </div>
            </section>
            ) : null}

            {activeSection === "account" ? (
              <div className="grid gap-5 xl:grid-cols-2">

                <ApkAppCard />

                <section className="rounded-3xl border border-[var(--sakuin-border)] bg-white p-4 shadow-sm sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--sakuin-primary-soft)] text-[var(--sakuin-text)] ring-1 ring-[var(--sakuin-border)]">
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-[var(--sakuin-text)]">
                        Status Akun
                      </p>
                      <p className="mt-1 inline-flex items-center gap-2 text-sm font-black text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Aktif
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-[var(--sakuin-border)] bg-white p-4 shadow-sm sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--sakuin-primary)] text-white ring-1 ring-[var(--sakuin-border)]">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-[var(--sakuin-text)]">
                        Penghapusan Akun
                      </p>
                      <p className="mt-1 text-sm font-medium leading-6 text-zinc-600">
                        Request penghapusan akun dan data Sakuin.
                      </p>
                    </div>
                  </div>

                  <Link
                    className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-[var(--sakuin-border)] bg-white px-4 text-sm font-bold text-[var(--sakuin-text)] shadow-sm transition hover:bg-[var(--sakuin-primary-soft)]"
                    to="/account-deletion"
                  >
                    Request hapus akun
                  </Link>
                </section>

                <section className="rounded-3xl border border-rose-200 bg-white p-4 shadow-sm sm:p-5">
                  <p className="text-sm font-black text-[var(--sakuin-text)]">
                    Keluar Akun
                  </p>
                  <p className="mt-2 text-sm font-medium leading-6 text-zinc-600">
                    Logout dari browser ini.
                  </p>

                  <Button
                    className="mt-4 min-h-12 w-full rounded-xl bg-rose-600 text-white hover:bg-rose-700"
                    onClick={handleLogout}
                    variant="danger"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                </section>
              </div>
            ) : null}
          </main>
        </div>
      </div>
    </AppShell>
  );
}
