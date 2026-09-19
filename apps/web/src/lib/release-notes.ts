export const SAKUIN_RELEASE_VERSION = "2026.09-apk-2.1.1";
export const SAKUIN_RELEASE_TITLE = "Widget Saku sudah diperbaiki!";
export const SAKUIN_RELEASE_NOTES = [
  "Perbaikan: widget yang tadinya bertuliskan \"Tidak dapat memuat widget\" sekarang tampil lagi.",
  "Catat langsung dari widget lewat tombol + Catat.",
  "Ikon, layar pembuka, dan notifikasi baru tetap tersedia.",
  "Pasang APK 2.1.1 di atas versi 2.0 atau 2.1.0, tanpa menghapus aplikasi."
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
