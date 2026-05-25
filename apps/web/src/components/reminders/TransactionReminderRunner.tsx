import { useEffect, useState } from "react";
import { useAuth } from "../../features/auth/auth-context";
import {
  getTransactionReminderSettings,
  sendTransactionReminder,
  shouldSendTransactionReminder
} from "../../lib/transaction-reminder";

const REMINDER_CHECK_INTERVAL_MS = 60_000;

export function TransactionReminderRunner() {
  const { user, isAuthenticated } = useAuth();
  const [settingsVersion, setSettingsVersion] = useState(0);

  useEffect(() => {
    function handleSettingsChange() {
      setSettingsVersion((currentVersion) => currentVersion + 1);
    }

    window.addEventListener(
      "sakuin:transaction-reminder-settings",
      handleSettingsChange
    );

    return () => {
      window.removeEventListener(
        "sakuin:transaction-reminder-settings",
        handleSettingsChange
      );
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    const userId = user.id;
    let isCancelled = false;

    async function checkReminder() {
      if (isCancelled) {
        return;
      }

      const settings = getTransactionReminderSettings(userId);

      if (
        shouldSendTransactionReminder({
          userId,
          settings
        })
      ) {
        await sendTransactionReminder(userId);
      }
    }

    void checkReminder();

    const intervalId = window.setInterval(() => {
      void checkReminder();
    }, REMINDER_CHECK_INTERVAL_MS);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [isAuthenticated, settingsVersion, user]);

  return null;
}
