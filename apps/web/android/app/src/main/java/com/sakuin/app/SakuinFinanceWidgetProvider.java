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
            ComponentName thisAppWidget = new ComponentName(context, getProviderClass());
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

    protected void updateAppWidgetSync(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), getLayoutResource());
        WidgetSize widgetSize = getWidgetSize(appWidgetManager, appWidgetId);
        applyResponsiveLayout(views, widgetSize);

        // Setup non-button areas to open main app. Keep root free so widget buttons
        // are not swallowed by parent click handling on some Android launchers.
        Intent configIntent = new Intent(context, MainActivity.class);
        PendingIntent configPendingIntent = PendingIntent.getActivity(
                context, 0, configIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_header_area, configPendingIntent);
        views.setOnClickPendingIntent(R.id.widget_amount_grid, configPendingIntent);
        views.setOnClickPendingIntent(R.id.widget_status_row, configPendingIntent);

        // Setup refresh button click
        Intent refreshIntent = new Intent(context, getProviderClass());
        refreshIntent.setAction(ACTION_REFRESH);
        PendingIntent refreshPendingIntent = PendingIntent.getBroadcast(
                context, 1, refreshIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_refresh_button, refreshPendingIntent);

        Intent quickTransactionIntent = new Intent(context, MainActivity.class);
        quickTransactionIntent.setAction(ACTION_QUICK_TRANSACTION);
        quickTransactionIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        quickTransactionIntent.setData(android.net.Uri.parse("sakuin://widget/quick-transaction"));
        quickTransactionIntent.putExtra("source", "widget");
        PendingIntent quickTransactionPendingIntent = PendingIntent.getActivity(
                context, 3, quickTransactionIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_quick_add_button, quickTransactionPendingIntent);

        // Retrieve config from shared preferences
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String token = prefs.getString("jwt_token", null);
        String apiUrl = prefs.getString("api_url", null);

        if (token == null || apiUrl == null) {
            applyStatusTone(views, "WASPADA");
            views.setTextViewText(R.id.widget_balance, "Rp -");
            views.setTextViewText(R.id.widget_income, "Silakan login");
            views.setTextViewText(R.id.widget_expense, "di aplikasi");
            views.setTextViewText(R.id.widget_status, "Offline");
            views.setTextViewText(R.id.widget_status_headline, "Widget belum tersambung");
            views.setTextViewText(R.id.widget_ratio, "Belum sinkron");
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

                double balance = parseAmount(data, "balance");
                double totalIncome = parseAmount(data, "totalIncome");
                double totalExpense = parseAmount(data, "totalExpense");
                double income = parseAmount(data, "incomeThisMonth");
                double expense = parseAmount(data, "expenseThisMonth");
                int transactionCount = data.optInt("transactionCount", 0);
                boolean usingTotalFallback = income == 0.0
                        && expense == 0.0
                        && transactionCount > 0
                        && (totalIncome > 0.0 || totalExpense > 0.0);

                if (usingTotalFallback) {
                    income = totalIncome;
                    expense = totalExpense;
                }

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
                views.setTextViewText(
                        R.id.widget_ratio,
                        income > 0
                                ? (usingTotalFallback
                                        ? "Total tercatat: keluar " + ratioPercent + "% dari pemasukan"
                                        : "Bulan ini: keluar " + ratioPercent + "% dari pemasukan")
                                : "Mulai catat pemasukan bulan ini");

                if ("HEMAT".equals(status)) {
                    views.setTextViewText(R.id.widget_status, "Hemat");
                    views.setTextViewText(R.id.widget_status_headline, "Kondisi keuangan kamu");
                    views.setTextViewText(R.id.widget_ratio, "Pertahankan terus kebiasaan baikmu!");
                    applyStatusTone(views, "HEMAT");
                } else if ("WASPADA".equals(status)) {
                    views.setTextViewText(R.id.widget_status, "Waspada");
                    views.setTextViewText(R.id.widget_status_headline, "Pengeluaran mulai tinggi");
                    views.setTextViewText(R.id.widget_ratio, "Yuk lebih bijak sebelum tambah transaksi.");
                    applyStatusTone(views, "WASPADA");
                } else {
                    views.setTextViewText(R.id.widget_status, "Boros");
                    views.setTextViewText(R.id.widget_status_headline, "Pengeluaran melewati batas");
                    views.setTextViewText(R.id.widget_ratio, "Rem dulu pengeluaran non-prioritas.");
                    applyStatusTone(views, "BOROS");
                }
            } else if (responseCode == HttpURLConnection.HTTP_UNAUTHORIZED) {
                applyStatusTone(views, "WASPADA");
                views.setTextViewText(R.id.widget_balance, "Rp -");
                views.setTextViewText(R.id.widget_income, "Sesi habis");
                views.setTextViewText(R.id.widget_expense, "Login ulang");
                views.setTextViewText(R.id.widget_status, "Offline");
                views.setTextViewText(R.id.widget_status_headline, "Sesi perlu diperbarui");
                views.setTextViewText(R.id.widget_ratio, "Butuh login");
            } else {
                applyStatusTone(views, "WASPADA");
                views.setTextViewText(R.id.widget_status, "Error " + responseCode);
            }
        } catch (Exception e) {
            e.printStackTrace();
            applyStatusTone(views, "WASPADA");
            views.setTextViewText(R.id.widget_status, "Cek koneksi");
            views.setTextViewText(R.id.widget_status_headline, "Widget belum tersambung");
            views.setTextViewText(R.id.widget_balance, "Rp -");
            views.setTextViewText(R.id.widget_income, "Rp -");
            views.setTextViewText(R.id.widget_expense, "Rp -");
            views.setTextViewText(R.id.widget_ratio, "Offline");
        } finally {
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }

    protected int getLayoutResource() {
        return R.layout.sakuin_finance_widget_medium;
    }

    protected Class<?> getProviderClass() {
        return SakuinFinanceWidgetProvider.class;
    }

    protected WidgetSize getFixedWidgetSize() {
        return WidgetSize.MEDIUM;
    }

    private WidgetSize getWidgetSize(AppWidgetManager appWidgetManager, int appWidgetId) {
        WidgetSize fixedWidgetSize = getFixedWidgetSize();
        if (fixedWidgetSize != null) {
            return fixedWidgetSize;
        }

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
        boolean showHeaderActions = widgetSize != WidgetSize.SMALL;
        boolean showStatus = widgetSize != WidgetSize.SMALL;
        boolean showInsight = widgetSize == WidgetSize.LARGE || widgetSize == WidgetSize.EXTRA_LARGE;
        boolean showRatio = showInsight;
        boolean showMascot = widgetSize != WidgetSize.SMALL;

        views.setViewVisibility(R.id.widget_amount_grid, showAmounts ? View.VISIBLE : View.GONE);
        views.setViewVisibility(R.id.widget_header_actions, showHeaderActions ? View.VISIBLE : View.GONE);
        views.setViewVisibility(R.id.widget_status_row, showStatus ? View.VISIBLE : View.GONE);
        views.setViewVisibility(R.id.widget_status_headline, showInsight ? View.VISIBLE : View.GONE);
        views.setViewVisibility(R.id.widget_ratio, showRatio ? View.VISIBLE : View.GONE);
        views.setViewVisibility(R.id.widget_mascot, showMascot ? View.VISIBLE : View.GONE);

    }

    private static String classifyFinancialStatus(double income, double expense, JSONObject safeToSpend) {
        String safeStatus = safeToSpend != null ? safeToSpend.optString("status", "") : "";
        if ("HOLD".equals(safeStatus)) {
            return "BOROS";
        }
        if ("WATCH".equals(safeStatus)) {
            return "WASPADA";
        }
        if ("SAFE".equals(safeStatus)) {
            return "HEMAT";
        }

        if (income > 0) {
            double ratio = expense / income;
            if (ratio < 0.6) {
                return "HEMAT";
            }
            if (ratio < 0.9) {
                return "WASPADA";
            }
            return "BOROS";
        }

        return "HEMAT";
    }

    private static double parseAmount(JSONObject data, String key) {
        Object value = data.opt(key);
        if (value == null || JSONObject.NULL.equals(value)) {
            return 0.0;
        }

        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }

        try {
            String rawValue = String.valueOf(value).trim();
            if (rawValue.isEmpty()) {
                return 0.0;
            }

            return Double.parseDouble(rawValue);
        } catch (NumberFormatException ignored) {
            return 0.0;
        }
    }

    private static void applyStatusTone(RemoteViews views, String status) {
        int backgroundResource;

        if ("BOROS".equals(status)) {
            backgroundResource = R.drawable.sakuin_widget_background_risk;
            views.setImageViewResource(R.id.widget_mascot, R.drawable.sakuin_widget_mascot_risk);
            views.setTextColor(R.id.widget_status, android.graphics.Color.parseColor("#FECDD3"));
        } else if ("WASPADA".equals(status)) {
            backgroundResource = R.drawable.sakuin_widget_background_watch;
            views.setImageViewResource(R.id.widget_mascot, R.drawable.sakuin_widget_mascot_watch);
            views.setTextColor(R.id.widget_status, android.graphics.Color.parseColor("#FDE68A"));
        } else {
            backgroundResource = R.drawable.sakuin_widget_background_safe;
            views.setImageViewResource(R.id.widget_mascot, R.drawable.sakuin_widget_mascot_safe);
            views.setTextColor(R.id.widget_status, android.graphics.Color.parseColor("#A3E635"));
        }

        views.setInt(R.id.widget_root, "setBackgroundResource", backgroundResource);
        views.setTextColor(R.id.widget_ratio, android.graphics.Color.parseColor("#F8FAFC"));
        views.setTextColor(R.id.widget_status_headline, android.graphics.Color.parseColor("#E0F2FE"));
        views.setTextColor(R.id.widget_balance_label, android.graphics.Color.parseColor("#DBEAFE"));
        views.setTextColor(R.id.widget_balance, android.graphics.Color.WHITE);
    }

    protected enum WidgetSize {
        SMALL,
        MEDIUM,
        LARGE,
        EXTRA_LARGE
    }
}
