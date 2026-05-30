package com.sakuin.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.NumberFormat;
import java.util.Locale;

public class SakuinFinanceWidgetProvider extends AppWidgetProvider {

    private static final String PREFS_NAME = "SakuinWidgetPref";
    private static final String ACTION_REFRESH = "com.sakuin.app.action.REFRESH";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        if (appWidgetIds == null || appWidgetIds.length == 0) return;
        final PendingResult pendingResult = goAsync();
        new Thread(() -> {
            try {
                for (int appWidgetId : appWidgetIds) {
                    updateAppWidgetSync(context, appWidgetManager, appWidgetId);
                }
            } finally {
                if (pendingResult != null) {
                    pendingResult.finish();
                }
            }
        }).start();
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent); // This already routes APPWIDGET_UPDATE to onUpdate
        
        String action = intent.getAction();
        if (ACTION_REFRESH.equals(action)
                || Intent.ACTION_USER_PRESENT.equals(action)
                || Intent.ACTION_BOOT_COMPLETED.equals(action)) {
            
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
            ComponentName thisAppWidget = new ComponentName(context.getPackageName(), SakuinFinanceWidgetProvider.class.getName());
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisAppWidget);
            
            // Only manually call our new async update logic for these custom/system actions
            // APPWIDGET_UPDATE is handled by super.onReceive -> onUpdate
            onUpdate(context, appWidgetManager, appWidgetIds);
        }
    }

    private static void updateAppWidgetSync(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.sakuin_finance_widget);

        // Setup click to open main app
        Intent configIntent = new Intent(context, MainActivity.class);
        PendingIntent configPendingIntent = PendingIntent.getActivity(
                context, 0, configIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_mascot_container, configPendingIntent);

        // Setup refresh button click
        Intent refreshIntent = new Intent(context, SakuinFinanceWidgetProvider.class);
        refreshIntent.setAction(ACTION_REFRESH);
        PendingIntent refreshPendingIntent = PendingIntent.getBroadcast(
                context, 1, refreshIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_refresh_button, refreshPendingIntent);

        // Retrieve config from shared preferences
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String token = prefs.getString("jwt_token", null);
        String apiUrl = prefs.getString("api_url", null);

        if (token == null || apiUrl == null) {
            views.setTextViewText(R.id.widget_income, "Silakan login");
            views.setTextViewText(R.id.widget_expense, "di aplikasi");
            views.setTextViewText(R.id.widget_status, "Offline");
            views.setImageViewResource(R.id.widget_mascot, R.drawable.sakuin_widget_mascot_watch);
            appWidgetManager.updateAppWidget(appWidgetId, views);
            return;
        }

        // Show loading state temporarily (since this is sync now, it might update quickly)
        views.setTextViewText(R.id.widget_status, "Memuat...");
        appWidgetManager.updateAppWidget(appWidgetId, views);

        try {
            URL url = new URL(apiUrl + "/api/summary");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Authorization", "Bearer " + token);
            conn.setRequestProperty("Accept", "application/json");
            conn.setConnectTimeout(10000); // slightly longer timeout for robustness
            conn.setReadTimeout(10000);

            int responseCode = conn.getResponseCode();
            if (responseCode == HttpURLConnection.HTTP_OK) {
                BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                StringBuilder response = new StringBuilder();
                String inputLine;
                while ((inputLine = in.readLine()) != null) {
                    response.append(inputLine);
                }
                in.close();

                JSONObject root = new JSONObject(response.toString());
                JSONObject data = root.has("data") ? root.getJSONObject("data") : root;

                double income = data.optDouble("incomeThisMonth", 0.0);
                double expense = data.optDouble("expenseThisMonth", 0.0);

                JSONObject safeToSpend = data.optJSONObject("safeToSpend");
                String status = safeToSpend != null ? safeToSpend.optString("status", "SAFE") : "SAFE";

                NumberFormat formatter = NumberFormat.getCurrencyInstance(new Locale("id", "ID"));
                formatter.setMaximumFractionDigits(0);
                String formattedIncome = formatter.format(income);
                String formattedExpense = formatter.format(expense);

                views.setTextViewText(R.id.widget_income, formattedIncome);
                views.setTextViewText(R.id.widget_expense, formattedExpense);

                if ("SAFE".equals(status)) {
                    views.setTextViewText(R.id.widget_status, "Aman");
                    views.setTextColor(R.id.widget_status, android.graphics.Color.parseColor("#10B981"));
                    views.setImageViewResource(R.id.widget_mascot, R.drawable.sakuin_widget_mascot_safe);
                } else if ("WATCH".equals(status)) {
                    views.setTextViewText(R.id.widget_status, "Waspada");
                    views.setTextColor(R.id.widget_status, android.graphics.Color.parseColor("#F59E0B"));
                    views.setImageViewResource(R.id.widget_mascot, R.drawable.sakuin_widget_mascot_watch);
                } else {
                    views.setTextViewText(R.id.widget_status, "Boros");
                    views.setTextColor(R.id.widget_status, android.graphics.Color.parseColor("#EF4444"));
                    views.setImageViewResource(R.id.widget_mascot, R.drawable.sakuin_widget_mascot_watch);
                }
            } else if (responseCode == HttpURLConnection.HTTP_UNAUTHORIZED) {
                views.setTextViewText(R.id.widget_income, "Sesi habis");
                views.setTextViewText(R.id.widget_expense, "Login ulang");
                views.setTextViewText(R.id.widget_status, "Offline");
                views.setImageViewResource(R.id.widget_mascot, R.drawable.sakuin_widget_mascot_watch);
            } else {
                views.setTextViewText(R.id.widget_status, "Error " + responseCode);
            }
        } catch (Exception e) {
            e.printStackTrace();
            views.setTextViewText(R.id.widget_status, "Cek koneksi");
            views.setTextViewText(R.id.widget_income, "Rp -");
            views.setTextViewText(R.id.widget_expense, "Rp -");
        } finally {
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }
}
