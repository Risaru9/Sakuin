package com.sakuin.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.os.Build;
import android.os.Bundle;
import android.graphics.RectF;
import android.util.SizeF;
import android.view.View;
import android.content.*;
import android.widget.RemoteViews;
import org.json.JSONObject;
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

    private void render(Context c, AppWidgetManager manager, int id, JSONObject data) {
        Bundle options = manager.getAppWidgetOptions(id);
        ArrayList<SizeF> sizes = Build.VERSION.SDK_INT >= 31 ? options.getParcelableArrayList(AppWidgetManager.OPTION_APPWIDGET_SIZES) : null;
        if (Build.VERSION.SDK_INT >= 31 && sizes != null && !sizes.isEmpty() && sizes.size() <= 16) {
            Map<SizeF, RemoteViews> variants = new LinkedHashMap<>();
            float area = 0;
            for (SizeF s : sizes) area += Math.max(1,s.getWidth()) * Math.max(1,s.getHeight());
            float resolution = resolution(c, area);
            for (SizeF s : sizes) if (s.getWidth() > 0 && s.getHeight() > 0) variants.put(s, createViews(c,s.getWidth(),s.getHeight(),data,resolution));
            if (!variants.isEmpty()) { manager.updateAppWidget(id,new RemoteViews(variants)); return; }
        }
        float w = size(options,AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH,267);
        float h = size(options,AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT,isLarge() ? 200 : 131);
        float landscapeW = size(options,AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH,(int)w);
        float landscapeH = size(options,AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT,(int)h);
        float resolution = resolution(c,w*h+landscapeW*landscapeH);
        // Legacy launchers report portrait=minWidth/maxHeight, landscape=maxWidth/minHeight.
        manager.updateAppWidget(id,new RemoteViews(createViews(c,landscapeW,landscapeH,data,resolution),createViews(c,w,h,data,resolution)));
    }

    private int size(Bundle options,String key,int fallback) { int value = options.getInt(key,fallback); return value > 0 ? value : fallback; }

    float resolution(Context c, float area) {
        android.util.DisplayMetrics display = c.getResources().getDisplayMetrics();
        // Bound ALL variants together below the launcher's bitmap memory limit.
        float maxPixels = Math.min(1500000f, display.widthPixels * (float)display.heightPixels * .75f);
        return Math.min(display.density, (float)Math.sqrt(maxPixels / Math.max(1,area)));
    }

    RemoteViews createViews(Context c, float width, float height, JSONObject data, float resolution) {
        boolean login = !SakuStore.loggedIn(c) || SakuStore.prefs(c).getBoolean("auth_expired",false);
        SakuWidgetDrawing art = new SakuWidgetDrawing(c,width,height,isLarge(),login,data,SakuStore.prefs(c).getLong("glance_at",0),resolution);
        RemoteViews views = new RemoteViews(c.getPackageName(),R.layout.sakuin_widget_rendered);
        views.setImageViewBitmap(R.id.widget_art,art.bitmap);
        views.setContentDescription(R.id.widget_art,art.description);
        PendingIntent open = PendingIntent.getActivity(c,100,new Intent(c,MainActivity.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        PendingIntent quick = PendingIntent.getActivity(c,101,new Intent(c,QuickEntryActivity.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_art,open);
        views.setOnClickPendingIntent(R.id.widget_quick_add_button,login ? open : quick);
        views.setContentDescription(R.id.widget_quick_add_button,login ? "Buka Sakuin" : "Catat cepat");
        position(c,views,R.id.widget_quick_area,art.quick,width,height);
        views.setViewVisibility(R.id.widget_refresh_area,art.refresh.isEmpty() ? View.GONE : View.VISIBLE);
        if (!art.refresh.isEmpty()) {
            position(c,views,R.id.widget_refresh_area,art.refresh,width,height);
            views.setOnClickPendingIntent(R.id.widget_refresh_button,PendingIntent.getBroadcast(c,102,new Intent(c,getProviderClass()).setAction(ACTION_REFRESH),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE));
        }
        return views;
    }

    private void position(Context c, RemoteViews v, int id, RectF rect, float w, float h) {
        float density = c.getResources().getDisplayMetrics().density;
        v.setViewPadding(id,Math.round(rect.left*density),Math.round(rect.top*density),Math.round((w-rect.right)*density),Math.round((h-rect.bottom)*density));
    }
}
