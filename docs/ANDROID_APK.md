# Dokumentasi Android APK Sakuin

## Overview

Sakuin menyediakan dua cara akses:
1. **PWA (Progressive Web App)** - Akses via browser, install ke home screen
2. **APK Android** - Download dan install manual, support widget native

## Perbedaan PWA vs APK

| Fitur | PWA | APK |
|-------|-----|-----|
| Install | Add to Home Screen | Download APK + install |
| Update | Otomatis (deploy Vercel) | Manual download APK baru |
| Widget | ❌ Tidak support | ✅ Support widget native |
| Notifikasi | ✅ Web Push | ✅ Native notification |
| Offline | ✅ Service Worker | ✅ Service Worker + native cache |
| Icon | ✅ Di home screen | ✅ Di app drawer |
| Size | ~2 MB (cache) | ~8 MB (APK) |

## Cara Install APK

### Untuk User

1. Buka https://sakuin-web.vercel.app
2. Scroll ke bawah, klik "Download Aplikasi"
3. Download file `sakuin-v1.1.apk`
4. Buka file APK di HP
5. Jika muncul "Install blocked", tap "Settings" → aktifkan "Install from this source"
6. Tap "Install"
7. Setelah install, buka aplikasi Sakuin
8. Login dengan akun kamu

### Cara Update APK

1. Download APK versi terbaru dari website
2. Install langsung (tidak perlu uninstall APK lama)
3. Data dan login tetap aman
4. Widget tetap muncul di home screen

## Cara Build APK (untuk Developer)

Lihat file [BUILD_APK_CHECKLIST.md](file:///d:/sakuin/BUILD_APK_CHECKLIST.md) di root project dan detail pipeline di [APK_UPDATE_FLOW.md](file:///d:/sakuin/docs/APK_UPDATE_FLOW.md).

## Cara Distribusi & Update APK (untuk Developer)

Lihat file [GITHUB_RELEASE_GUIDE.md](file:///d:/sakuin/GITHUB_RELEASE_GUIDE.md) di root project dan sistem in-app update checker di [APK_UPDATE_FLOW.md](file:///d:/sakuin/docs/APK_UPDATE_FLOW.md).

## Troubleshooting

### APK tidak bisa diinstall

**Error:** "App not installed"

**Solusi:**
- Pastikan HP mengizinkan install dari sumber tidak dikenal
- Settings → Security → Install unknown apps → Chrome/File Manager → Allow
- Jika masih gagal, uninstall APK lama dulu

### Widget tidak muncul

**Solusi:**
- Long press home screen → Widgets → cari "Sakuin"
- Jika tidak ada, restart HP
- Jika masih tidak ada, reinstall APK

### Widget tidak update

**Solusi:**
- Buka aplikasi Sakuin sekali (widget akan auto-refresh)
- Atau tap tombol ↻ di widget untuk refresh manual
- Atau unlock layar HP (widget auto-refresh)

### Notifikasi tidak muncul

**Solusi:**
- Buka Profile → Pengingat → Aktifkan notifikasi
- Pastikan izin POST_NOTIFICATIONS sudah diberikan
- Settings → Apps → Sakuin → Notifications → Allow

## Version History

### v1.1 (2026-05-30)
- Deep link `/profile?section=notifications`
- Widget refresh button
- Widget auto-update saat app dibuka
- Bug fix widget JSON parsing
- Hapus tombol download dari login page

### v1.0 (2026-05-28)
- Initial release
- Widget home screen
- Native notification bridge
- WebView wrapper Capacitor

## Support

Jika ada masalah dengan APK, hubungi:
- Email: sakuinofficial@gmail.com
- GitHub Issues: https://github.com/Risaru9/Sakuin/issues
- Feedback Form: https://docs.google.com/forms/d/e/1FAIpQLSfr2eAUDvktXBFQwBo8SkB--6AWi0K9ooIeilwLUZIVxoZLbg/viewform
