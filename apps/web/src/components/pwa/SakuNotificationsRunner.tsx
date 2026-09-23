import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../features/auth/auth-context";
import { getRecurringRules } from "../../features/recurring/recurring.service";
import { queryKeys } from "../../lib/query-keys";
import {
  getSakuNotificationPrefs,
  pushSakuNotificationPrefsToNative,
  SAKU_NOTIFICATION_PREFS_EVENT,
  syncBillReminders
} from "../../lib/saku-notifications";
import { isNativePlatform } from "../../lib/transaction-reminder";

/**
 * Android app only: keeps "Tagihan besok" reminders in step with the Transaksi berulang
 * rules and tells the native side which Saku notifications are switched on.
 */
export function SakuNotificationsRunner() {
  const { isAuthenticated } = useAuth();
  const active = isAuthenticated && isNativePlatform();
  const [prefs, setPrefs] = useState(getSakuNotificationPrefs);
  const rulesQuery = useQuery({
    queryKey: queryKeys.recurring,
    queryFn: getRecurringRules,
    enabled: active,
    staleTime: 5 * 60 * 1000
  });

  useEffect(() => {
    if (!active) {
      return;
    }

    function handlePrefsChange() {
      setPrefs(getSakuNotificationPrefs());
    }

    pushSakuNotificationPrefsToNative(getSakuNotificationPrefs());
    window.addEventListener(SAKU_NOTIFICATION_PREFS_EVENT, handlePrefsChange);

    return () => window.removeEventListener(SAKU_NOTIFICATION_PREFS_EVENT, handlePrefsChange);
  }, [active]);

  useEffect(() => {
    if (active && rulesQuery.data) {
      void syncBillReminders(rulesQuery.data, prefs.bills);
    }
  }, [active, rulesQuery.data, prefs.bills]);

  return null;
}
