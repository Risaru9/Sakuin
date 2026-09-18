export const SAKUIN_RELEASE_VERSION = "2026.09-saku-redesign";

export const SAKUIN_RELEASE_TITLE = "Halo, ini Sakuin yang baru!";

export const SAKUIN_RELEASE_NOTES = [
  "Catat cukup satu baris di bawah layar, misalnya \"kopi 18rb\", lalu Enter.",
  "Menu bawah jadi tiga: Catatan, Laporan, dan Lainnya.",
  "Rekening, kategori, target, dan pengingat sekarang ada di Lainnya.",
  "Ketuk Saku di kolom catat untuk bertanya soal uangmu."
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
