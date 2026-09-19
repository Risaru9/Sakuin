package com.sakuin.app;
import android.content.*;
import org.json.JSONObject;

public class WeeklySummaryReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context c, Intent intent) {
        SakuNotifications.scheduleWeekly(c);
        if (Intent.ACTION_MY_PACKAGE_REPLACED.equals(intent.getAction())) SakuStore.refreshWidgets(c);
        if (!"com.sakuin.app.WEEKLY".equals(intent.getAction()) || !SakuNotifications.enabled(c, "weekly") || !SakuStore.loggedIn(c)) return;
        PendingResult pending = goAsync();
        SakuStore.IO.execute(() -> {
            try {
                SakuStore.Reply reply = SakuStore.request(c, "/api/summary/glance?date=" + SakuStore.today() + "&tz=" + SakuStore.offset(), null);
                JSONObject week = reply.data().optJSONObject("week");
                JSONObject note = week == null ? null : week.optJSONObject("notification");
                if (reply.code == 200 && note != null && SakuNotifications.enabled(c, "weekly")) {
                    SakuNotifications.post(c, 4001, "sakuin_weekly", note.optString("title"), note.optString("body"), R.drawable.saku_notif_happy, "/laporan");
                }
            } catch (Exception ignored) { }
            finally { pending.finish(); }
        });
    }
}
