package com.sakuin.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.os.Bundle;
import android.view.View;
import android.content.*;
import android.widget.RemoteViews;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.*;

public class SakuinFinanceWidgetProvider extends AppWidgetProvider {
    public static final String ACTION_REFRESH = "com.sakuin.app.action.REFRESH";
    public static final String ACTION_PINNED = "com.sakuin.app.action.WIDGET_PINNED";
    public static final String ACTION_QUICK_TRANSACTION = "com.sakuin.app.action.QUICK_TRANSACTION";
    protected int getLayoutResource() { return R.layout.sakuin_finance_widget_medium; }
    protected Class<?> getProviderClass() { return SakuinFinanceWidgetProvider.class; }
    protected boolean isLarge() { return false; }

    @Override public void onUpdate(Context c, AppWidgetManager manager, int[] ids) {
        if (ids == null || ids.length == 0) return;
        final PendingResult pending = goAsync();
        SakuStore.IO.execute(() -> {
            try {
                SakuStore.flush(c);
                JSONObject data = SakuStore.glance(c);
                for (int id : ids) render(c, manager, id, data);
            } finally { if (pending != null) pending.finish(); }
        });
    }
    @Override public void onReceive(Context c, Intent intent) {
        super.onReceive(c, intent);
        String action = intent.getAction();
        if (ACTION_PINNED.equals(action)) {
            c.startActivity(new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        } else if (ACTION_REFRESH.equals(action) || Intent.ACTION_BOOT_COMPLETED.equals(action) || Intent.ACTION_USER_PRESENT.equals(action)) {
            AppWidgetManager m = AppWidgetManager.getInstance(c);
            onUpdate(c, m, m.getAppWidgetIds(new ComponentName(c, getProviderClass())));
        }
    }
    @Override public void onAppWidgetOptionsChanged(Context c, AppWidgetManager m, int id, Bundle options) {
        JSONObject cached = null;
        try { cached = new JSONObject(SakuStore.prefs(c).getString("glance", "")); } catch (Exception ignored) { }
        render(c, m, id, cached);
    }
    private void render(Context c, AppWidgetManager m, int id, JSONObject data) {
        RemoteViews v = new RemoteViews(c.getPackageName(), getLayoutResource());
        PendingIntent open = PendingIntent.getActivity(c, 100, new Intent(c, MainActivity.class), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        v.setOnClickPendingIntent(R.id.widget_root, open);
        boolean login = !SakuStore.loggedIn(c) || SakuStore.prefs(c).getBoolean("auth_expired", false);
        PendingIntent quick = PendingIntent.getActivity(c, 101, new Intent(c, QuickEntryActivity.class), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        v.setOnClickPendingIntent(R.id.widget_quick_add_button, login ? open : quick);
        if (isLarge()) {
            v.setOnClickPendingIntent(R.id.widget_refresh_button, PendingIntent.getBroadcast(c, 102, new Intent(c, getProviderClass()).setAction(ACTION_REFRESH), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        }
        if (login || data == null) {
            v.setTextViewText(R.id.widget_today_label, login ? "Masuk dulu, ya" : "Belum ada data");
            v.setTextViewText(R.id.widget_today, ""); v.setTextViewText(R.id.widget_left, "");
            v.setImageViewResource(R.id.widget_mascot, R.drawable.saku_wow);
            v.setViewVisibility(R.id.widget_budget_box, View.GONE);
            v.setViewVisibility(R.id.widget_budget_badge, View.GONE);
            v.setViewVisibility(R.id.widget_login_message, View.VISIBLE);
            v.setTextViewText(R.id.widget_login_message, login ? "Widget tampil setelah kamu masuk di aplikasi." : "Sambungkan internet untuk memuat catatan.");
            v.setTextViewText(R.id.widget_quick_add_button, login ? "Buka Sakuin" : "+ Catat");
            if (isLarge()) {
                v.setTextViewText(R.id.widget_month, "Sakuin"); v.setTextViewText(R.id.widget_updated, "");
                v.setTextViewText(R.id.widget_last, ""); v.setViewVisibility(R.id.widget_left_label, View.GONE);
            }
        } else {
            JSONObject month = data.optJSONObject("month");
            v.setTextViewText(R.id.widget_today, SakuStore.number(data.optDouble("todayExpense")));
            v.setTextViewText(R.id.widget_left, (isLarge() ? "" : "Sisa bulan ini ") + SakuStore.number(month == null ? 0 : month.optDouble("left")));
            JSONObject budget = data.optJSONObject("budget");
            String status = budget == null ? "ok" : budget.optString("status", "ok");
            v.setViewVisibility(R.id.widget_budget_box, View.VISIBLE);
            v.setViewVisibility(R.id.widget_budget_badge, View.VISIBLE);
            v.setImageViewResource(R.id.widget_mascot, "over".equals(status) ? R.drawable.saku_worried : "watch".equals(status) ? R.drawable.saku_wow : R.drawable.saku_happy);
            int[] bars = {R.id.widget_progress_ok, R.id.widget_progress_watch, R.id.widget_progress_over};
            String[] states = {"ok", "watch", "over"};
            for (int i = 0; i < bars.length; i++) {
                v.setViewVisibility(bars[i], budget != null && states[i].equals(status) ? View.VISIBLE : View.GONE);
                v.setProgressBar(bars[i], 100, budget == null ? 0 : Math.max(0, Math.min(100, budget.optInt("percent"))), false);
            }
            String line = "Belum ada pengeluaran bulan ini";
            if (budget != null) {
                line = budget.optString("categoryName") + ("over".equals(status) ? " lewat batas" : ("ok".equals(status) ? " baru " : " ") + budget.optInt("percent") + "% dari batas");
            } else {
                JSONObject top = data.optJSONObject("topCategory");
                if (top != null) line = top.optString("categoryName") + " " + SakuStore.number(top.optDouble("amount"));
            }
            v.setTextViewText(R.id.widget_budget, line);
            v.setTextColor(R.id.widget_budget, android.graphics.Color.parseColor("over".equals(status) ? "#C62828" : "watch".equals(status) ? "#8A5A00" : "#625D78"));
            if (isLarge()) {
                v.setTextViewText(R.id.widget_month, month == null ? "Sakuin" : month.optString("label"));
                long at = SakuStore.prefs(c).getLong("glance_at", 0);
                v.setTextViewText(R.id.widget_updated, at == 0 ? "" : "diperbarui " + new SimpleDateFormat("HH.mm", Locale.US).format(new Date(at)));
                JSONObject last = data.optJSONObject("lastTransaction");
                v.setTextViewText(R.id.widget_last, last == null ? "Belum ada catatan" : "Terakhir: " + last.optString("name") + ("INCOME".equals(last.optString("type")) ? " +" : " −") + SakuStore.number(last.optDouble("amount")));
            }
        }
        int minHeight = m.getAppWidgetOptions(id).getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, isLarge() ? 220 : 150);
        if ((!isLarge() && minHeight < 140) || (isLarge() && minHeight < 220)) {
            float density = c.getResources().getDisplayMetrics().density;
            int padding = (int) (8 * density);
            v.setViewPadding(R.id.widget_root, padding, padding, padding, padding);
            v.setViewPadding(R.id.widget_quick_add_button, padding, (int)(4 * density), padding, (int)(4 * density));
            v.setTextViewTextSize(R.id.widget_today, android.util.TypedValue.COMPLEX_UNIT_SP, 24);
            if (isLarge()) v.setTextViewTextSize(R.id.widget_left, android.util.TypedValue.COMPLEX_UNIT_SP, 20);
        }
        m.updateAppWidget(id, v);
    }
}
