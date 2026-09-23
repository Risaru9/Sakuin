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
    static final String SAVED = "{\"success\":true,\"data\":{\"transactions\":[{\"id\":\"test-coffee\",\"note\":\"Kopi susu\",\"amount\":18000,\"type\":\"EXPENSE\",\"category\":{\"name\":\"Makanan\"}}],\"budgetAlerts\":[{\"categoryName\":\"Makanan\",\"spent\":86000,\"limit\":100000,\"level\":80}],\"todayExpense\":61000}}";
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
    private void waitForKeyboard(ActivityScenario<QuickEntryActivity> activity) throws Exception {
        for (int i=0;i<40;i++) {
            final boolean[] visible = {false};
            activity.onActivity(a -> { androidx.core.view.WindowInsetsCompat insets = androidx.core.view.ViewCompat.getRootWindowInsets(a.getWindow().getDecorView()); visible[0] = insets != null && insets.isVisible(androidx.core.view.WindowInsetsCompat.Type.ime()); });
            if (visible[0]) { Thread.sleep(500); return; }
            Thread.sleep(100);
        }
        fail("Quick entry keyboard must stay visible");
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
            onView(withHint("Catat… misal kopi 18rb")).perform(click(), replaceText("kopi 18rb"), pressImeActionButton()); drain();
            onView(withText("Hari ini keluar 61.000")).check(matches(isDisplayed()));
            onView(withText("Ubah")).check(matches(isDisplayed()));
            waitForKeyboard(activity);
            onView(withText("Hari ini keluar 61.000")).perform(scrollTo()).check(matches(isDisplayed())); screenshot("quick-saved");
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
        JSONObject data = new JSONObject(GLANCE).getJSONObject("data");
        data.put("todayExpense",180000); data.getJSONObject("month").put("left",671691);
        final android.app.Activity[] hostActivity = new android.app.Activity[1];
        final android.appwidget.AppWidgetHostView[] hosts = new android.appwidget.AppWidgetHostView[1];
        try (ActivityScenario<WidgetTestActivity> activity = ActivityScenario.launch(WidgetTestActivity.class)) {
            activity.onActivity(a -> {
                hostActivity[0] = a;
                LinearLayout root = new LinearLayout(a); root.setOrientation(LinearLayout.VERTICAL); root.setBackgroundColor(android.graphics.Color.parseColor("#35415D")); root.setPadding(24,60,24,24);
                float density = a.getResources().getDisplayMetrics().density;
                SakuinFinanceWidgetProvider provider = new SakuinFinanceWidgetProvider();
                // Launcher context, without AppCompat's factory replacing platform widget classes.
                android.appwidget.AppWidgetHostView view = new android.appwidget.AppWidgetHostView(c);
                hosts[0] = view;
                android.appwidget.AppWidgetProviderInfo info = android.appwidget.AppWidgetManager.getInstance(c).getInstalledProviders().stream().filter(p -> p.provider.equals(new ComponentName(c, provider.getProviderClass()))).findFirst().orElseThrow(AssertionError::new);
                view.setAppWidget(0,info); view.setPadding(0,0,0,0);
                view.updateAppWidget(provider.createViews(c,267,131,data,2));
                assertNotNull("RemoteViews must inflate, not show the host error placeholder",view.findViewById(R.id.widget_art));
                assertTrue(view.findViewById(R.id.widget_quick_add_button).hasOnClickListeners());
                LinearLayout.LayoutParams p = new LinearLayout.LayoutParams((int)(267*density), (int)(density * 131)); p.bottomMargin = 30; root.addView(view, p);
                a.setContentView(root); a.getWindow().setSoftInputMode(android.view.WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_HIDDEN);
            });
            InstrumentationRegistry.getInstrumentation().waitForIdleSync(); Thread.sleep(500); screenshot("widgets-267dp");
            activity.onActivity(a -> { assertSame("Host activity recreated",hostActivity[0],a); assertTrue(hosts[0].isAttachedToWindow()); assertNotNull("Host content missing",hosts[0].findViewById(R.id.widget_art)); hosts[0].findViewById(R.id.widget_quick_add_button).performClick(); });
            onView(withHint("Catat… misal kopi 18rb")).check(matches(isDisplayed()));
        }
    }

    @Test public void widgetStatesFitSmallLargeAndLandscapeSizes() throws Exception {
        JSONObject data = new JSONObject(GLANCE).getJSONObject("data");
        int[][] sizes = {{250,110},{267,131},{360,164},{420,200},{550,110},{250,180},{267,200},{360,268},{420,300},{550,180}};
        for (int i=0;i<sizes.length;i++) {
            for (String state : new String[] {"ok","watch","over","no-limit","login","offline","long"}) {
                JSONObject fixture = new JSONObject(data.toString());
                if (state.equals("no-limit")) { fixture.remove("budget"); fixture.put("topCategory",new JSONObject().put("categoryName","Pengeluaran Lainnya").put("amount",175000)); }
                else { fixture.getJSONObject("budget").put("status",state.equals("over") ? "over" : state.equals("watch") ? "watch" : "ok").put("percent",state.equals("over") ? 112 : state.equals("watch") ? 86 : 42); }
                if (state.equals("long")) { fixture.put("todayExpense",1234567890); fixture.getJSONObject("month").put("left",-9876543210d); fixture.getJSONObject("budget").put("categoryName","Kebutuhan rumah tangga dan keluarga"); }
                SakuWidgetDrawing drawing = new SakuWidgetDrawing(c,sizes[i][0],sizes[i][1],false,state.equals("login"),state.equals("offline") ? null : fixture,0,2);
                assertTrue(state+" quick action outside card", new android.graphics.RectF(0,0,sizes[i][0],sizes[i][1]).contains(drawing.quick));
                assertTrue(drawing.quick.width()>40); assertTrue(drawing.quick.height()>20);
                if (!drawing.refresh.isEmpty()) assertTrue(new android.graphics.RectF(0,0,sizes[i][0],sizes[i][1]).contains(drawing.refresh));
                assertTrue(drawing.bitmap.getAllocationByteCount() < 6000000);
                try (FileOutputStream out = new FileOutputStream(new File(c.getExternalFilesDir(null),"widget-"+sizes[i][0]+"x"+sizes[i][1]+"-"+state+".png"))) { drawing.bitmap.compress(Bitmap.CompressFormat.PNG,100,out); }
            }
        }
    }

    @Test public void quickEntryTypingMatchesMockup() throws Exception {
        try (ActivityScenario<QuickEntryActivity> activity = ActivityScenario.launch(QuickEntryActivity.class)) {
            onView(withHint("Catat… misal kopi 18rb")).perform(click(), replaceText("kopi susu 18rb"));
            onView(withText("Simpan")).check(matches(isDisplayed()));
            waitForKeyboard(activity); screenshot("quick-typing");
        }
    }

    @Test public void sixteenWidgetVariantsStayWithinMemoryBudget() throws Exception {
        float area = 16 * 420 * 300;
        float resolution = new SakuinFinanceWidgetProvider().resolution(c,area);
        long bytes = 0;
        for (int i=0;i<16;i++) {
            SakuWidgetDrawing drawing = new SakuWidgetDrawing(c,420,300,false,false,new JSONObject(GLANCE).getJSONObject("data"),0,resolution);
            bytes += drawing.bitmap.getAllocationByteCount(); drawing.bitmap.recycle();
        }
        assertTrue("Combined RemoteViews bitmaps exceed conservative budget: "+bytes,bytes < 6100000);
    }
}
