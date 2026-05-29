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
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (ACTION_REFRESH.equals(intent.getAction()) || Intent.ACTION_USER_PRESENT.equals(intent.getAction())) {
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
            ComponentName thisAppWidget = new ComponentName(context.getPackageName(), SakuinFinanceWidgetProvider.class.getName());
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisAppWidget);
            onUpdate(context, appWidgetManager, appWidgetIds);
        }
    }

    private static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.sakuin_finance_widget);

        // Setup click to open main app
        Intent configIntent = new Intent(context, MainActivity.class);
        PendingIntent configPendingIntent = PendingIntent.getActivity(
                context, 0, configIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_mascot_container, configPendingIntent);

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

        // Fetch data in background thread
        new Thread(() -> {
            try {
                URL url = new URL(apiUrl + "/api/summary");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setRequestProperty("Accept", "application/json");
                conn.setConnectTimeout(5000);
                conn.setReadTimeout(5000);

                int responseCode = conn.getResponseCode();
                if (responseCode == HttpURLConnection.HTTP_OK) {
                    BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                    StringBuilder response = new StringBuilder();
                    String inputLine;
                    while ((inputLine = in.readLine()) != null) {
                        response.append(inputLine);
                    }
                    in.close();

                    JSONObject data = new JSONObject(response.toString());
                    double income = data.optDouble("incomeThisMonth", 0.0);
                    double expense = data.optDouble("expenseThisMonth", 0.0);
                    
                    JSONObject checkup = data.optJSONObject("financialCheckup");
                    String status = checkup != null ? checkup.optString("status", "GOOD") : "GOOD";

                    // Format amounts to IDR format
                    NumberFormat formatter = NumberFormat.getCurrencyInstance(new Locale("id", "ID"));
                    formatter.setMaximumFractionDigits(0);
                    String formattedIncome = formatter.format(income);
                    String formattedExpense = formatter.format(expense);

                    // Update UI elements in main thread
                    views.setTextViewText(R.id.widget_income, formattedIncome);
                    views.setTextViewText(R.id.widget_expense, formattedExpense);

                    if ("GOOD".equals(status)) {
                        views.setTextViewText(R.id.widget_status, "Hemat");
                        views.setTextColor(R.id.widget_status, android.graphics.Color.parseColor("#10B981"));
                        views.setImageViewResource(R.id.widget_mascot, R.drawable.sakuin_widget_mascot_safe);
                    } else {
                        views.setTextViewText(R.id.widget_status, "Waspada");
                        views.setTextColor(R.id.widget_status, android.graphics.Color.parseColor("#F59E0B"));
                        views.setImageViewResource(R.id.widget_mascot, R.drawable.sakuin_widget_mascot_watch);
                    }
                } else {
                    views.setTextViewText(R.id.widget_status, "Error API");
                }
            } catch (Exception e) {
                e.printStackTrace();
                views.setTextViewText(R.id.widget_status, "Error Koneksi");
            } finally {
                appWidgetManager.updateAppWidget(appWidgetId, views);
            }
        }).start();
    }
}
