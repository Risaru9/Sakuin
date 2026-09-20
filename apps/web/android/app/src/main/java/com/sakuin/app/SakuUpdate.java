package com.sakuin.app;

import android.app.AlarmManager;
import android.app.DownloadManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import androidx.core.content.FileProvider;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * Sakuin is installed outside Play Store, so it checks for its own updates: once a day even
 * when closed, then downloads the APK and opens Android's install screen. Android always asks
 * the user to confirm the install; nothing happens silently.
 */
final class SakuUpdate {
    static final String CHANNEL = "sakuin_update";
    private static final int NOTIFICATION_ID = 5001;
    private static final long DAY = 24 * 60 * 60 * 1000L;

    static int installedCode(Context c) {
        try { return c.getPackageManager().getPackageInfo(c.getPackageName(), 0).versionCode; }
        catch (Exception e) { return Integer.MAX_VALUE; }
    }

    /** The daily check, also re-armed after boot, after an update and from the app. */
    static void scheduleCheck(Context c) {
        AlarmManager m = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        PendingIntent alarm = PendingIntent.getBroadcast(c, NOTIFICATION_ID,
                new Intent(c, SakuUpdateReceiver.class).setAction(SakuUpdateReceiver.ACTION_CHECK),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        long next = System.currentTimeMillis() + DAY;
        if (Build.VERSION.SDK_INT >= 23) m.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next, alarm);
        else m.set(AlarmManager.RTC_WAKEUP, next, alarm);
    }

    /** Reads the published version; returns it only when it is newer than the installed one. */
    static JSONObject newerVersion(Context c) {
        String base = SakuStore.prefs(c).getString("api_url", "https://sakuin-api.vercel.app").replaceAll("/+$", "");
        try {
            HttpURLConnection conn = (HttpURLConnection) new URL(base + "/api/app-version").openConnection();
            conn.setConnectTimeout(4000); conn.setReadTimeout(4000);
            conn.setRequestProperty("Accept", "application/json");
            StringBuilder raw = new StringBuilder();
            try (BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                String line; while ((line = in.readLine()) != null) raw.append(line);
            }
            conn.disconnect();
            JSONObject data = new JSONObject(raw.toString()).optJSONObject("data");
            if (data != null && data.optInt("latestVersionCode") > installedCode(c) && !data.optString("apkDownloadUrl").isEmpty()) return data;
        } catch (Exception ignored) { }
        return null;
    }

    /** One notification per published version, so a declined update is not repeated every day. */
    static void notifyIfNew(Context c) {
        JSONObject version = newerVersion(c);
        if (version == null || !SakuNotifications.enabled(c, "update")) return;
        SharedPreferences p = SakuStore.prefs(c);
        int code = version.optInt("latestVersionCode");
        if (p.getInt("update_notified", 0) == code) return;
        p.edit().putInt("update_notified", code).apply();
        JSONArray notes = version.optJSONArray("releaseNotes");
        String body = notes != null && notes.length() > 0 ? notes.optString(0) : "Ketuk untuk memperbarui.";
        // Tapping starts the download here in the app; the install screen opens when it finishes.
        SakuNotifications.action(c, NOTIFICATION_ID, CHANNEL, "Update Sakuin " + version.optString("latestVersionName") + " sudah ada",
                body + " Ketuk untuk memperbarui.", R.drawable.saku_notif_wow, "Perbarui",
                new Intent(c, SakuUpdateReceiver.class).setAction(SakuUpdateReceiver.ACTION_DOWNLOAD)
                        .putExtra("url", version.optString("apkDownloadUrl")).putExtra("name", version.optString("latestVersionName")));
    }

    /** Downloads the APK with Android's own downloader; the receiver opens the installer. */
    static long download(Context c, String url, String versionName) {
        SharedPreferences p = SakuStore.prefs(c);
        DownloadManager manager = (DownloadManager) c.getSystemService(Context.DOWNLOAD_SERVICE);
        if (manager == null) return 0;
        cancelDownload(c);
        File file = new File(c.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "sakuin-update.apk");
        if (file.exists() && !file.delete()) return 0;
        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url))
                .setTitle("Sakuin " + versionName)
                .setDescription("Mengunduh pembaruan")
                .setMimeType("application/vnd.android.package-archive")
                .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE)
                .setDestinationUri(Uri.fromFile(file));
        long id = manager.enqueue(request);
        p.edit().putLong("update_download", id).apply();
        return id;
    }

    static void cancelDownload(Context c) {
        long id = SakuStore.prefs(c).getLong("update_download", 0);
        DownloadManager manager = (DownloadManager) c.getSystemService(Context.DOWNLOAD_SERVICE);
        if (id != 0 && manager != null) manager.remove(id);
        SakuStore.prefs(c).edit().remove("update_download").apply();
    }

    /** 0-100 while downloading, 100 when finished, -1 when there is no download or it failed. */
    static int progress(Context c) {
        long id = SakuStore.prefs(c).getLong("update_download", 0);
        DownloadManager manager = (DownloadManager) c.getSystemService(Context.DOWNLOAD_SERVICE);
        if (id == 0 || manager == null) return -1;
        try (Cursor cursor = manager.query(new DownloadManager.Query().setFilterById(id))) {
            if (cursor == null || !cursor.moveToFirst()) return -1;
            int status = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
            if (status == DownloadManager.STATUS_FAILED) return -1;
            if (status == DownloadManager.STATUS_SUCCESSFUL) return 100;
            long total = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES));
            long done = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
            return total <= 0 ? 0 : (int) Math.min(99, done * 100 / total);
        } catch (Exception e) { return -1; }
    }

    /** Opens Android's install screen for the downloaded file; the user taps Update there. */
    static void install(Context c) {
        File file = new File(c.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "sakuin-update.apk");
        if (!file.exists()) return;
        Uri uri = FileProvider.getUriForFile(c, c.getPackageName() + ".fileprovider", file);
        Intent intent = new Intent(Intent.ACTION_INSTALL_PACKAGE).setDataAndType(uri, "application/vnd.android.package-archive")
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        try { c.startActivity(intent); } catch (Exception ignored) { }
    }
}
