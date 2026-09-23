package com.sakuin.app;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Daily update check, and the install screen once the APK finished downloading. */
public class SakuUpdateReceiver extends BroadcastReceiver {
    static final String ACTION_CHECK = "com.sakuin.app.UPDATE_CHECK";
    static final String ACTION_DOWNLOAD = "com.sakuin.app.UPDATE_DOWNLOAD";

    @Override public void onReceive(Context c, Intent intent) {
        String action = intent.getAction();
        if (DownloadManager.ACTION_DOWNLOAD_COMPLETE.equals(action)) {
            long finished = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
            if (finished == SakuStore.prefs(c).getLong("update_download", 0)) SakuUpdate.install(c);
            return;
        }

        if (ACTION_DOWNLOAD.equals(action)) {
            String url = intent.getStringExtra("url"), name = intent.getStringExtra("name");
            SakuStore.IO.execute(() -> SakuUpdate.download(c, url, name == null ? "" : name));
            return;
        }

        SakuUpdate.scheduleCheck(c);
        if (!ACTION_CHECK.equals(action) && !Intent.ACTION_BOOT_COMPLETED.equals(action)) return;

        PendingResult pending = goAsync();
        SakuStore.IO.execute(() -> {
            try { SakuUpdate.notifyIfNew(c); } finally { pending.finish(); }
        });
    }
}
