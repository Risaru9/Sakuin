# Panduan GitHub Releases untuk APK Sakuin

## Cara membuat GitHub Release

### 1. Build APK release

```bash
cd d:\sakuin\apps\web\android
set ANDROID_HOME=C:\Users\USER\AppData\Local\Android\Sdk
set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot
gradlew.bat assembleRelease --no-daemon
```

APK ada di: `apps/web/android/app/build/outputs/apk/release/app-release.apk`

### 2. Rename APK dengan versi

```bash
copy apps\web\android\app\build\outputs\apk\release\app-release.apk sakuin-v1.1.apk
```

### 3. Buat Git tag

```bash
git tag v1.1
git push origin v1.1
```

### 4. Buat GitHub Release

1. Buka https://github.com/Risaru9/Sakuin/releases
2. Klik "Draft a new release"
3. **Choose a tag:** `v1.1`
4. **Release title:** `Sakuin v1.1 - Notifikasi & Widget Update`
5. **Description:**

```markdown
## 🎉 Apa yang baru di v1.1?

### ✨ Fitur Baru
- Deep link `/profile?section=notifications` untuk akses langsung ke pengaturan notifikasi
- Tombol refresh ↻ di widget untuk update manual
- Widget otomatis refresh saat aplikasi dibuka

### 🐛 Bug Fixes
- Perbaiki widget tidak update setelah transaksi berubah
- Perbaiki parsing JSON API di widget
- Perbaiki status mapping widget (SAFE/WATCH/HOLD)

### 🔧 Improvements
- Widget update saat HP restart (BOOT_COMPLETED)
- Widget update saat unlock layar (USER_PRESENT)
- Hapus tombol download APK dari halaman login

### 📦 Download
- **APK size:** ~8 MB
- **Min Android:** 7.0 (API 24)
- **Target Android:** 14 (API 34)

### 📝 Cara Install
1. Download file `sakuin-v1.1.apk` di bawah
2. Buka file APK di HP
3. Izinkan install dari sumber tidak dikenal
4. Tap "Install"

### 🔄 Cara Update dari v1.0
1. Download APK v1.1
2. Install langsung (tidak perlu uninstall v1.0)
3. Data dan login tetap aman

### ⚠️ Catatan
- Widget perlu dibuka aplikasi sekali untuk refresh data
- Notifikasi butuh izin POST_NOTIFICATIONS di Android 13+
```

6. **Attach files:** Upload `sakuin-v1.1.apk`
7. Klik "Publish release"

### 5. URL download APK

Setelah release dipublish, URL download:

```
https://github.com/Risaru9/Sakuin/releases/download/v1.1/sakuin-v1.1.apk
```

Format:
```
https://github.com/{username}/{repo}/releases/download/{tag}/{filename}
```

### 6. Update tombol download di website

Edit `apps/web/src/app/router.tsx` (HomePage):

```tsx
<a
  href="https://github.com/Risaru9/Sakuin/releases/download/v1.1/sakuin-v1.1.apk"
  download="sakuin-v1.1.apk"
  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[var(--sakuin-border)] bg-white px-6 text-base font-bold text-[var(--sakuin-text)] shadow-sm transition hover:bg-zinc-50 sm:w-auto"
>
  <Download className="h-5 w-5" />
  <span>Download Aplikasi v1.1</span>
</a>
```

### 7. Cara user tahu ada versi baru

**Opsi 1: Manual check (MVP)**

Tambahkan di ProfilePage atau About page:

```tsx
<div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
  <p className="text-sm font-black text-blue-900">
    Versi terbaru: v1.1
  </p>
  <p className="mt-1 text-xs font-medium text-blue-700">
    Versi kamu: v1.0
  </p>
  <a
    href="https://github.com/Risaru9/Sakuin/releases/latest"
    className="mt-2 inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-black text-white"
  >
    <Download className="h-3.5 w-3.5" />
    Update ke v1.1
  </a>
</div>
```

**Opsi 2: API check version (advanced)**

Buat endpoint `/api/version`:

```ts
// Backend
export function getLatestVersion() {
  return {
    version: "1.1",
    versionCode: 2,
    downloadUrl: "https://github.com/Risaru9/Sakuin/releases/download/v1.1/sakuin-v1.1.apk",
    changelog: "Notifikasi & Widget Update",
    required: false // true jika wajib update
  };
}
```

Frontend check saat app dibuka:

```ts
// Frontend
const currentVersion = "1.0";
const latestVersion = await fetch("/api/version").then(r => r.json());

if (latestVersion.version !== currentVersion) {
  // Show update banner
}
```

**Opsi 3: In-app update (advanced, butuh backend)**

- User buka app → check version dari API
- Jika ada versi baru → show dialog "Update tersedia"
- User tap "Download" → download APK dari GitHub
- Setelah download selesai → prompt install APK

**Catatan:** Android tidak mengizinkan auto-install APK tanpa user action (security).

## Versioning Strategy

### Semantic Versioning

Format: `MAJOR.MINOR.PATCH`

- **MAJOR (1.x.x):** Breaking changes, redesign besar
- **MINOR (x.1.x):** Fitur baru, perubahan native Android
- **PATCH (x.x.1):** Bug fixes, perubahan kecil

Contoh:
- `1.0.0` → Initial release
- `1.1.0` → Notifikasi & widget update (fitur baru)
- `1.1.1` → Bug fix widget crash
- `1.2.0` → Tambah fitur export PDF
- `2.0.0` → Redesign UI besar-besaran

### versionCode vs versionName

```gradle
versionCode 2      // Integer, harus naik setiap release
versionName "1.1"  // String, untuk display ke user
```

| Release | versionCode | versionName |
|---------|-------------|-------------|
| Initial | 1 | 1.0 |
| Notif & widget | 2 | 1.1 |
| Bug fix | 3 | 1.1.1 |
| Export PDF | 4 | 1.2 |
| Redesign | 5 | 2.0 |

## Checklist sebelum release

- [ ] `versionCode` sudah dinaikkan
- [ ] `versionName` sudah diupdate
- [ ] Frontend sudah di-build (`pnpm build`)
- [ ] APK release sudah di-build (`gradlew.bat assembleRelease`)
- [ ] APK sudah ditest di HP (lihat `APK_TESTING_CHECKLIST.md`)
- [ ] Changelog sudah ditulis
- [ ] Git tag sudah dibuat
- [ ] GitHub Release sudah dipublish
- [ ] URL download di website sudah diupdate
- [ ] Vercel deployment sudah success
