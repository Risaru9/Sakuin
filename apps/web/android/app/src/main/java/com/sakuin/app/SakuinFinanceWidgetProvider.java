package com.sakuin.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.os.Bundle;
import android.view.View;
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
    public static final String ACTION_PINNED = "com.sakuin.app.action.WIDGET_PINNED";
    public static final String ACTION_QUICK_TRANSACTION = "com.sakuin.app.action.QUICK_TRANSACTION";

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
        if (ACTION_PINNED.equals(action)) {
            openHomeScreen(context);
            return;
        }

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

    @Override
    public void onAppWidgetOptionsChanged(
            Context context,
            AppWidgetManager appWidgetManager,
            int appWidgetId,
            Bundle newOptions) {
        updateAppWidgetSync(context, appWidgetManager, appWidgetId);
    }

    private static void openHomeScreen(Context context) {
        Intent homeIntent = new Intent(Intent.ACTION_MAIN);
        homeIntent.addCategory(Intent.CATEGORY_HOME);
        homeIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(homeIntent);
    }

    private static void updateAppWidgetSync(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.sakuin_finance_widget);
        WidgetSize widgetSize = getWidgetSize(appWidgetManager, appWidgetId);
        applyResponsiveLayout(views, widgetSize);

        // Setup click to open main app
        Intent configIntent = new Intent(context, MainActivity.class);
        PendingIntent configPendingIntent = PendingIntent.getActivity(
                context, 0, configIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_root, configPendingIntent);

        // Setup refresh button click
        Intent refreshIntent = new Intent(context, SakuinFinanceWidgetProvider.class);
        refreshIntent.setAction(ACTION_REFRESH);
        PendingIntent refreshPendingIntent = PendingIntent.getBroadcast(
                context, 1, refreshIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_refresh_button, refreshPendingIntent);

        Intent quickTransactionIntent = new Intent(context, MainActivity.class);
        quickTransactionIntent.setAction(ACTION_QUICK_TRANSACTION);
        quickTransactionIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent quickTransactionPendingIntent = PendingIntent.getActivity(
                context, 3, quickTransactionIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_quick_add_button, quickTransactionPendingIntent);

        // Retrieve config from shared preferences
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String token = prefs.getString("jwt_token", null);
        String apiUrl = prefs.getString("api_url", null);

        if (token == null || apiUrl == null) {
            views.setTextViewText(R.id.widget_balance, "Rp -");
            views.setTextViewText(R.id.widget_income, "Silakan login");
            views.setTextViewText(R.id.widget_expense, "di aplikasi");
            views.setTextViewText(R.id.widget_status, "Offline");
            views.setTextViewText(R.id.widget_ratio, "Belum sinkron");
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

                double balance = data.optDouble("balance", 0.0);
                double income = data.optDouble("incomeThisMonth", 0.0);
                double expense = data.optDouble("expenseThisMonth", 0.0);

                JSONObject safeToSpend = data.optJSONObject("safeToSpend");
                String status = classifyFinancialStatus(income, expense, safeToSpend);

                NumberFormat formatter = NumberFormat.getCurrencyInstance(new Locale("id", "ID"));
                formatter.setMaximumFractionDigits(0);
                String formattedBalance = formatter.format(balance);
                String formattedIncome = formatter.format(income);
                String formattedExpense = formatter.format(expense);
                int ratioPercent = income > 0 ? (int) Math.round((expense / income) * 100) : 0;

                views.setTextViewText(R.id.widget_balance, formattedBalance);
                views.setTextViewText(R.id.widget_income, formattedIncome);
                views.setTextViewText(R.id.widget_expense, formattedExpense);
                views.setTextViewText(R.id.widget_ratio, income > 0 ? "Pengeluaran " + ratioPercent + "% dari pemasukan" : "Mulai catat pemasukan bulan ini");

                if ("HEMAT".equals(status)) {
                    views.setTextViewText(R.id.widget_status, "Hemat");
                    views.setTextColor(R.id.widget_status, android.graphics.Color.parseColor("#10B981"));
                    views.setImageViewResource(R.id.widget_mascot, R.drawable.sakuin_widget_mascot_safe);
                } else if ("STABIL".equals(status)) {
                    views.setTextViewText(R.id.widget_status, "Stabil");
                    views.setTextColor(R.id.widget_status, android.graphics.Color.parseColor("#F59E0B"));
                    views.setImageViewResource(R.id.widget_mascot, R.drawable.sakuin_widget_mascot_watch);
                } else {
                    views.setTextViewText(R.id.widget_status, "Boros");
                    views.setTextColor(R.id.widget_status, android.graphics.Color.parseColor("#EF4444"));
                    views.setImageViewResource(R.id.widget_mascot, R.drawable.sakuin_widget_mascot_watch);
                }
            } else if (responseCode == HttpURLConnection.HTTP_UNAUTHORIZED) {
                views.setTextViewText(R.id.widget_balance, "Rp -");
                views.setTextViewText(R.id.widget_income, "Sesi habis");
                views.setTextViewText(R.id.widget_expense, "Login ulang");
                views.setTextViewText(R.id.widget_status, "Offline");
                views.setTextViewText(R.id.widget_ratio, "Butuh login");
                views.setImageViewResource(R.id.widget_mascot, R.drawable.sakuin_widget_mascot_watch);
            } else {
                views.setTextViewText(R.id.widget_status, "Error " + responseCode);
            }
        } catch (Exception e) {
            e.printStackTrace();
            views.setTextViewText(R.id.widget_status, "Cek koneksi");
            views.setTextViewText(R.id.widget_balance, "Rp -");
            views.setTextViewText(R.id.widget_income, "Rp -");
            views.setTextViewText(R.id.widget_expense, "Rp -");
            views.setTextViewText(R.id.widget_ratio, "Offline");
        } finally {
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }

    private static WidgetSize getWidgetSize(AppWidgetManager appWidgetManager, int appWidgetId) {
        Bundle options = appWidgetManager.getAppWidgetOptions(appWidgetId);
        int minWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 180);
        int minHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 110);

        if (minWidth >= 300 && minHeight >= 180) {
            return WidgetSize.EXTRA_LARGE;
        }

        if (minWidth >= 250 || minHeight >= 150) {
            return WidgetSize.LARGE;
        }

        if (minWidth >= 180) {
            return WidgetSize.MEDIUM;
        }

        return WidgetSize.SMALL;
    }

    private static void applyResponsiveLayout(RemoteViews views, WidgetSize widgetSize) {
        boolean showAmounts = widgetSize != WidgetSize.SMALL;
        boolean showQuickAction = widgetSize == WidgetSize.LARGE || widgetSize == WidgetSize.EXTRA_LARGE;
        boolean showRatio = widgetSize == WidgetSize.EXTRA_LARGE;

        views.setViewVisibility(R.id.widget_amount_grid, showAmounts ? View.VISIBLE : View.GONE);
        views.setViewVisibility(R.id.widget_quick_add_button, showQuickAction ? View.VISIBLE : View.GONE);
        views.setViewVisibility(R.id.widget_ratio, showRatio ? View.VISIBLE : View.GONE);
    }

    private static String classifyFinancialStatus(double income, double expense, JSONObject safeToSpend) {
        if (income > 0) {
            double ratio = expense / income;
            if (ratio < 0.6) {
                return "HEMAT";
            }
            if (ratio < 0.9) {
                return "STABIL";
            }
            return "BOROS";
        }

        String status = safeToSpend != null ? safeToSpend.optString("status", "SAFE") : "SAFE";
        if ("SAFE".equals(status)) {
            return "HEMAT";
        }
        if ("WATCH".equals(status)) {
            return "STABIL";
        }
        return "BOROS";
    }

    private enum WidgetSize {
        SMALL,
        MEDIUM,
        LARGE,
        EXTRA_LARGE
    }
}
