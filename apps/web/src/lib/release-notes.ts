export const SAKUIN_RELEASE_VERSION = "2026.05.27-mobile-app-readiness";

export const SAKUIN_RELEASE_TITLE = "Sakuin makin siap jadi aplikasi";

export const SAKUIN_RELEASE_NOTES = [
  "AI Assistant sekarang terasa seperti full room chat di mobile.",
  "Pengingat transaksi sudah lebih jelas, bisa dites, dan tidak perlu install ulang.",
  "PWA, install flow, dan kesiapan menuju Android/Play Store sudah dipoles."
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
