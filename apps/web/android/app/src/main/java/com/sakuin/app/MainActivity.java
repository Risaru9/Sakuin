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
                    Context context = MainActivity.this;
                    SharedPreferences sharedPref = context.getSharedPreferences("SakuinWidgetPref", Context.MODE_PRIVATE);
                    SharedPreferences.Editor editor = sharedPref.edit();
                    editor.putString("jwt_token", token);
                    editor.putString("api_url", apiUrl);
                    editor.apply();

                    // Notify widget provider to update immediately
                    Intent intent = new Intent(context, SakuinFinanceWidgetProvider.class);
                    intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
                    int[] ids = AppWidgetManager.getInstance(context)
                            .getAppWidgetIds(new ComponentName(context, SakuinFinanceWidgetProvider.class));
                    intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
                    context.sendBroadcast(intent);
                }
            }, "AndroidWidgetBridge");
        }
    }
}
