# Handoff: Sakuin APK 2.1 (splash + ikon Saku, widget + catat cepat, 3 notifikasi baru)

## Cara pakai dokumen ini (untuk pemilik proyek)

1. Buka Codex di folder **`D:\sakuin\.claude\worktrees\frosty-engelbart-1dd838`** (cabang `claude/frosty-engelbart-1dd838`). Semua pekerjaan APK 2.1 sudah ada di `main`; riwayat rilis dan masalah yang ditemukan ada di bagian 8.
2. Beri Codex perintah ini:
   > Baca `docs/HANDOFF_APK_2.1.md` sampai habis, lalu lanjutkan rilis dari tahap pertama yang belum selesai di bagian "8. Rilis bertahap". Catat setiap langkah di bagian 8. Balas saya dalam bahasa Indonesia yang sederhana. Jangan merge ke `main` sebelum saya setuju.
3. Gambar mockup yang sudah kamu setujui ada di `docs/handoff-apk-2.1/mockups/`. Buka `mockups.html#0` sampai `#10` di browser untuk melihatnya satu per satu.

Status terbaru selalu ada di **bagian 8** (tabel "Rilis bertahap").

---

The rest of this document is written for the coding agent.

## 1. Working agreement (read first)

- **User**: the project owner is Indonesian and not a developer. Reply in plain Indonesian. In every progress report, say what they will and will not see yet (the live app only changes after merging to `main`). Give manual steps as short numbered lists.
- **Mockups before UI code.** All UI in this task is already approved (section 3). Build exactly that; keep screens sparse. Do not make the approved Beranda (home list) busier. Any new UI not covered here needs a mockup first.
- **Ask before pushing** to GitHub. Merging to `main` deploys the web app and the API to Vercel production. The installed APK loads the production website (`capacitor.config.ts` → `server.url`), so web changes reach every APK 2.0.0 user immediately. Any web code that calls a new native bridge method must feature-detect it (2.0.0 does not have them).
- **Database safety**: `apps/api/.env` in the main checkout points at a paused Supabase *test* project. Never point anything at the production DB. This task has **no Prisma schema change**; keep it that way.
- **Never commit** `apps/web/android/keystore.properties`, `local.properties`, or anything from `C:\Users\USER\sakuin-signing\`.
- Code style: match the surrounding code (comment density, naming). User-visible copy is Indonesian.

## 2. Where things are

| What | Where |
| --- | --- |
| Repo | `https://github.com/Risaru9/Sakuin` (pnpm monorepo: `apps/web` React + Capacitor 6 Android wrapper, `apps/api` Hono + Prisma, `packages/shared` types only) |
| This work | git worktree `D:\sakuin\.claude\worktrees\frosty-engelbart-1dd838`, branch `claude/frosty-engelbart-1dd838`, based on `main` @ `3b6fb3c` (APK 2.0.0). What is committed, pushed or still held back is tracked in section 8. `pnpm install` and `prisma generate` have been run here. |
| Production | web `https://sakuin-web.vercel.app`, API `https://sakuin-api.vercel.app` |
| Current APK | 2.1.1, `versionCode 18`, at `/downloads/sakuin.apk` (2.1.0 was live briefly with a broken widget, see section 8), signed with key SHA-1 `A7:20:43:6E:66:BC:64:F1:57:4A:5B:EA:B6:7C:E9:03:4A:31:6D:3A` |
| Approved mockups | `docs/handoff-apk-2.1/mockups/*.png` (one per screen), `mockups.html#<0-10>` (same screens, live HTML), `mockup-source.mjs` (the generator with every exact size/colour; reference only, do not run it inside the repo) |
| Icon/vector generator | `docs/handoff-apk-2.1/assets-generator/saku-assets.mjs` (writes Android vectors + SVGs from one mascot description) and `render.py` (renders SVG → PNG with headless Edge + Pillow). Run from a scratch folder, then copy results in. |
| Web mascot (source of truth) | `apps/web/src/components/saku/saku-mascot.tsx`, tokens in `apps/web/src/styles/saku-theme.css` |

`docs/handoff-apk-2.1/` is reference material for this release; it can be deleted after 2.1 ships.

## 3. Approved design (build exactly this)

Style "Kartun Stiker": cream background `#FFF7E8`, ink `#1D1A33` with thick outlines (2–2.5dp), hard offset shadows (3–4dp, ink, no blur), yellow `#FFC83D` (soft `#FFF0C2`), accent blue `#2B63E0`, mascot blue `#74AAFF`, muted text `#625D78`, track `#F3E8D2`, over-limit red `#FF6B5B` / text `#C62828`, watch text `#8A5A00`, income green `#137A50`. Fonts: Fredoka SemiBold (headings, numbers) + Nunito ExtraBold/Black (body). Mascot **Saku** = blue pocket holding a coin, moods happy / wow / worried.

### 3.1 Launcher icon (mockups 01, 02) — user chose **A, yellow**
- Adaptive icon: background colour `#FFC83D`, foreground `@drawable/ic_launcher_saku` (already generated: Saku in the 66dp safe zone), monochrome `@drawable/ic_launcher_saku_monochrome` for Android 13 themed icons.
- Legacy PNGs (API < 26): round yellow plate with ink ring and Saku (already generated into `mipmap-*/ic_launcher.png` and `ic_launcher_round.png`).
- Launcher label must read **"Sakuin"** (today `res/values/strings.xml` has `app_name` and `title_activity_main` = "Sakuin v1.6.8"; fix both).

### 3.2 Splash (mockup 03) and loading (mockup 04)
- Native splash: cream `#FFF7E8` full screen, a 160dp yellow circle with Saku in the exact centre, nothing else. Replaces the old white screen with the Capacitor "X" (`drawable*/splash.png`).
- Then the web loading screen keeps the circle in the same place (gently bobbing) and adds "Sakuin" (Fredoka 30) + "Menyiapkan catatanmu…" + three bouncing yellow dots. **Done** (see 4.2).

