package com.sakuin.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.app.NotificationManager;
import android.content.Context;
import android.os.Environment;
import android.service.notification.StatusBarNotification;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.File;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;

/** Sakuin updates itself: notice a newer version, download the APK, ready the install screen. */
public class SakuUpdateTest {
    private static final byte[] APK = new byte[64 * 1024];
    private Context c;
    private ServerSocket server;
    private ExecutorService listener;

    @Before public void setup() throws Exception {
        c = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertTrue("Only run against the debuggable app", (c.getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0);
        server = new ServerSocket(0, 10, InetAddress.getByName("127.0.0.1"));
        SakuStore.prefs(c).edit().clear().putString("api_url", "http://127.0.0.1:" + server.getLocalPort()).commit();
        String version = new JSONObject().put("data", new JSONObject()
                .put("latestVersionCode", SakuUpdate.installedCode(c) + 1)
                .put("latestVersionName", "9.9.9")
                .put("apkDownloadUrl", "http://127.0.0.1:" + server.getLocalPort() + "/sakuin.apk")
                .put("releaseNotes", new JSONArray().put("Uji pembaruan."))).toString();
        listener = Executors.newSingleThreadExecutor();
        listener.execute(() -> {
            while (!server.isClosed()) try (Socket socket = server.accept()) {
                String request = new java.io.BufferedReader(new java.io.InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8)).readLine();
                boolean apk = request != null && request.contains("/sakuin.apk");
                byte[] body = apk ? APK : version.getBytes(StandardCharsets.UTF_8);
                OutputStream out = socket.getOutputStream();
                out.write(("HTTP/1.1 200 OK\r\nContent-Type: " + (apk ? "application/vnd.android.package-archive" : "application/json")
                        + "\r\nContent-Length: " + body.length + "\r\nConnection: close\r\n\r\n").getBytes(StandardCharsets.US_ASCII));
                out.write(body); out.flush();
            } catch (Exception ignored) { }
        });
    }

    @After public void cleanup() throws Exception {
        server.close(); listener.shutdownNow();
        SakuUpdate.cancelDownload(c);
        c.getSystemService(NotificationManager.class).cancelAll();
        SakuStore.prefs(c).edit().clear().commit();
    }

    @Test public void noticesDownloadsAndPreparesTheInstall() throws Exception {
        NotificationManager manager = c.getSystemService(NotificationManager.class);
        manager.cancelAll();

        JSONObject newer = SakuUpdate.newerVersion(c);
        assertNotNull("A higher versionCode must count as an update", newer);

        SakuUpdate.notifyIfNew(c);
        StatusBarNotification posted = null;
        for (int i = 0; i < 20 && posted == null; i++) {
            for (StatusBarNotification n : manager.getActiveNotifications()) if (n.getId() == 5001) posted = n;
            if (posted == null) Thread.sleep(250);
        }
        assertNotNull("Update notification must be posted", posted);
        assertEquals("Update Sakuin 9.9.9 sudah ada", posted.getNotification().extras.getString("android.title"));
        assertTrue("It must offer the update action itself", posted.getNotification().actions.length > 0);

        // The same version is announced once, so a declined update is not repeated every day.
        manager.cancelAll();
        SakuUpdate.notifyIfNew(c);
        Thread.sleep(600);
        assertEquals(0, manager.getActiveNotifications().length);

        SakuUpdate.download(c, newer.optString("apkDownloadUrl"), "9.9.9");
        for (int i = 0; i < 80 && SakuUpdate.progress(c) != 100; i++) Thread.sleep(500);
        assertEquals("Download must finish", 100, SakuUpdate.progress(c));
        File file = new File(c.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "sakuin-update.apk");
        assertEquals("Downloaded APK must be complete", APK.length, file.length());
    }
}
