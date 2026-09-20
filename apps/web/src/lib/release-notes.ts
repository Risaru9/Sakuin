export const SAKUIN_RELEASE_VERSION = "2026.09-apk-2.4.0";
export const SAKUIN_RELEASE_TITLE = "Update Sakuin jadi sekali ketuk!";
export const SAKUIN_RELEASE_NOTES = [
  "Sakuin memberi tahu sendiri kalau ada versi baru, walau aplikasi sedang tertutup.",
  "Ketuk notifikasinya: unduhan jalan sendiri, lalu layar pasang Android langsung terbuka.",
  "Widget menyesuaikan ukuran layar tanpa membuat teks gepeng di HP seperti Oppo.",
  "Tombol Catat cepat sekarang bisa dipilih sendiri sesuai kebiasaanmu.",
  "Pilih kategori dulu, lalu ketik nominal langsung tanpa memindahkan kursor.",
  "Pasang APK 2.4.0 di atas versi sebelumnya, tanpa menghapus aplikasi."
];

const RELEASE_NOTES_STORAGE_KEY = "sakuin_seen_release_notes_version";

export function hasSeenCurrentReleaseNotes() {
  try {
    return localStorage.getItem(RELEASE_NOTES_STORAGE_KEY) === SAKUIN_RELEASE_VERSION;
  } catch {
    return true;
  }
}

export function markCurrentReleaseNotesSeen() {
  try {
    localStorage.setItem(RELEASE_NOTES_STORAGE_KEY, SAKUIN_RELEASE_VERSION);
  } catch {
    // Release notes are informational only; storage failure must not block the app.
  }
}
