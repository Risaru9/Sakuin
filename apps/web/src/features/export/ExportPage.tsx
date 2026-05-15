import { useState } from "react";
import {
  AlertTriangle,
  Database,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Loader2
} from "lucide-react";
import { AppShell } from "../../components/layout/AppShell";
import { useToast } from "../../components/toast/ToastProvider";
import { Button } from "../../components/ui/button";
import { ApiClientError } from "../../lib/api-client";
import {
  downloadTransactionsExport,
  type ExportFormat,
  type ExportTypeFilter
} from "./export.service";

const exportOptions = [
  {
    format: "json" as const,
    title: "Export JSON",
    description: "Cocok untuk backup data atau integrasi teknis.",
    icon: FileJson
  },
  {
    format: "csv" as const,
    title: "Export CSV",
    description: "Cocok dibuka di Excel, Google Sheets, atau analisis data.",
    icon: FileText
  },
  {
    format: "xlsx" as const,
    title: "Export Excel",
    description:
      "Cocok untuk laporan spreadsheet. Sheet Transactions akan dibuka sebagai data utama.",
    icon: FileSpreadsheet
  }
];

function getErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Gagal melakukan export data.";
}

function validateDateRange(startDate: string, endDate: string) {
  if (!startDate || !endDate) {
    return null;
  }

  const start = new Date(`${startDate}T00:00:00.000`);
  const end = new Date(`${endDate}T00:00:00.000`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Format tanggal tidak valid.";
  }

  if (start.getTime() > end.getTime()) {
    return "Tanggal mulai tidak boleh lebih besar dari tanggal akhir.";
  }

  return null;
}

export function ExportPage() {
  const { addToast } = useToast();

  const [typeFilter, setTypeFilter] = useState<ExportTypeFilter>("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isCustomFileNameEnabled, setIsCustomFileNameEnabled] = useState(false);
  const [fileName, setFileName] = useState("");

  const [downloadingFormat, setDownloadingFormat] =
    useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload(format: ExportFormat) {
    const dateError = validateDateRange(startDate, endDate);

    if (dateError) {
      setError(dateError);

      addToast({
        variant: "error",
        title: "Export gagal",
        description: dateError
      });

      return;
    }

    setDownloadingFormat(format);
    setError(null);

    try {
      await downloadTransactionsExport({
        format,
        type: typeFilter,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        fileName: isCustomFileNameEnabled ? fileName : undefined
      });

      addToast({
        variant: "success",
        title: `Export ${format.toUpperCase()} berhasil`,
        description: "File laporan transaksi mulai diunduh."
      });
    } catch (caughtError) {
      const message = getErrorMessage(caughtError);

      setError(message);

      addToast({
        variant: "error",
        title: `Export ${format.toUpperCase()} gagal`,
        description: message
      });
    } finally {
      setDownloadingFormat(null);
    }
  }

  function resetFilters() {
    setTypeFilter("ALL");
    setStartDate("");
    setEndDate("");
    setIsCustomFileNameEnabled(false);
    setFileName("");
    setError(null);

    addToast({
      variant: "info",
      title: "Filter export direset",
      description: "Filter export dikembalikan ke pengaturan awal."
    });
  }

  return (
    <AppShell>
      <header className="mb-5 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-indigo-700">Sakuin Export</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Export Data
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Unduh data transaksi dalam format JSON, CSV, atau Excel.
          </p>
        </div>

        <div className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white sm:flex">
          <Database className="h-5 w-5" />
        </div>
      </header>

      <div className="mb-5 rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-xl shadow-slate-950/10 sm:p-7">
        <p className="text-sm font-semibold text-slate-300">
          Filter Data Export
        </p>

        <h2 className="mt-2 text-2xl font-black sm:text-3xl">
          Atur data sebelum download
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
          Kamu bisa memilih jenis transaksi, rentang tanggal, dan nama file
          sebelum mengunduh laporan.
        </p>

        <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-white/10 p-1">
          {(["ALL", "INCOME", "EXPENSE"] as const).map((item) => (
            <button
              className={
                typeFilter === item
                  ? "rounded-xl bg-white px-3 py-3 text-xs font-black text-slate-950"
                  : "rounded-xl px-3 py-3 text-xs font-black text-white/70 transition hover:bg-white/10 hover:text-white"
              }
              key={item}
              onClick={() => setTypeFilter(item)}
              type="button"
            >
              {item === "ALL" ? "Semua" : item}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs font-black text-slate-300">
              Tanggal mulai
            </span>
            <input
              className="min-h-12 w-full rounded-2xl border border-white/10 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition focus:ring-4 focus:ring-indigo-400/30"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-black text-slate-300">
              Tanggal akhir
            </span>
            <input
              className="min-h-12 w-full rounded-2xl border border-white/10 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition focus:ring-4 focus:ring-indigo-400/30"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
          <label className="flex items-center gap-3">
            <input
              checked={isCustomFileNameEnabled}
              className="h-4 w-4 accent-indigo-500"
              type="checkbox"
              onChange={(event) =>
                setIsCustomFileNameEnabled(event.target.checked)
              }
            />
            <span className="text-sm font-black text-white">
              Gunakan nama file custom
            </span>
          </label>

          {isCustomFileNameEnabled ? (
            <div className="mt-4">
              <label className="block">
                <span className="mb-2 block text-xs font-black text-slate-300">
                  Nama file
                </span>
                <input
                  className="min-h-12 w-full rounded-2xl border border-white/10 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:ring-4 focus:ring-indigo-400/30"
                  placeholder="Contoh: laporan-transaksi-mei-2026"
                  value={fileName}
                  onChange={(event) => setFileName(event.target.value)}
                />
              </label>
              <p className="mt-2 text-xs leading-5 text-slate-300">
                Tidak perlu menulis ekstensi file. Sistem akan otomatis
                menambahkan .json, .csv, atau .xlsx sesuai format yang kamu
                pilih.
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-white/10 px-4 text-sm font-black text-white transition hover:bg-white/15"
            onClick={resetFilters}
            type="button"
          >
            Reset Filter
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-black">Export gagal</p>
              <p className="mt-1 text-sm font-medium text-rose-700">
                {error}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {exportOptions.map((option) => {
          const Icon = option.icon;
          const isDownloading = downloadingFormat === option.format;

          return (
            <div
              className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
              key={option.format}
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <Icon className="h-6 w-6" />
              </div>

              <h2 className="text-lg font-black text-slate-950">
                {option.title}
              </h2>

              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">
                {option.description}
              </p>

              <Button
                className="mt-5 w-full rounded-2xl bg-slate-950 text-white hover:bg-black"
                disabled={Boolean(downloadingFormat)}
                onClick={() => void handleDownload(option.format)}
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Download {option.format.toUpperCase()}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="mt-5 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">Catatan Export</h2>

        <div className="mt-3 grid gap-3 text-sm leading-6 text-slate-600 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="font-black text-slate-950">JSON</p>
            <p className="mt-1">Cocok untuk backup dan kebutuhan teknis.</p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="font-black text-slate-950">CSV</p>
            <p className="mt-1">
              Cocok untuk analisis sederhana di spreadsheet.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="font-black text-slate-950">XLSX</p>
            <p className="mt-1">
              File Excel akan membuka sheet Transactions sebagai dataset utama.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}