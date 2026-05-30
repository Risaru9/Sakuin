package com.sakuin.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.os.Bundle;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Intent;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import android.content.pm.PackageManager;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
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

            webView.addJavascriptInterface(new Object() {
                @JavascriptInterface
                public String getPermission() {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        int permissionCheck = ContextCompat.checkSelfPermission(
                            MainActivity.this, 
                            "android.permission.POST_NOTIFICATIONS"
                        );
                        if (permissionCheck == PackageManager.PERMISSION_GRANTED) {
                            return "granted";
                        } else {
                            return "default";
                        }
                    }
                    return "granted";
                }

                @JavascriptInterface
                public void requestPermission() {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        ActivityCompat.requestPermissions(
                            MainActivity.this,
                            new String[]{"android.permission.POST_NOTIFICATIONS"},
                            101
                        );
                    }
                }

                @JavascriptInterface
                public void postNotification(String title, String body) {
                    Context context = MainActivity.this;
                    
                    String channelId = "sakuin_reminders";
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        CharSequence name = "Sakuin Reminders";
                        String description = "Pengingat Transaksi Sakuin";
                        int importance = NotificationManager.IMPORTANCE_DEFAULT;
                        NotificationChannel channel = new NotificationChannel(channelId, name, importance);
                        channel.setDescription(description);
                        
                        NotificationManager notificationManager = context.getSystemService(NotificationManager.class);
                        if (notificationManager != null) {
                            notificationManager.createNotificationChannel(channel);
                        }
                    }

                    NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
                            .setSmallIcon(R.mipmap.ic_launcher)
                            .setContentTitle(title)
                            .setContentText(body)
                            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                            .setAutoCancel(true);

                    Intent intent = new Intent(context, MainActivity.class);
                    intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                    PendingIntent pendingIntent = PendingIntent.getActivity(
                            context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                    builder.setContentIntent(pendingIntent);

                    try {
                        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
                        notificationManager.notify((int) System.currentTimeMillis(), builder.build());
                    } catch (SecurityException e) {
                        e.printStackTrace();
                    }
                }
            }, "AndroidNotificationBridge");
        }
    }
}
