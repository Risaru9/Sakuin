import { getLocalDateKey } from "../../lib/daily-review";

/**
 * Mengonversi input tanggal lokal ("YYYY-MM-DD") ke format ISO String UTC.
 * Ini memastikan jam transaksi diset ke awal hari (00:00:00) waktu lokal Jakarta (GMT+7)
 * sebelum dikonversi ke string UTC agar tersimpan konsisten di database.
 */
export function toIsoDate(dateInput: string): string {
  const [year = "0", month = "1", day = "1"] = dateInput.split("-");
  
  // Gunakan Date constructor dengan waktu lokal
  const localDate = new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0);
  
  return localDate.toISOString();
}

/**
 * Mendapatkan tanggal default hari ini dalam format lokal "YYYY-MM-DD" (timezone lokal).
 * Menghindari bug toISOString().slice(0, 10) yang bisa mundur sehari jika dijalankan pada pagi hari.
 */
export function getTodayInputValue(): string {
  return getLocalDateKey(new Date());
}

/**
 * Memeriksa apakah tanggal transaksi sama dengan tanggal hari ini (lokal).
 */
export function isTransactionToday(transactionDateString: string): boolean {
  const transactionLocalDate = new Date(transactionDateString);
  if (Number.isNaN(transactionLocalDate.getTime())) {
    return false;
  }
  
  const todayStr = getTodayInputValue();
  return getLocalDateKey(transactionLocalDate) === todayStr;
}

/**
 * Memeriksa apakah transaksi berada di bulan berjalan (lokal).
 */
export function isTransactionInCurrentMonth(transactionDateString: string): boolean {
  const transactionLocalDate = new Date(transactionDateString);
  if (Number.isNaN(transactionLocalDate.getTime())) {
    return false;
  }
  
  const now = new Date();
  return (
    transactionLocalDate.getFullYear() === now.getFullYear() &&
    transactionLocalDate.getMonth() === now.getMonth()
  );
}