### 3.3 Home-screen widget (mockups 05, 06)
Two providers, same look (cream card, 2.5dp ink stroke, 26dp corners, 4dp offset ink shadow):
- **Sedang (4×2)**: "Keluar hari ini" (small, muted) · today's expense big (Fredoka 30) · "Sisa bulan ini 1.240.500" · bottom row: category-near-limit line (category dot + "Makanan 86% dari batas" + progress bar) and a yellow sticker button **"+ Catat"**. Saku (58dp) top-right, mood from the budget state.
- **Besar (4×3)**: header "September" + "diperbarui 10.12" + round refresh button · Saku (66dp) + two stats "Keluar hari ini" / "Sisa bulan ini" · white box with the category line and bar · "Terakhir: Kopi susu −18.000" · full-width **"+ Catat"** button.
- States: *masih aman* (bar blue `#2B63E0`, Saku happy, text "Makanan baru 42% dari batas"); *hampir batas* ≥80% (bar yellow, Saku wow, text in `#8A5A00`); *lewat batas* >100% (bar red, Saku worried, "Belanja lewat batas"); *belum masuk* (Saku wow, "Masuk dulu, ya", "Widget tampil setelah kamu masuk di aplikasi.", yellow button "Buka Sakuin"). With no limits set, show the biggest category this month instead of the bar line (`topCategory`).
- Numbers are plain `id-ID` thousands (`43.000`, `1.240.500`), no "Rp".
- Tapping the card body opens the app; **"+ Catat" opens the quick-entry window (3.4), not the app**; refresh (large only) reloads data.
- Offline: keep showing the last good data (cache it) with its "diperbarui HH.mm" time; never show "Rp -" once data has loaded once.

### 3.4 Quick-entry window "Catat cepat" (mockups 07, 08, 09)
The user's goal, in their words: *"ribet kalo tiap beli sesuatu harus masuk aplikasi"*. Widgets cannot hold a text field, so "+ Catat" opens a small translucent window over the home screen:
- Home screen dimmed behind (`#1D1A33` at ~55%). A cream sheet sits just above the keyboard: title "Catat cepat" (Fredoka 20) + round ✕ close button.
- Input pill (58dp, white, 2.5dp ink, offset shadow): Saku avatar in a yellow-soft circle, text field with hint "Catat… misal kopi 18rb", yellow "Simpan" sticker appears when there is text. Keyboard opens immediately. Enter = save.
- Under the field while typing: "Tekan Enter untuk simpan. Kategorinya Saku tebak sendiri."
- After saving: the saved row appears above the field (category dot, name, "Baru!" chip, "Makanan · Hari ini", amount "−18.000" or green "+5.000.000", and an **"Ubah"** link). If the save crossed a budget threshold, a small line with the bar shows under it ("Makanan 86% dari batas"). The field clears with hint "Catat lagi…" so the user can add another. Footer: "Hari ini keluar 61.000" and link "Buka Sakuin ›". Keep at most the last 2 saved rows.
- The category is guessed **after** Enter (the server parses), not while typing. "Ubah" opens the app on that entry's edit sheet.
- No internet: keep the line in an on-phone queue, show it as saved-pending ("Disimpan di HP dulu, nanti dikirim otomatis"), send it on the next chance (next save, widget refresh, app resume).

### 3.5 Notifications (mockups 10, 11)
Standard Android notification cards; small icon `ic_stat_saku` tinted `#2B63E0`; large icon = Saku on a `#FFF0C2` rounded square.
1. **Batas kategori** (right after recording, only on crossing): "Makanan sudah 80% dari batas" / "Sisa 100 rb untuk 10 hari lagi. Pelan-pelan, ya." (Saku wow) and "Batas Belanja sudah habis" / "Bulan ini 512 rb dari batas 500 rb." (Saku worried). Tap → `/laporan`.
2. **Tagihan besok** (09.00 the day before a Transaksi berulang expense runs): "Besok: Bayar kos 750 rb" / "Dari transaksi berulang. Besok Sakuin mencatatnya otomatis." (or "…Jangan lupa dibayar, ya." when the rule does not auto-post). Tap → `/lainnya/berulang`.
3. **Ringkasan mingguan** (Sunday 19.00, skipped when the week has no expenses): "Minggu ini keluar 820 rb" / "Paling banyak buat Makanan: 310 rb. Ketuk untuk lihat laporan." Tap → `/laporan`.
- The server writes the budget and weekly copy (see 4.1), so the phone just shows `title`/`body`.
- Pengingat page = same screen + section "Kabar lain dari Saku" with a "Baru!" chip and three switches (all default on). **Done** (see 4.2).

## 4. Already done (uncommitted, in the worktree)

### 4.1 API (`apps/api`) — typecheck passes
Architecture decisions:
- **Server-side parsing.** The quick-entry window sends raw text; the API parses it with the same parser as the web composer. `packages/shared` cannot be used at runtime (CI and Vercel never build its `dist`; today only types are imported from it), so the parser is an **import-free file kept byte-identical in two places**: `apps/web/src/features/transactions/quick-transaction-parser.ts` and `apps/api/src/modules/transactions/quick-transaction-parser.ts`. The web test `quick-transaction-parser-sync.test.ts` fails if they differ. Edit both together.
- **Time zone.** Transactions are stored at local midnight. Clients send `tzOffsetMinutes` the way `Date#getTimezoneOffset()` reports it (WIB = `-420`; Java: `-TimeZone.getDefault().getOffset(now) / 60000`). Default is `-420`.
- **Budget alerts are crossing-based**: alert only when a new expense moved the category from below 80% to ≥80%, or from below 100% to ≥100%, in the current local month. Each threshold therefore fires once per month without storing anything. Back-dated entries never alert. Thresholds match Laporan (`watch` ≥80%, `over` >100%).

