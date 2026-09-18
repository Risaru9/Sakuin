import { useCallback, useEffect, useState } from "react";
import { showSnack } from "../../components/saku";
import {
  applyTransactionReminderPolicy,
  DEFAULT_TRANSACTION_REMINDER_SETTINGS,
  getNotificationPermission,
  getTransactionReminderSettings,
  isNativePlatform,
  sendTestTransactionReminder,
  setTransactionReminderSettings,
  subscribeBrowserToPushReminder,
  unsubscribeBrowserFromPushReminder,
  type TransactionReminderSettings
} from "../../lib/transaction-reminder";
import { useAuth } from "../auth/auth-context";
import { getRemoteReminderSettings, updateRemoteReminderSettings } from "./reminder.service";

function errorText(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

/**
 * The daily reminder switch: local settings (which drive the phone's own notification), the
 * server copy (which drives web push), and the notification permission.
 */
export function useReminderSettings() {
  const { user } = useAuth();
  const userId = user?.id;
  const [settings, setSettings] = useState<TransactionReminderSettings>(() =>
    applyTransactionReminderPolicy(userId ? getTransactionReminderSettings(userId) : DEFAULT_TRANSACTION_REMINDER_SETTINGS)
  );
  const [permission, setPermission] = useState("default");
  const [busy, setBusy] = useState(false);

  const refreshPermission = useCallback(() => {
    void getNotificationPermission().then(setPermission);
  }, []);

  const save = useCallback(
    (next: TransactionReminderSettings) => {
      const policySettings = applyTransactionReminderPolicy(next);
      setSettings(policySettings);
      setTransactionReminderSettings(userId, policySettings);
      updateRemoteReminderSettings(policySettings).catch(() => {
        // The phone keeps using the local copy; the server catches up on the next change.
      });
    },
    [userId]
  );

  useEffect(() => {
    setSettings(applyTransactionReminderPolicy(getTransactionReminderSettings(userId)));
    refreshPermission();

    let cancelled = false;
    getRemoteReminderSettings()
      .then((remote) => {
        if (cancelled) {
          return;
        }

        const policySettings = applyTransactionReminderPolicy({
          enabled: remote.enabled,
          frequency: remote.frequency,
          eveningHour: remote.eveningHour,
          quietStartHour: remote.quietStartHour,
          quietEndHour: remote.quietEndHour,
          maxPerDay: remote.maxPerDay,
          timezoneOffsetMinutes: remote.timezoneOffsetMinutes
        });
        setSettings(policySettings);
        setTransactionReminderSettings(userId, policySettings);
      })
      .catch(() => {
        // Local settings stay usable while the server is unreachable.
      });

    function handleExternalChange() {
      setSettings(applyTransactionReminderPolicy(getTransactionReminderSettings(userId)));
      refreshPermission();
    }

    window.addEventListener("sakuin:transaction-reminder-settings", handleExternalChange);
    return () => {
      cancelled = true;
      window.removeEventListener("sakuin:transaction-reminder-settings", handleExternalChange);
    };
  }, [userId, refreshPermission]);

  const setEnabled = useCallback(
    async (enabled: boolean) => {
      setBusy(true);

      try {
        if (enabled) {
          await subscribeBrowserToPushReminder();
        } else {
          await unsubscribeBrowserFromPushReminder();
        }

        save({ ...settings, enabled });
        showSnack(
          enabled
            ? { title: "Pengingat aktif", detail: "Saku mengingatkan tiap malam pukul 20.00", mood: "happy" }
            : { title: "Pengingat dimatikan", mood: "happy" }
        );
      } catch (caughtError) {
        const nextPermission = await getNotificationPermission();
        setPermission(nextPermission);

        if (enabled && nextPermission === "granted") {
          // Push to the server failed, but the notification can still show while Sakuin is open.
          save({ ...settings, enabled: true });
          showSnack({ title: "Pengingat aktif", detail: "Muncul saat Sakuin sedang terbuka.", mood: "happy" });
        } else {
          showSnack({
            title: enabled ? "Notifikasi belum bisa aktif" : "Belum bisa dimatikan",
            detail: errorText(caughtError, "Coba lagi sebentar lagi."),
            mood: "worried"
          });

          if (enabled) {
            save({ ...settings, enabled: false });
          }
        }
      } finally {
        refreshPermission();
        setBusy(false);
      }
    },
    [refreshPermission, save, settings]
  );

  const sendTest = useCallback(async () => {
    try {
      await sendTestTransactionReminder();
      showSnack({
        title: "Tes notifikasi dikirim",
        detail: isNativePlatform() ? "Cek bagian atas layar HP." : "Cek notifikasi browser.",
        mood: "happy"
      });
    } catch (caughtError) {
      showSnack({ title: "Tes notifikasi gagal", detail: errorText(caughtError, "Izinkan notifikasi dulu."), mood: "worried" });
    } finally {
      refreshPermission();
    }
  }, [refreshPermission]);

  return { settings, permission, busy, setEnabled, sendTest };
}
