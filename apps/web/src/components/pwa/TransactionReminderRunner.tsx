import { useEffect } from "react";
import { useAuth } from "../../features/auth/auth-context";
import {
  getTransactionReminderSettings,
  sendTransactionReminder,
  shouldSendTransactionReminder
} from "../../lib/transaction-reminder";

const REMINDER_CHECK_INTERVAL_MS = 60_000;

export function TransactionReminderRunner() {
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let isSending = false;
    let isDisposed = false;

    async function checkReminder() {
      if (isDisposed || isSending) {
        return;
      }

      const settings = getTransactionReminderSettings(user?.id);

      if (
        !shouldSendTransactionReminder({
          userId: user?.id,
          settings
        })
      ) {
        return;
      }

      try {
        isSending = true;
        await sendTransactionReminder(user?.id);
      } catch {
        // Reminder should never interrupt the user's main app flow.
      } finally {
        isSending = false;
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void checkReminder();
      }
    }

    void checkReminder();

    const intervalId = window.setInterval(
      () => void checkReminder(),
      REMINDER_CHECK_INTERVAL_MS
    );

    window.addEventListener(
      "sakuin:transaction-reminder-settings",
      checkReminder
    );
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isDisposed = true;
      window.clearInterval(intervalId);
      window.removeEventListener(
        "sakuin:transaction-reminder-settings",
        checkReminder
      );
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isAuthenticated, user?.id]);

  return null;
}