New files: `src/modules/summary/glance-copy.ts` (pure date maths + Indonesian copy), `src/modules/summary/glance.service.ts`, `src/modules/transactions/quick-transaction.service.ts`, the parser copy, tests `tests/glance-copy.test.ts` (unit, 9 passing locally) and `tests/quick-transaction.test.ts` (integration; needs Postgres, runs in CI). Routes and schemas were added to the existing summary/transaction route, schema, types and controller files.

Endpoints (all need `Authorization: Bearer <jwt>`; responses use the usual `{ success, message, data }` envelope):

```http
POST /api/transactions/quick
{ "text": "kopi susu 18rb", "date": "2026-09-19" (optional), "tzOffsetMinutes": -420 (optional) }
201 → data: {
  "transactions": [TransactionResponse...],   // same shape as POST /api/transactions
  "budgetAlerts": [{ "categoryId", "categoryName", "level": 80|100, "spent", "limit", "title", "body" }],
  "todayExpense": 61000,
  "skippedCount": 0
}
400 "Nominalnya belum ketemu. Coba tulis seperti: kopi 18rb" when no amount is found.
Several items per line work ("gaji 5jt, parkir 5rb"). Saved to the default account.

POST /api/transactions/budget-alerts
{ "transactionIds": ["..."], "tzOffsetMinutes": -420 }
200 → data: { "budgetAlerts": [...] }   // only the caller's own transactions count

GET /api/summary/glance?date=2026-09-19&tz=-420   (both optional)
200 → data: {
  "date": "2026-09-19",
  "todayExpense": 43000,
  "month": { "label": "September", "income", "expense", "left" },     // left = income - expense (Beranda "Sisa")
  "budget": { "categoryName", "spent", "limit", "percent", "status": "ok"|"watch"|"over" } | null,  // limited category closest to its limit
  "topCategory": { "categoryName", "amount" } | null,                 // only when no limits exist
  "lastTransaction": { "name", "amount", "type" } | null,
  "week": { "expense", "count", "topCategory", "notification": { "title", "body" } | null }  // Monday–Sunday
}
```

### 4.2 Web (`apps/web`) — typecheck passes, all 170 tests pass
- **Icons**: new yellow Saku `public/icons/favicon-16/32.png`, `pwa-192/512.png`, `maskable-192/512.png`, `sakuin-logo.png`; `index.html` icon links bumped to `?v=5`; `manifest.webmanifest` and `theme-color` cream; service worker cache bumped to `sakuin-pwa-v11`.
- **Loading**: `components/saku/saku-loading-screen.tsx` (`SakuAppIcon`, `SakuLoadingScreen`), used by `LoadingScreen` in `app/router.tsx` and by the 1.1 s boot overlay in `app/App.tsx`. `index.html` shows the same 160px circle (inline SVG) until React mounts. New animation token `animate-saku-dot` in `saku-theme.css`.
- **Capacitor**: `capacitor.config.ts` → `backgroundColor: '#fff7e8'` (needs `npx cap sync android` before the APK build).
- **Notifications** `lib/saku-notifications.ts`:
  - Switches are stored **per phone** in `localStorage["sakuin_saku_notifications_v1"]` (`{ budget, bills, weekly }`, default all `true`) and pushed to native via `AndroidWidgetBridge.setNotificationPrefs(json)` when that method exists.
  - Bill reminders: `planBillReminders()` (pure) + `syncBillReminders()` schedule Capacitor LocalNotifications at 09.00 the day before the next ≤3 runs of each active EXPENSE rule within 62 days; ids **2000–2999**; channel `sakuin_bills`; `extra.route = "/lainnya/berulang"`. Occurrence stepping mirrors the API (`advanceOccurrenceDate`: +7×interval days, or +interval months on `min(dayOfMonth, 28)`).
  - Budget alerts: `showBudgetAlerts()` shows them immediately; ids **3000 + hash(categoryId:level) % 900**; channel `sakuin_budget`; `extra.route = "/laporan"`; large icon `saku_notif_wow` (80) / `saku_notif_worried` (100).
  - Nightly 20.00 reminder (id 1) and the test notification (id 999) now use `smallIcon: "ic_stat_saku"`, `largeIcon: "saku_notif_happy"`, colour `#2B63E0`.
- `components/pwa/SakuNotificationsRunner.tsx` (mounted in `App.tsx`): on the APK, pushes switches to native and re-syncs bill reminders whenever the `queryKeys.recurring` data or the switch changes.
- `features/quick-composer/use-quick-composer.ts`: after an online save, on the APK with "Batas kategori" on, calls `POST /api/transactions/budget-alerts` and shows any alerts (`getBudgetAlerts` in `transaction.service.ts`).
- `app/App.tsx`: consumes `AndroidWidgetBridge.consumePendingRoute()` (on start, focus, and the `sakuin:native-route` window event) and navigates to it; `LocalNotifications` tap listener navigates to `extra.route`. Only internal paths (`/…`, not `//…`) are accepted.
- `lib/auth-storage.ts`: bridge typings for `consumePendingRoute` and `setNotificationPrefs`.
- `features/lainnya/SakuNotificationSwitches.tsx` on the Pengingat page (3.5). On the website the switches are disabled with "Khusus aplikasi Sakuin di HP Android."; on APK 2.0.0 the weekly one says "Perlu update aplikasi ke versi 2.1".

