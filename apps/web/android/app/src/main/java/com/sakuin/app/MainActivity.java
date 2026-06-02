package com.sakuin.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.os.Bundle;
import android.os.Build;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Intent;
import android.app.PendingIntent;
import com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String PREFS_NAME = "SakuinWidgetPref";
    private static final String KEY_PENDING_QUICK_ACTION = "pending_quick_transaction";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(GoogleAuth.class);
        handleWidgetIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleWidgetIntent(intent);
    }

    @Override
    public void onStart() {
        super.onStart();
        
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.addJavascriptInterface(new Object() {
                @JavascriptInterface
                public void saveConfig(String token, String apiUrl) {
                    SharedPreferences sharedPref = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                    SharedPreferences.Editor editor = sharedPref.edit();
                    editor.putString("jwt_token", token);
                    editor.putString("api_url", apiUrl);
                    editor.apply();

                    // Trigger widget update immediately after token/config saved
                    triggerWidgetUpdate();
                }

                @JavascriptInterface
                public int getAppVersionCode() {
                    try {
                        return getPackageManager().getPackageInfo(getPackageName(), 0).versionCode;
                    } catch (Exception e) {
                        return -1;
                    }
                }

                @JavascriptInterface
                public String getAppVersionName() {
                    try {
                        return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
                    } catch (Exception e) {
                        return "unknown";
                    }
                }

                @JavascriptInterface
                public boolean isWidgetPinningSupported() {
                    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
                        return false;
                    }

                    AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(MainActivity.this);
                    return appWidgetManager.isRequestPinAppWidgetSupported();
                }

                @JavascriptInterface
                public String requestPinWidget(String size) {
                    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
                        return "UNSUPPORTED_ANDROID_VERSION";
                    }

                    AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(MainActivity.this);
                    if (!appWidgetManager.isRequestPinAppWidgetSupported()) {
                        return "UNSUPPORTED_LAUNCHER";
                    }

                    Class<?> providerClass = getWidgetProviderClass(size);
                    ComponentName widgetComponent = new ComponentName(MainActivity.this, providerClass);
                    Intent pinnedIntent = new Intent(MainActivity.this, providerClass);
                    pinnedIntent.setAction(SakuinFinanceWidgetProvider.ACTION_PINNED);
                    PendingIntent successCallback = PendingIntent.getBroadcast(
                            MainActivity.this,
                            2,
                            pinnedIntent,
                            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

                    boolean requested = appWidgetManager.requestPinAppWidget(widgetComponent, null, successCallback);
                    return requested ? "REQUESTED" : "FAILED";
                }

                @JavascriptInterface
                public String requestPinWidget() {
                    return requestPinWidget("medium");
                }

                @JavascriptInterface
                public boolean consumePendingWidgetQuickAction() {
                    SharedPreferences sharedPref = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                    boolean hasPendingAction = sharedPref.getBoolean(KEY_PENDING_QUICK_ACTION, false);
                    if (hasPendingAction) {
                        sharedPref.edit().putBoolean(KEY_PENDING_QUICK_ACTION, false).apply();
                    }

                    return hasPendingAction;
                }
            }, "AndroidWidgetBridge");
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        // Refresh widget data every time the app comes to foreground
        triggerWidgetUpdate();
    }

    private void triggerWidgetUpdate() {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(this);
        triggerWidgetUpdate(appWidgetManager, SakuinFinanceWidgetProvider.class);
        triggerWidgetUpdate(appWidgetManager, SakuinFinanceWidgetSmallProvider.class);
        triggerWidgetUpdate(appWidgetManager, SakuinFinanceWidgetLargeProvider.class);
        triggerWidgetUpdate(appWidgetManager, SakuinFinanceWidgetExtraProvider.class);
    }

    private void triggerWidgetUpdate(AppWidgetManager appWidgetManager, Class<?> providerClass) {
        ComponentName widgetComponent = new ComponentName(this, providerClass);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(widgetComponent);
        if (appWidgetIds == null || appWidgetIds.length == 0) {
            return;
        }

        Intent updateIntent = new Intent(this, providerClass);
        updateIntent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        updateIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, appWidgetIds);
        sendBroadcast(updateIntent);
    }

    private Class<?> getWidgetProviderClass(String size) {
        if ("small".equals(size)) {
            return SakuinFinanceWidgetSmallProvider.class;
        }

        if ("large".equals(size)) {
            return SakuinFinanceWidgetLargeProvider.class;
        }

        if ("xl".equals(size) || "extra".equals(size)) {
            return SakuinFinanceWidgetExtraProvider.class;
        }

        return SakuinFinanceWidgetProvider.class;
    }

    private void handleWidgetIntent(Intent intent) {
        if (intent == null || !SakuinFinanceWidgetProvider.ACTION_QUICK_TRANSACTION.equals(intent.getAction())) {
            return;
        }

        SharedPreferences sharedPref = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        sharedPref.edit().putBoolean(KEY_PENDING_QUICK_ACTION, true).apply();
        notifyWebViewAboutWidgetQuickAction();
    }

    private void notifyWebViewAboutWidgetQuickAction() {
        try {
            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView == null) {
                return;
            }

            webView.post(() -> webView.evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('sakuin:widget-quick-transaction'))",
                    null));
        } catch (Exception ignored) {
            // The web layer also polls the bridge when it regains focus.
        }
    }
}
