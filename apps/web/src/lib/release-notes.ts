export const SAKUIN_RELEASE_VERSION = "2026.09-apk-2.2.0";
export const SAKUIN_RELEASE_TITLE = "Update Sakuin jadi sekali ketuk!";
export const SAKUIN_RELEASE_NOTES = [
  "Sakuin memberi tahu sendiri kalau ada versi baru, walau aplikasi sedang tertutup.",
  "Ketuk notifikasinya: unduhan jalan sendiri, lalu layar pasang Android langsung terbuka.",
  "Widget dan catat cepat tetap seperti 2.1.2.",
  "Pasang APK 2.2.0 di atas versi sebelumnya, tanpa menghapus aplikasi."
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