### 4.3 Android resources (generated, in `apps/web/android/app/src/main/res`)
- `drawable/ic_launcher_saku.xml`, `ic_launcher_saku_monochrome.xml`, `ic_stat_saku.xml`, `saku_happy.xml`, `saku_wow.xml`, `saku_worried.xml` (vector drawables; the stitch dashes are separate segments because vectors have no dash array).
- `mipmap-*/ic_launcher.png` and `ic_launcher_round.png` replaced; `mipmap-*/ic_launcher_foreground.png` and `drawable-v24/ic_launcher_foreground.xml` deleted (staged). **`mipmap-anydpi-v26/ic_launcher*.xml` still point at the deleted `@mipmap/ic_launcher_foreground`: the build fails until 5.2 step 1 is done.**

## 5. Yang belum dikerjakan (remaining work, in order)

### 5.1 Web leftovers
1. **Pengingat test**: extend `features/lainnya/PengingatPage.test.tsx` for the new section (renders three switches; disabled on web; toggling saves `sakuin_saku_notifications_v1`).
2. **Unit tests** for `planBillReminders` (09.00 the day before; skips inactive/income rules and past times; respects `endDate`; weekly/monthly stepping) and `formatShortRupiah`.
3. **"Ubah" deep link**: `BerandaPage` should open `EditTransactionSheet` for `?ubah=<transactionId>` (the entry is today's, so it is in the current month list; if not found, fetch `GET /api/transactions/:id`), then drop the param with `replace: true`, like the existing `widgetAction=quick` effect.
4. **Widget sheet** `features/android-widget/WidgetInstallModal.tsx`: replace the old blue preview with the new widget look (3.3) for both sizes; size texts: Sedang "Hari ini, sisa bulan, + Catat", Besar "Plus bar batas dan catatan terakhir"; subtitle "Lihat pengeluaran dan catat tanpa buka aplikasi". Keep the sheet layout.
5. **Release notes** (see 5.3).

### 5.2 Android native (`apps/web/android/app`, Java, minSdk 22, target/compile 34, AppCompat, `androidx.core:core-splashscreen:1.0.1`)
1. **Adaptive icon**: `mipmap-anydpi-v26/ic_launcher.xml` and `ic_launcher_round.xml` → `<background android:drawable="@color/ic_launcher_background"/>`, `<foreground android:drawable="@drawable/ic_launcher_saku"/>`, `<monochrome android:drawable="@drawable/ic_launcher_saku_monochrome"/>`; set `values/ic_launcher_background.xml` to `#FFC83D`. Delete the unused `drawable/ic_launcher_background.xml`. Fix `app_name`/`title_activity_main` = "Sakuin".
2. **Large notification icons**: add `drawable-nodpi/saku_notif_happy.png`, `saku_notif_wow.png`, `saku_notif_worried.png` (192×192, Saku on a `#FFF0C2` rounded square). Capacitor's LocalNotifications decodes `largeIcon` with `BitmapFactory`, so these **must be PNGs** (a vector returns null). Use `assets-generator/` (add a function for these three and render with `render.py`).
3. **Splash**:
   - `values/colors.xml`: `sakuin_splash_background` → `#FFFFF7E8`; add `saku_coin #FFFFC83D`, `saku_ink #FF1D1A33`, `saku_cream #FFFFF7E8`, etc.
   - `values/styles.xml` `AppTheme.NoActionBarLaunch` (parent `Theme.SplashScreen`): remove `android:background @drawable/splash`; set `windowSplashScreenBackground @color/sakuin_splash_background`, `windowSplashScreenAnimatedIcon @drawable/ic_launcher_saku`, `windowSplashScreenIconBackgroundColor #FFC83D`, `postSplashScreenTheme @style/AppTheme.NoActionBar`. For Android < 12 add `android:windowBackground` = a layer-list (`drawable-v23/sakuin_splash.xml`: cream colour + centred 160dp yellow oval with 4dp ink stroke + centred 240dp `ic_launcher_saku`; plain cream colour in `drawable/` for API 22 because item width/height need API 23).
   - In `MainActivity.onCreate` call `SplashScreen.installSplashScreen(this)` **before** `super.onCreate` (check it does not fight Capacitor's `BridgeActivity` theme switch; if it does, drop the call and rely on the theme attributes).
   - Delete every old `drawable*/splash.png`.
4. **Fonts**: convert `node_modules/.pnpm/@fontsource+fredoka@5.3.0/node_modules/@fontsource/fredoka/files/fredoka-latin-600-normal.woff` and Nunito 800/900 `.woff` to TTF with fontTools (`python -c "from fontTools.ttLib import TTFont; f=TTFont('in.woff'); f.flavor=None; f.save('out.ttf')"`) into `res/font/fredoka_semibold.ttf`, `nunito_extrabold.ttf`, `nunito_black.ttf` (lowercase names). Use them in the quick-entry window; try them in widget layouts via `android:fontFamily` (works on most launchers on API 26+; the system font is an acceptable fallback). Both fonts are OFL.
5. **Widget** (keep the provider class names `SakuinFinanceWidgetProvider` and `SakuinFinanceWidgetExtraProvider` so pinned widgets survive the update; keep `ACTION_REFRESH` and the `WIDGET_PINNED` flow):
   - Layouts `layout/sakuin_finance_widget_medium.xml` (Sedang) and `sakuin_finance_widget_extra.xml` (Besar) rebuilt per 3.3 using only RemoteViews-safe views (FrameLayout, LinearLayout, TextView, ImageView, ImageButton/Button, horizontal ProgressBar with a custom `progressDrawable`). Card = layer-list drawable: ink rounded rect offset 4dp right/bottom, then cream rounded rect with 2.5dp ink stroke. "+ Catat" = yellow sticker with ink stroke + 2dp offset shadow. Three progress drawables (blue/yellow/red fill on `#F3E8D2` track with ink hairline).
   - `xml/sakuin_finance_widget_info.xml`: `targetCellWidth 4`, `targetCellHeight 2`, `minWidth 250dp`, `minHeight 110dp`, `resizeMode horizontal|vertical`; `..._extra_info.xml`: 4×3, `minHeight 180dp`. Rename labels in strings: "Sakuin Ringkas" / "Sakuin Lengkap", descriptions matching 5.1 step 4. Delete the old drawables no longer used (`sakuin_widget_background_*`, `sakuin_widget_mascot_*`, `ic_widget_income/expense`, `sakuin_widget_insight_panel`, `sakuin_widget_metric_card`, `sakuin_widget_status_chip`).
   - Provider: read `jwt_token` and `api_url` from SharedPreferences `SakuinWidgetPref` (written by the existing `AndroidWidgetBridge.saveConfig`); fetch `GET {api_url}/api/summary/glance?date=<local yyyy-MM-dd>&tz=<offset>` on a background thread (`goAsync`); cache the last good JSON + fetch time in the same prefs; render states per 3.3 (401 or no token → *belum masuk*). Mood/bar colour from `budget.status`. Format numbers with `NumberFormat.getNumberInstance(new Locale("id","ID"))`.
   - Clicks: body → `MainActivity`; "+ Catat" → `QuickEntryActivity` (PendingIntent.getActivity, `FLAG_IMMUTABLE`, distinct request codes); refresh → broadcast `ACTION_REFRESH`.
   - Refresh after a quick-entry save and in `MainActivity.onResume` (already calls `triggerWidgetUpdate`).
6. **QuickEntryActivity** (new, `com.sakuin.app.QuickEntryActivity`):
   - Manifest: `exported="false"`, `taskAffinity=""`, `excludeFromRecents="true"`, `launchMode="singleTask"`, `windowSoftInputMode="stateVisible|adjustResize"`, theme = new translucent AppCompat theme (no action bar, `windowIsTranslucent`, `windowBackground` transparent, `backgroundDimEnabled` true, `backgroundDimAmount` 0.55, no animation or a short slide-up).
   - Layout per 3.4 (bottom-anchored card, ✕ button, up to 2 saved rows, budget line, input pill with Saku avatar and `EditText` `imeOptions="actionDone"` single line, "Simpan" button visible only with text, hint line, footer). Tap outside the card closes the window.
   - Save: `POST {api_url}/api/transactions/quick` with `{ text, date, tzOffsetMinutes }` on a background executor. On 201, show the rows from `transactions` (`note` or category name, category name, amount; income in green with "+"), the first `budgetAlerts` item as the budget line, footer `todayExpense`; post a native notification per alert if the "budget" switch is on (channel `sakuin_budget`, same id formula as the web: `3000 + hash % 900` where `hash = (hash*31 + char) % 900` over `categoryId + ":" + level`; tap → pending route `/laporan`); refresh widgets. On 400 show the server message under the field and keep the text. On 401 show the *belum masuk* message with "Buka Sakuin". On network failure append `{ text, date, tzOffsetMinutes }` to a JSON queue in SharedPreferences and show the pending row; flush the queue in order on the next save, widget refresh and `MainActivity.onResume` (drop an item after a 201 or a 400).
   - "Ubah" → store pending route `/dashboard?ubah=<transactionId>` and open `MainActivity`; "Buka Sakuin" → open `MainActivity`.
7. **Native notifications**:
   - Channels (create on app start and before posting; ids shared with the web): `sakuin_budget` "Batas kategori", `sakuin_bills` "Tagihan besok", `sakuin_weekly` "Ringkasan mingguan", importance high/default.
   - **Weekly summary**: `WeeklySummaryReceiver` scheduled with `AlarmManager.setAndAllowWhileIdle(RTC_WAKEUP, …)` (inexact is fine; do not request exact-alarm permission) for the next Sunday 19.00 local; reschedule after it fires, on `BOOT_COMPLETED` (new receiver or the same one; `RECEIVE_BOOT_COMPLETED` is already in the manifest), on `MY_PACKAGE_REPLACED`, and in `MainActivity.onCreate`. When it fires: if the "weekly" switch is on and a token exists, `goAsync()`, fetch `/api/summary/glance`, and if `week.notification` is not null post it (id 4001, channel `sakuin_weekly`, large icon `saku_notif_happy`, tap → pending route `/laporan`).
   - All native notification taps open `MainActivity` with an extra route that `MainActivity` stores as the pending route (below). Use `ic_stat_saku` + colour `#2B63E0`.
   - **POST_NOTIFICATIONS** (Android 13+): request once, the first time `saveConfig` receives a non-empty token (remember in prefs that it was asked). The permission is already declared in the manifest.
8. **MainActivity bridge** (`AndroidWidgetBridge`, keep every existing method):
   - `setNotificationPrefs(String json)` → store `{budget, bills, weekly}` in `SakuinWidgetPref`; (re)schedule or cancel the weekly alarm.
   - `consumePendingRoute()` → return and clear the stored route (`""` when none).
   - When an intent carries a route (quick entry, native notification), store it and dispatch `window.dispatchEvent(new CustomEvent('sakuin:native-route'))` like the existing `notifyWebViewAboutWidgetQuickAction`.
   - Flush the quick-entry offline queue in `onResume`.

### 5.3 Version bump and release notes
- `apps/web/android/app/build.gradle`: `versionCode 17`, `versionName "2.1.0"`.
- `apps/web/public/latest-version.json` **and** `apps/api/src/config/app-version.ts` (keep them identical): `latestVersionCode 17`, `latestVersionName "2.1.0"`, new `publishedAt`, and release notes like:
  - "Ikon dan layar pembuka baru bergambar Saku."
  - "Widget baru: lihat pengeluaran hari ini dan catat lewat tombol + Catat tanpa membuka aplikasi."
  - "Notifikasi baru: batas kategori, tagihan besok, dan ringkasan mingguan. Atur di Lainnya › Pengingat."
  - "Cukup pasang di atas versi 2.0, tidak perlu hapus aplikasi."
- Check `components/pwa/AppReleaseNotesPrompt.tsx` / `ApkUpdatePrompt.tsx` still read these fields correctly (2.0.0 → 2.1.0 is a normal update over the same signing key).

### 5.4 Build and verify the APK locally
1. Copy (never commit) `D:\sakuin\apps\web\android\local.properties` and `keystore.properties` into this worktree's `apps/web/android/`.
2. `pnpm --filter @sakuin/web build`, then `npx cap sync android` in `apps/web`.
3. In `apps/web/android`: set `JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-17.0.19.10-hotspot"` (the machine default is JDK 25, which Gradle 8.2.1 rejects) and run `./gradlew assembleRelease`. If a Windows file lock blocks `node_modules/.pnpm/@capacitor+android*/node_modules/@capacitor/android/capacitor/build`, run `./gradlew --stop` and delete that build folder.
4. Verify: `aapt dump badging app/build/outputs/apk/release/app-release.apk` (from `%LOCALAPPDATA%/Android/Sdk/build-tools/36.0.0/`) shows `versionCode='17' versionName='2.1.0'` and label "Sakuin"; `keytool -printcert -jarfile app-release.apk` shows SHA-1 `A7:20:43:6E:66:BC:64:F1:57:4A:5B:EA:B6:7C:E9:03:4A:31:6D:3A`.
5. Copy it to `apps/web/public/downloads/sakuin.apk`.
6. Strongly recommended before release: test on the existing emulator AVD `Pixel_7` (SDK at `%LOCALAPPDATA%\Android\Sdk`). Check the splash, the icon, pinning both widgets (Lainnya › Widget), the quick-entry window (typing, save, offline queue), the notifications and their taps. Do not sign in with the user's password yourself; ask the user to sign in, or test the widget and window against a local mock of the three endpoints with a debug build.

### 5.5 Tests before asking to push
- Web: `pnpm --filter @sakuin/web typecheck`, `pnpm --filter @sakuin/web test` (170 tests passed at handoff; a few UI tests can time out when the machine is busy — rerun before assuming a failure).
- API: `pnpm --filter @sakuin/api typecheck`; unit tests without a database: `npx vitest run -c vitest.unit.config.ts tests/glance-copy.test.ts` in `apps/api`. The DB integration tests (including `tests/quick-transaction.test.ts`) run in GitHub CI against Postgres; they have **not** run yet.
- Then report to the user in Indonesian (what changed, what they will see, that everyone needs to install APK 2.1 over 2.0 for the widget/splash/weekly summary while the web parts reach everyone right away) and **ask before pushing**. Suggested flow after approval: commit on this branch, push it, open a PR to `main`, wait for CI, then merge.

## 6. Known limits to tell the user
- Bill reminders are scheduled when the app is opened (up to 3 runs ahead, 62 days); if the app stays closed longer, later reminders wait until the next open.
- The weekly summary alarm is inexact (Android may deliver it a few minutes late).
- The quick-entry window needs internet to guess the category; offline entries are queued and saved later.
- On the website (not the APK) the three new notifications are unavailable.


## 7. Lanjutan lokal — 19 September 2026

Bagian 5.1–5.3 sudah diimplementasikan di worktree ini. Belum di-commit, dipush, atau dirilis.

- Web: tes sakelar Pengingat dan jadwal tagihan; tautan `?ubah=` membuka edit (termasuk fetch ID di luar bulan); contoh widget mengikuti mockup; catatan rilis 2.1.
- Android: ikon adaptif dan PNG notifikasi, splash, font, kedua widget, cache offline, QuickEntryActivity, antrean catatan per akun, kanal notifikasi, alarm mingguan, izin Android 13, dan bridge route/preferensi.
- Pengiriman cepat menerima `requestId` UUID opsional. APK membuatnya sekali per catatan dan mempertahankannya dalam antrean. Server menggunakan ID transaksi deterministik per akun/request untuk menghindari duplikasi saat respons jaringan hilang. Tidak ada perubahan skema Prisma.
- Versi 17 / 2.1.0; metadata API dan JSON web sama. Kunci APK sama dengan 2.0.
- Font OFL disertakan di folder referensi ini. Generator PNG notifikasi juga disimpan.

### Verifikasi

- Web: build dan typecheck lolos. Seluruh 185 tes lolos dengan `pnpm --filter @sakuin/web exec vitest run --maxWorkers=2` (beban paralel default menyebabkan timeout pada komputer ini).
- API: typecheck lolos; 11 unit test lolos (`glance-copy.test.ts`, `quick-replay.unit.test.ts`).
- Release APK, debug APK, dan APK instrumentation tests dibangun lokal.
- Tes database belum dijalankan: menunggu Postgres lokal/CI, tanpa menyentuh database produksi.
- Tes instrumentasi Android tersedia di `apps/web/android/app/src/androidTest/java/com/sakuin/app/SakuNativeTest.java`. Menggunakan HTTP server mock loopback di perangkat, tanpa akun asli. Konfigurasi HTTP loopback hanya ada di build debug.
- **Tes emulator belum berjalan**: image Android 37.1 / 16 KB yang terpasang gagal boot (`metadata` partition missing, kernel panic). AVD Pixel_7 dan AVD uji terpisah sama-sama gagal; data AVD lama tidak dihapus. Karena itu pinning widget, keyboard, tampilan final, serta tap notifikasi masih perlu diuji pada HP/emulator yang berfungsi.

### Cara lanjut verifikasi Android

1. Gunakan emulator yang dapat boot, lalu jalankan `:app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.sakuin.app.SakuNativeTest` melalui Gradle dengan JDK 17.
2. Cek kedua widget pada launcher, splash, keyboard Catat cepat, edit, antrean offline, notifikasi serta tap-nya.
3. API baru belum tersedia di produksi. APK release masih memuat website produksi; uji catat cepat sebelum deploy menggunakan build debug/mock.
4. Minta persetujuan pemilik sebelum push. Jangan merge ke main tanpa arahan karena main langsung mengubah produksi.

Batas fitur tetap seperti bagian 6: tagihan disiapkan saat aplikasi dibuka, alarm mingguan bisa terlambat mengikuti Android, kategori catatan offline ditebak setelah terkirim, dan notifikasi baru khusus APK Android.

## 8. Rilis bertahap (disetujui pemilik, 19 September 2026)

Pemilik memilih rilis **bertahap**, dan setiap langkah harus dicatat di bagian ini supaya pekerjaan bisa dilempar ke Codex kapan saja. Perbarui tabel status setiap kali satu langkah selesai.

| Tahap | Isi | Status |
| --- | --- | --- |
| 1 | Commit semua pekerjaan **kecuali pengumuman APK** di cabang `claude/frosty-engelbart-1dd838`, push cabang, buka PR ke `main` supaya CI menjalankan semua tes termasuk tes database. | Selesai. PR dibuat pemilik; CI "Validate Sakuin" hijau untuk `2086afa` dan `b0b2da6` (termasuk tes database). |
| 2–4 | Merge ke `main`, uji di HP pemilik, lalu umumkan APK 2.1. | Codex langsung merilis 2.1.0 ke `main` sebagai `b0b2da6` (19 Sep, 15.31 WIB): web + API + APK 2.1.0 (kode 17) tayang untuk semua pengguna. CI dan "Build Android APK" hijau. |
| 5 | Pemilik mencoba di HP Xiaomi: widget menampilkan **"Tidak dapat memuat widget"**. | Diperbaiki di 2.1.1, lihat catatan di bawah. |
| 6 | Rilis perbaikan APK 2.1.1 (kode 18). | Selesai (19 Sep). Pemilik membuat PR #3 dan menggabungnya (`2e8ed2c`). CI push + PR hijau (termasuk tes database). Produksi: `latest-version.json` dan `/api/app-version` = 18 / 2.1.1; `downloads/sakuin.apk` publik identik dengan build lokal (SHA-256 `4733509040835eff4a11aa2548048eedf89329813d054ec50e25e138e2ee2e12`). |
| 7 | Pemilik update ke 2.1.1 di HP Xiaomi, lepas lalu pasang ulang widget, dan memastikan widget tampil. | Menunggu kabar pemilik. Kalau masih "Tidak dapat memuat widget": ambil log lewat USB debugging (`adb logcat \| findstr /i "AppWidget RemoteViews"`). |

**Ditahan untuk tahap 4** (sengaja dibiarkan belum di-commit di worktree; jangan di-commit di tahap 1–2):
- `apps/web/public/latest-version.json` (17 / 2.1.0 + catatan rilis)
- `apps/api/src/config/app-version.ts` (sama dengan JSON di atas)
- `apps/web/public/downloads/sakuin.apk` (APK 2.1.0 hasil build lokal, SHA-256 `267c2755bcc294c0741299e08619f5f45a18261774a4f041fd8f7ba00b5683ad`)
- `apps/web/src/lib/release-notes.ts` dan `apps/web/src/components/pwa/AppReleaseNotesPrompt.tsx` (jendela "Saku makin dekat!" yang menyebut APK 2.1)

Selama tahap 2–3, pengguna APK 2.0 hanya melihat perubahan web: layar memuat baru, ikon web baru, sakelar baru di Pengingat (ringkasan mingguan bertuliskan "Perlu update aplikasi ke versi 2.1"), dan notifikasi batas/tagihan yang memakai ikon bawaan APK 2.0.

### Hasil pemeriksaan sebelum tahap 1 (Claude, 19 September 2026)
- APK di `public/downloads/sakuin.apk` identik dengan `android/app/build/outputs/apk/release/app-release.apk` dan tidak ada sumber yang berubah setelah build.
- `aapt`: `com.sakuin.app`, versionCode 17, versionName 2.1.0, label "Sakuin", minSdk 22, targetSdk 34. Manifest rilis tidak berisi pengaturan HTTP khusus tes dan tidak `debuggable`.
- `apksigner`/`keytool`: SHA-1 `A7:20:43:6E:66:BC:64:F1:57:4A:5B:EA:B6:7C:E9:03:4A:31:6D:3A` (sama dengan 2.0.0, jadi bisa dipasang di atas 2.0 tanpa hapus aplikasi).
- Web: typecheck lolos, 185/185 tes lolos (`--maxWorkers=2`). API: typecheck lolos, 11/11 unit test lolos. Tes database belum jalan (menunggu CI tahap 1).
- Belum pernah dicoba di HP/emulator (emulator Android 37.1 di komputer ini gagal boot).

### Perbaikan widget 2.1.1 (Claude, 19 September 2026)
- **Gejala**: di HP Xiaomi (HyperOS) pemilik, widget 2.1.0 hanya bertuliskan "Tidak dapat memuat widget". Bagian aplikasi lain berjalan.
- **Penyebab (paling mungkin)**: layout widget 2.1.0 memakai `android:fontFamily="@font/..."` (Fredoka/Nunito). Font resource tidak didukung resmi di RemoteViews; launcher dengan sistem font sendiri (MIUI/HyperOS) gagal memuat widget. Widget 2.0 yang dulu berjalan di HP yang sama tidak memakai font resource. Selain itu, layout 2.1.1 buatan Codex (belum dirilis) memakai `<View>` sebagai pengisi ruang; `View` bukan kelas RemoteViews sebelum Android 12, jadi ikut diganti.
- **Perbaikan**: semua `@font/...` di `sakuin_finance_widget_medium.xml` dan `_extra.xml` diganti font sistem (`sans-serif-black` untuk angka/judul, `sans-serif` tebal untuk teks); `<View>` diganti `<FrameLayout>`. Font kartun tetap dipakai di jendela Catat cepat (Activity biasa, aman).
- **Penjaga baru**: `apps/web/android/app/src/test/java/com/sakuin/app/WidgetLayoutSafetyTest.java` (jalan dengan `./gradlew :app:testDebugUnitTest`). Tes ini gagal kalau layout widget memakai elemen di luar daftar RemoteViews API 22, memakai `@font/` atau atribut tema aplikasi, atau kalau provider mengubah ID yang tidak ada di layout. Sudah dibuktikan: tes gagal pada layout 2.1.0 dan lolos pada 2.1.1.
- **APK 2.1.1**: `versionCode 18`, `versionName 2.1.1`, label "Sakuin", SHA-1 kunci `A7:20:43:6E:...:6D:3A` (sama), SHA-256 file `4733509040835eff4a11aa2548048eedf89329813d054ec50e25e138e2ee2e12`. Layout widget di dalam APK sudah dicek dengan `aapt2 dump xmltree`: hanya FrameLayout/LinearLayout/TextView/ImageView/ProgressBar, tanpa font resource.
- **Belum terverifikasi di HP**: emulator di komputer ini tidak bisa menyala (image Android 37.1 16 KB butuh emulator lebih baru dari 36.6). Pemilik perlu memperbarui ke 2.1.1 lalu melepas dan memasang ulang widget. Kalau masih gagal, langkah berikutnya: ambil log dari HP (`adb logcat | findstr /i "AppWidget RemoteViews"`) lewat USB debugging.
- Catatan rilis 2.1.1 (`latest-version.json`, `app-version.ts`, `release-notes.ts`) menyebut perbaikan widget. `AppReleaseNotesPrompt.tsx` menulis "Perbaikan ini memerlukan APK 2.1.1."

## 9. Update aplikasi sekali ketuk (usulan, menunggu persetujuan pemilik, 19 September 2026)

**Masalah yang dilaporkan**: setelah 2.1.1 tayang, aplikasi 2.1.0 di HP pemilik tidak menampilkan tawaran update.

**Penyebab yang ditemukan di kode** (`apps/web/src/components/pwa/ApkUpdatePrompt.tsx`, `use-app-version.ts`):
- Pengecekan versi hanya jalan sekali, 1,5 detik setelah halaman web pertama kali dimuat. Kalau Sakuin masih hidup di latar belakang lalu dibuka lagi, WebView tidak memuat ulang, jadi tidak pernah dicek lagi.
- `apiRequest("/app-version")` memanggil `https://sakuin-api.vercel.app/app-version` (404). Rute yang benar `/api/app-version`. Cadangan `fetch("/latest-version.json")` dari origin web tetap berhasil, jadi ini bukan penyebab utama, tapi harus dibetulkan.
- Jalan pintas untuk pengguna sekarang: tutup Sakuin sepenuhnya (geser dari daftar aplikasi terbaru), buka lagi, lalu kartu update muncul; atau unduh langsung dari https://sakuin-web.vercel.app/downloads/sakuin.apk.

**Permintaan pemilik**: setiap ada versi baru, aplikasi memberi notifikasi "ada update", diketuk, lalu langsung mengunduh.

**Mockup** (kanvas https://claude.ai/artifact/DcwFXFG6rKU87uiEjGGkJS baris "4 · Update aplikasi sekali ketuk"; salinan gambar `docs/handoff-apk-2.1/mockups/12-UpdateSekaliKetuk.png`): 4a notifikasi "Update Sakuin 2.1.1 sudah ada" + tombol Perbarui/Nanti, 4b kartu update yang sudah ada (layar sama), 4c kartu berubah jadi bar unduhan dengan persen, 4d layar pasang bawaan Android (tidak bisa diubah).

**Rencana teknis** (belum dikerjakan):
- Tahap A, cukup deploy web (berlaku juga untuk APK 2.0/2.1 yang sudah terpasang): betulkan rute ke `/api/app-version`; cek ulang saat aplikasi kembali ke depan (`App.addListener("appStateChange")` + `visibilitychange`) dan tiap beberapa jam; saat ada versi lebih baru, tampilkan kartu dan notifikasi lokal Capacitor sekali per versi (tap → buka kartu/mulai unduh); tombol "Perbarui sekarang" memakai `AndroidExportBridge.enqueueDownload(url, "sakuin-<versi>.apk", "application/vnd.android.package-archive", "")` (sudah ada sejak 2.0) sehingga unduhan langsung jalan lewat pengunduh Android. Pengguna lalu mengetuk notifikasi "Unduhan selesai" untuk membuka layar pasang.
- Tahap B, butuh APK 2.2: pengecekan harian walau aplikasi tertutup (alarm/WorkManager memanggil `/api/app-version`, lalu notifikasi); bar persen unduhan; setelah unduhan selesai, layar pasang Android langsung dibuka (izin `REQUEST_INSTALL_PACKAGES` + intent install lewat `FileProvider`; pertama kali Android minta izin "Instal aplikasi tidak dikenal" untuk Sakuin).
- Batas Android: aplikasi di luar Play Store tidak bisa memasang dirinya diam-diam; pengguna selalu menekan "Update" di layar pasang Android.
