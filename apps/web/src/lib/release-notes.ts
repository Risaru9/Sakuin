export const SAKUIN_RELEASE_VERSION = "2026.09-apk-2.1";
export const SAKUIN_RELEASE_TITLE = "Saku makin dekat!";
export const SAKUIN_RELEASE_NOTES = [
  "Ikon dan layar pembuka baru bergambar Saku.",
  "APK 2.1: catat langsung dari widget lewat tombol + Catat.",
  "Atur kabar batas kategori, tagihan besok, dan ringkasan mingguan di Lainnya › Pengingat.",
  "Pasang APK 2.1 di atas versi 2.0, tanpa menghapus aplikasi."
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
