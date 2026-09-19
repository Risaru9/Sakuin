package com.sakuin.app;

import static org.junit.Assert.*;
import static androidx.test.espresso.Espresso.onView;
import static androidx.test.espresso.action.ViewActions.*;
import static androidx.test.espresso.assertion.ViewAssertions.matches;
import static androidx.test.espresso.matcher.ViewMatchers.*;
import android.content.*;
import android.graphics.Bitmap;
import android.widget.*;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.core.app.ActivityScenario;
import org.junit.*;
import org.junit.runner.RunWith;
import org.json.*;
import java.net.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;

@RunWith(AndroidJUnit4.class)
public class SakuNativeTest {
    Context c;
    ServerSocket server;
    volatile int quickCode = 201;
    volatile int glanceCode = 200;
    List<String> posted = Collections.synchronizedList(new ArrayList<>());
    ExecutorService listener;
    static final String GLANCE = "{\"success\":true,\"data\":{\"todayExpense\":43000,\"month\":{\"label\":\"September\",\"left\":1240500},\"budget\":{\"categoryName\":\"Makanan\",\"percent\":86,\"status\":\"watch\"},\"lastTransaction\":{\"name\":\"Kopi susu\",\"amount\":18000,\"type\":\"EXPENSE\"}}}";
    static final String SAVED = "{\"success\":true,\"data\":{\"transactions\":[{\"id\":\"test-coffee\",\"note\":\"Kopi susu\",\"amount\":18000,\"type\":\"EXPENSE\",\"category\":{\"name\":\"Makanan\"}}],\"budgetAlerts\":[],\"todayExpense\":61000}}";
    @Before public void setup() throws Exception {
        c = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertTrue("Only run against the debuggable app", (c.getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0);
        SakuStore.IO.submit(() -> {}).get(15, TimeUnit.SECONDS);
        SakuStore.prefs(c).edit().clear().commit();
        server = new ServerSocket(0, 10, InetAddress.getByName("127.0.0.1"));
        SakuStore.prefs(c).edit().putString("jwt_token", "test-token").putString("api_url", "http://127.0.0.1:" + server.getLocalPort()).putString("notification_prefs", "{\"budget\":false}").commit();
        listener = Executors.newSingleThreadExecutor();
        listener.execute(() -> {
            while (!server.isClosed()) try (Socket socket = server.accept()) {
                BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
                String request = in.readLine(); int length = 0; String header;
                while ((header = in.readLine()) != null && !header.isEmpty()) if (header.toLowerCase(Locale.US).startsWith("content-length:")) length = Integer.parseInt(header.split(":")[1].trim());
                char[] payload = new char[length]; int count = 0; while (count < length) { int n = in.read(payload, count, length-count); if (n < 0) break; count += n; }
                boolean quick = request.contains("/transactions/quick");
                if (quick) posted.add(new String(payload));
                int code = quick ? quickCode : glanceCode;
                String body = code == 400 ? "{\"message\":\"Nominalnya belum ketemu\"}" : quick ? SAVED : GLANCE;
                byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
                socket.getOutputStream().write(("HTTP/1.1 " + code + " OK\r\nContent-Type: application/json\r\nContent-Length: " + bytes.length + "\r\nConnection: close\r\n\r\n").getBytes(StandardCharsets.US_ASCII));
                socket.getOutputStream().write(bytes); socket.getOutputStream().flush();
            } catch (Exception ignored) { }
        });
    }
    @After public void cleanup() throws Exception {
        server.close(); listener.shutdownNow(); SakuStore.IO.submit(() -> {}).get(15, TimeUnit.SECONDS);
        SakuStore.prefs(c).edit().clear().commit();
    }
    private void drain() throws Exception {
        SakuStore.IO.submit(() -> {}).get(15, TimeUnit.SECONDS);
        InstrumentationRegistry.getInstrumentation().waitForIdleSync();
    }
    private void screenshot(String name) throws Exception {
        Bitmap image = InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();
        try (FileOutputStream out = new FileOutputStream(new File(c.getExternalFilesDir(null), name + ".png"))) { image.compress(Bitmap.CompressFormat.PNG, 100, out); }
    }
    @Test public void cacheSurvivesOfflineButNotExpiredAuth() throws Exception {
        assertEquals(43000, SakuStore.glance(c).getInt("todayExpense"));
        glanceCode = 503;
        assertEquals(43000, SakuStore.glance(c).getInt("todayExpense"));
        glanceCode = 401;
        assertNull(SakuStore.glance(c)); assertFalse(SakuStore.prefs(c).contains("glance"));
    }
    @Test public void queueReplaysInOrderAndDiscardsInvalidEntries() throws Exception {
        SakuStore.enqueue(c, SakuStore.entry("kopi 18rb")); SakuStore.enqueue(c, SakuStore.entry("parkir 5rb"));
        quickCode = 503; SakuStore.flush(c); assertEquals(2, SakuStore.queue(c).length());
        posted.clear(); quickCode = 201; SakuStore.flush(c); assertEquals(0, SakuStore.queue(c).length());
        assertEquals("kopi 18rb", new JSONObject(posted.get(0)).getString("text"));
        assertEquals("parkir 5rb", new JSONObject(posted.get(1)).getString("text"));
        SakuStore.enqueue(c, SakuStore.entry("tanpa nominal")); quickCode = 400; SakuStore.flush(c); assertEquals(0, SakuStore.queue(c).length());
    }
    @Test public void quickEntrySavesAndRetainsInvalidDraft() throws Exception {
        try (ActivityScenario<QuickEntryActivity> activity = ActivityScenario.launch(QuickEntryActivity.class)) {
            onView(withHint("Catat… misal kopi 18rb")).perform(replaceText("kopi 18rb"), pressImeActionButton()); drain();
            onView(withText("Hari ini keluar 61.000")).check(matches(isDisplayed()));
            onView(withText("Ubah")).check(matches(isDisplayed()));
            screenshot("quick-saved");
            quickCode = 400;
            onView(withHint("Catat lagi…")).perform(replaceText("kopi"), pressImeActionButton()); drain();
            onView(withText("Nominalnya belum ketemu")).check(matches(isDisplayed()));
            onView(withHint("Catat lagi…")).check(matches(withText("kopi")));
        }
    }
    @Test public void offlineSaveShowsPendingAndReplaysLater() throws Exception {
        quickCode = 503;
        try (ActivityScenario<QuickEntryActivity> activity = ActivityScenario.launch(QuickEntryActivity.class)) {
            onView(withHint("Catat… misal kopi 18rb")).perform(replaceText("kopi 18rb"), pressImeActionButton()); drain();
            assertEquals(1, SakuStore.queue(c).length()); screenshot("quick-offline");
            quickCode = 201; SakuStore.IO.submit(() -> SakuStore.flush(c)).get(); assertEquals(0, SakuStore.queue(c).length());
        }
    }
    @Test public void widgetLayoutsInflateAsRemoteViews() throws Exception {
        try (ActivityScenario<QuickEntryActivity> activity = ActivityScenario.launch(QuickEntryActivity.class)) {
            activity.onActivity(a -> {
                LinearLayout root = new LinearLayout(a); root.setOrientation(LinearLayout.VERTICAL); root.setBackgroundColor(android.graphics.Color.parseColor("#35415D")); root.setPadding(24,60,24,24);
                float density = a.getResources().getDisplayMetrics().density;
                for (int layout : new int[] {R.layout.sakuin_finance_widget_medium, R.layout.sakuin_finance_widget_extra}) {
                    android.view.View view = new RemoteViews(c.getPackageName(), layout).apply(a, root);
                    LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1, (int)(density * (layout == R.layout.sakuin_finance_widget_medium ? 164 : 264))); p.bottomMargin = 30; root.addView(view, p);
                }
                a.setContentView(root); a.getWindow().setSoftInputMode(android.view.WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_HIDDEN);
            });
            onView(withText("September")).check(matches(isDisplayed())); screenshot("widgets");
        }
    }
}
