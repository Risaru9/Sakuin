package com.sakuin.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.os.Bundle;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Intent;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onStart() {
        super.onStart();
        
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.addJavascriptInterface(new Object() {
                @JavascriptInterface
                public void saveConfig(String token, String apiUrl) {
                    SharedPreferences sharedPref = getSharedPreferences("SakuinWidgetPref", Context.MODE_PRIVATE);
                    SharedPreferences.Editor editor = sharedPref.edit();
                    editor.putString("jwt_token", token);
                    editor.putString("api_url", apiUrl);
                    editor.apply();

                    // Trigger widget update immediately after token/config saved
                    triggerWidgetUpdate();
                }
            }, "AndroidWidgetBridge");
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        // Refresh widget data every time the app comes to foreground
        triggerWidgetUpdate();
    }

    private void triggerWidgetUpdate() {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(this);
        ComponentName widgetComponent = new ComponentName(this, SakuinFinanceWidgetProvider.class);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(widgetComponent);
        if (appWidgetIds != null && appWidgetIds.length > 0) {
            Intent updateIntent = new Intent(this, SakuinFinanceWidgetProvider.class);
            updateIntent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
            updateIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, appWidgetIds);
            sendBroadcast(updateIntent);
        }
    }
}
