export const SAKUIN_RELEASE_VERSION = "2026.09-apk-2.1.2";
export const SAKUIN_RELEASE_TITLE = "Widget Saku sudah diperbaiki!";
export const SAKUIN_RELEASE_NOTES = [
  "Widget sedang dan besar mengikuti mockup, dengan font Saku dan tata letak adaptif.",
  "Panel + Catat dirapikan: mengetik, menyimpan, ikon kategori, dan batas anggaran.",
  "Rendering widget tidak bergantung pada font launcher atau merek HP.",
  "Pasang APK 2.1.2 di atas versi sebelumnya, tanpa menghapus aplikasi."
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
