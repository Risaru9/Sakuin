package com.sakuin.app;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import org.json.*;
import java.util.Calendar;

final class SakuNotifications {
    static boolean enabled(Context c, String key) {
        try { return new JSONObject(SakuStore.prefs(c).getString("notification_prefs", "{}")).optBoolean(key, true); }
        catch (Exception e) { return true; }
    }
    static void channels(Context c) {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager m = c.getSystemService(NotificationManager.class);
            m.createNotificationChannel(new NotificationChannel("sakuin_budget", "Batas kategori", NotificationManager.IMPORTANCE_HIGH));
            m.createNotificationChannel(new NotificationChannel("sakuin_bills", "Tagihan besok", NotificationManager.IMPORTANCE_HIGH));
            m.createNotificationChannel(new NotificationChannel("sakuin_weekly", "Ringkasan mingguan", NotificationManager.IMPORTANCE_DEFAULT));
        }
    }
    static void post(Context c, int id, String channel, String title, String body, int icon, String route) {
        channels(c);
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(c, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
        Intent intent = new Intent(c, MainActivity.class).putExtra("saku_route", route).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent tap = PendingIntent.getActivity(c, id, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        NotificationCompat.Builder b = new NotificationCompat.Builder(c, channel).setSmallIcon(R.drawable.ic_stat_saku)
                .setColor(Color.parseColor("#2B63E0")).setLargeIcon(BitmapFactory.decodeResource(c.getResources(), icon))
                .setContentTitle(title).setContentText(body).setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setContentIntent(tap).setAutoCancel(true);
        NotificationManagerCompat.from(c).notify(id, b.build());
    }
    static void budget(Context c, JSONArray alerts) {
        if (alerts == null || !enabled(c, "budget")) return;
        for (int i = 0; i < alerts.length(); i++) {
            JSONObject a = alerts.optJSONObject(i); if (a == null) continue;
            String key = a.optString("categoryId") + ":" + a.optInt("level");
            int hash = 0; for (int j = 0; j < key.length(); j++) hash = (hash * 31 + key.charAt(j)) % 900;
            post(c, 3000 + hash, "sakuin_budget", a.optString("title"), a.optString("body"), a.optInt("level") == 100 ? R.drawable.saku_notif_worried : R.drawable.saku_notif_wow, "/laporan");
        }
    }
    static void scheduleWeekly(Context c) {
        AlarmManager m = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        PendingIntent alarm = PendingIntent.getBroadcast(c, 4001, new Intent(c, WeeklySummaryReceiver.class).setAction("com.sakuin.app.WEEKLY"), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        if (!enabled(c, "weekly") || !SakuStore.loggedIn(c)) { m.cancel(alarm); return; }
        Calendar next = Calendar.getInstance();
        next.set(Calendar.HOUR_OF_DAY, 19); next.set(Calendar.MINUTE, 0); next.set(Calendar.SECOND, 0); next.set(Calendar.MILLISECOND, 0);
        int days = (Calendar.SUNDAY - next.get(Calendar.DAY_OF_WEEK) + 7) % 7;
        next.add(Calendar.DAY_OF_YEAR, days);
        if (next.getTimeInMillis() <= System.currentTimeMillis()) next.add(Calendar.DAY_OF_YEAR, 7);
        if (Build.VERSION.SDK_INT >= 23) m.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next.getTimeInMillis(), alarm);
        else m.set(AlarmManager.RTC_WAKEUP, next.getTimeInMillis(), alarm);
    }
}
