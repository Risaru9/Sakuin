# Checklist Build APK Sakuin

## Prerequisites

- [ ] Java JDK 17 terinstall
- [ ] Android SDK terinstall (via Android Studio)
- [ ] ANDROID_HOME environment variable sudah diset
- [ ] File `apps/web/android/local.properties` sudah ada dan benar

## Langkah Build APK

### 1. Build frontend dulu (jika ada perubahan webapp)

```bash
cd apps/web
pnpm build
```

### 2. Sync ke Android (jika ada perubahan Capacitor config atau webapp)

```bash
cd apps/web
npx cap sync android
```

### 3. Naikkan versionCode (jika perlu)

Edit `apps/web/android/app/build.gradle`:

```gradle
versionCode 3  // naikkan dari 2 ke 3
versionName "1.2"  // naikkan dari 1.1 ke 1.2
```

### 4. Build APK debug (untuk testing)

```bash
cd apps/web/android
set ANDROID_HOME=C:\Users\USER\AppData\Local\Android\Sdk
set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot
gradlew.bat assembleDebug
```

### 5. Build APK release (untuk distribusi)

```bash
cd apps/web/android
set ANDROID_HOME=C:\Users\USER\AppData\Local\Android\Sdk
set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot
gradlew.bat assembleRelease
```

## Lokasi APK hasil build

- **Debug:** `apps/web/android/app/build/outputs/apk/debug/app-debug.apk`
- **Release:** `apps/web/android/app/build/outputs/apk/release/app-release.apk`

## Cara cek APK berhasil dibuat

```bash
# Cek file APK ada
dir apps\web\android\app\build\outputs\apk\debug\app-debug.apk

# Cek ukuran APK (seharusnya 5-15 MB)
# Jika terlalu kecil (<1 MB), build gagal
```

## Cara cek versionCode dan versionName

```bash
# Install aapt (Android Asset Packaging Tool) dari Android SDK
# Lokasi: %ANDROID_HOME%\build-tools\<version>\aapt.exe

# Cek info APK
%ANDROID_HOME%\build-tools\37.0.0\aapt.exe dump badging apps\web\android\app\build\outputs\apk\debug\app-debug.apk | findstr "versionCode versionName"
```

Output:
```
versionCode='2' versionName='1.1'
```

## Troubleshooting

### Error: JAVA_HOME is set to an invalid directory

**Solusi:** Set JAVA_HOME ke JDK 17:
```bash
set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot
```

### Error: SDK location not found

**Solusi:** Buat file `apps/web/android/local.properties`:
```
sdk.dir=C:/Users/USER/AppData/Local/Android/Sdk
```

### Error: Gradle cache corrupt

**Solusi:** Hapus cache:
```bash
rmdir /s /q %USERPROFILE%\.gradle\caches
```

### Build stuck atau timeout

**Solusi:** Gunakan `--no-daemon`:
```bash
gradlew.bat assembleDebug --no-daemon
```
