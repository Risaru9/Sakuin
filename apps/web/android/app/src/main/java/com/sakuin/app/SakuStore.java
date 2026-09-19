package com.sakuin.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Intent;
import org.json.JSONArray;
import org.json.JSONObject;
import java.net.HttpURLConnection;
import java.net.URL;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.text.NumberFormat;
import java.util.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

final class SakuStore {
    static final ExecutorService IO = Executors.newSingleThreadExecutor();
    static SharedPreferences prefs(Context c) { return c.getSharedPreferences("SakuinWidgetPref", Context.MODE_PRIVATE); }
    static String today() { return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date()); }
    static int offset() { return -TimeZone.getDefault().getOffset(System.currentTimeMillis()) / 60000; }
    static String number(double value) {
        NumberFormat f = NumberFormat.getNumberInstance(new Locale("id", "ID"));
        f.setMaximumFractionDigits(0); return f.format(value);
    }
    static String owner(String token) {
        try {
            String payload = new String(android.util.Base64.decode(token.split("\\.")[1], android.util.Base64.URL_SAFE), StandardCharsets.UTF_8);
            JSONObject json = new JSONObject(payload);
            return json.optString("sub", json.optString("userId", token));
        } catch (Exception e) { return token == null ? "" : token; }
    }
    static String queueKey(Context c) { return "quick_queue_" + owner(prefs(c).getString("jwt_token", "")); }
    static boolean loggedIn(Context c) { return !prefs(c).getString("jwt_token", "").isEmpty(); }
    static final class Reply {
        final int code; final JSONObject json;
        Reply(int code, JSONObject json) { this.code = code; this.json = json; }
        JSONObject data() { JSONObject d = json.optJSONObject("data"); return d == null ? new JSONObject() : d; }
    }
    static Reply request(Context c, String path, JSONObject body) throws Exception {
        SharedPreferences p = prefs(c);
        String token = p.getString("jwt_token", "");
        String base = p.getString("api_url", "").replaceAll("/+$", "");
        if (token.isEmpty() || base.isEmpty()) return new Reply(401, new JSONObject());
        HttpURLConnection conn = (HttpURLConnection) new URL(base + path).openConnection();
        conn.setConnectTimeout(3500); conn.setReadTimeout(3500);
        conn.setRequestProperty("Authorization", "Bearer " + token);
        conn.setRequestProperty("Accept", "application/json");
        try {
            if (body != null) {
                conn.setRequestMethod("POST"); conn.setDoOutput(true);
                conn.setRequestProperty("Content-Type", "application/json");
                try (OutputStream out = conn.getOutputStream()) { out.write(body.toString().getBytes(StandardCharsets.UTF_8)); }
            }
            int code = conn.getResponseCode();
            InputStream stream = code < 400 ? conn.getInputStream() : conn.getErrorStream();
            StringBuilder raw = new StringBuilder();
            if (stream != null) try (BufferedReader in = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
                String line; while ((line = in.readLine()) != null) raw.append(line);
            }
            JSONObject json;
            try { json = new JSONObject(raw.toString()); } catch (Exception e) { json = new JSONObject(); }
            if (!owner(token).equals(owner(p.getString("jwt_token", "")))) return new Reply(409, new JSONObject().put("message", "Akun berubah. Buka Sakuin untuk memeriksa catatan."));
            return new Reply(code, json);
        } finally { conn.disconnect(); }
    }
    static JSONObject glance(Context c) {
        SharedPreferences p = prefs(c);
        String token = p.getString("jwt_token", "");
        if (token.isEmpty()) return null;
        try {
            Reply reply = request(c, "/api/summary/glance?date=" + today() + "&tz=" + offset(), null);
            if (!token.equals(p.getString("jwt_token", ""))) return null;
            if (reply.code == 401) {
                p.edit().remove("glance").remove("glance_at").putBoolean("auth_expired", true).apply(); return null;
            }
            if (reply.code == 200 && reply.json.optJSONObject("data") != null) {
                p.edit().putString("glance", reply.data().toString()).putLong("glance_at", System.currentTimeMillis()).putBoolean("auth_expired", false).apply();
                return reply.data();
            }
        } catch (Exception ignored) { }
        try { return new JSONObject(p.getString("glance", "")); } catch (Exception e) { return null; }
    }
    static JSONObject entry(String text) throws Exception {
        return new JSONObject().put("requestId", UUID.randomUUID().toString()).put("text", text).put("date", today()).put("tzOffsetMinutes", offset());
    }
    static synchronized JSONArray queue(Context c) {
        try { return new JSONArray(prefs(c).getString(queueKey(c), "[]")); } catch (Exception e) { return new JSONArray(); }
    }
    static synchronized void enqueue(Context c, JSONObject entry) {
        enqueue(c, queueKey(c), entry);
    }
    static synchronized void enqueue(Context c, String key, JSONObject entry) {
        JSONArray q;
        try { q = new JSONArray(prefs(c).getString(key, "[]")); } catch (Exception e) { q = new JSONArray(); }
        q.put(entry); prefs(c).edit().putString(key, q.toString()).commit();
    }
    // A single executor serializes saving and replay, including refreshes from both widgets.
    static void flush(Context c) {
        if (!loggedIn(c)) return;
        String key = queueKey(c);
        JSONArray q = queue(c);
        long deadline = System.currentTimeMillis() + 6000;
        while (q.length() > 0 && System.currentTimeMillis() < deadline && key.equals(queueKey(c))) {
            try {
                Reply reply = request(c, "/api/transactions/quick", q.getJSONObject(0));
                if (reply.code != 201 && reply.code != 400) return;
                q.remove(0); prefs(c).edit().putString(key, q.toString()).commit();
                if (reply.code == 201) SakuNotifications.budget(c, reply.data().optJSONArray("budgetAlerts"));
            } catch (Exception e) { return; }
        }
    }
    static void refreshWidgets(Context c) {
        for (Class<?> cls : new Class<?>[] { SakuinFinanceWidgetProvider.class, SakuinFinanceWidgetExtraProvider.class }) {
            int[] ids = AppWidgetManager.getInstance(c).getAppWidgetIds(new ComponentName(c, cls));
            if (ids.length > 0) c.sendBroadcast(new Intent(c, cls).setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE).putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids));
        }
    }
}
