import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Database,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  RefreshCcw,
  ShieldCheck
} from "lucide-react";
import { AppShell } from "../../components/layout/AppShell";
import { useToast } from "../../components/toast/ToastProvider";
import { Button } from "../../components/ui/button";
import { ApiClientError } from "../../lib/api-client";
import {
  downloadTransactionsExport,
  getDownloadFileNamePreview,
  sanitizeExportFileName,
  type ExportFormat,
  type ExportTypeFilter
} from "./export.service";

const MAX_CUSTOM_FILE_NAME_LENGTH = 80;

const exportOptions = [
  {
    format: "json" as const,
    title: "Export JSON",
    description:
      "Cocok untuk backup data, integrasi teknis, atau kebutuhan arsip mentah.",
    icon: FileJson
  },
  {
    format: "csv" as const,
    title: "Export CSV",
    description:
      "Cocok dibuka di Excel, Google Sheets, atau dipakai untuk analisis data sederhana.",
    icon: FileText
  },
  {
    format: "xlsx" as const,
    title: "Export Excel",
    description:
      "Cocok untuk laporan spreadsheet dengan format Excel yang lebih nyaman dibaca.",
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

function isValidDateInput(value: string) {
  if (!value) {
    return true;
  }

  const date = new Date(`${value}T00:00:00.000`);

  return !Number.isNaN(date.getTime());
}

function validateDateRange(startDate: string, endDate: string) {
  if (startDate && !isValidDateInput(startDate)) {
    return "Tanggal mulai tidak valid.";
  }

  if (endDate && !isValidDateInput(endDate)) {
    return "Tanggal akhir tidak valid.";
  }

  if (!startDate || !endDate) {
    return null;
  }

  const start = new Date(`${startDate}T00:00:00.000`);
  const end = new Date(`${endDate}T00:00:00.000`);

  if (start.getTime() > end.getTime()) {
    return "Tanggal mulai tidak boleh lebih besar dari tanggal akhir.";
  }

  return null;
}

function sanitizeFileNameInput(value: string) {
  return value
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, MAX_CUSTOM_FILE_NAME_LENGTH);
}

function getTypeFilterLabel(type: ExportTypeFilter) {
  if (type === "ALL") {
    return "Semua transaksi";
  }

  if (type === "INCOME") {
    return "Income saja";
  }

  return "Expense saja";
}

function getDateRangeLabel(startDate: string, endDate: string) {
  if (startDate && endDate) {
    return `${startDate} sampai ${endDate}`;
  }

  if (startDate) {
    return `Mulai ${startDate}`;
  }

  if (endDate) {
    return `Sampai ${endDate}`;
  }

  return "Semua tanggal";
}

export function ExportPage() {
  const { addToast } = useToast();

  const [typeFilter, setTypeFilter] = useState<ExportTypeFilter>("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isCustomFileNameEnabled, setIsCustomFileNameEnabled] = useState(false);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const dateRangeError = validateDateRange(startDate, endDate);

  const sanitizedFileName = useMemo(() => {
    return sanitizeExportFileName(fileName);
  }, [fileName]);

  const activeFilterSummary = useMemo(() => {
    return [
      {
        label: "Jenis transaksi",
        value: getTypeFilterLabel(typeFilter)
      },
      {
        label: "Rentang tanggal",
        value: getDateRangeLabel(startDate, endDate)
      },
      {
        label: "Nama file",
        value: isCustomFileNameEnabled
          ? sanitizedFileName || "Belum valid"
          : "Otomatis"
      }
    ];
  }, [typeFilter, startDate, endDate, isCustomFileNameEnabled, sanitizedFileName]);

  const downloadMutation = useMutation({
    mutationFn: async ({ format }: { format: ExportFormat }) => {
      return downloadTransactionsExport({
        format,
        type: typeFilter,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        fileName: isCustomFileNameEnabled ? sanitizedFileName : undefined
      });
    },
    onSuccess: (_result, variables) => {
      addToast({
        variant: "success",
        title: `Export ${variables.format.toUpperCase()} berhasil`,
        description: "File laporan transaksi mulai diunduh."
      });
    },
    onError: (caughtError, variables) => {
      const message = getErrorMessage(caughtError);

      setError(message);

      addToast({
        variant: "error",
        title: `Export ${variables.format.toUpperCase()} gagal`,
        description: message
      });
    }
  });

  const downloadingFormat = downloadMutation.isPending
    ? downloadMutation.variables?.format ?? null
    : null;

  function validateExportRequest() {
    if (dateRangeError) {
      return dateRangeError;
    }

    if (isCustomFileNameEnabled && !sanitizedFileName) {
      return "Nama file custom wajib diisi atau matikan opsi nama file custom.";
    }

    if (
      isCustomFileNameEnabled &&
      sanitizedFileName.length > MAX_CUSTOM_FILE_NAME_LENGTH
    ) {
      return `Nama file maksimal ${MAX_CUSTOM_FILE_NAME_LENGTH} karakter.`;
    }

    return null;
  }

  function handleDownload(format: ExportFormat) {
    const validationError = validateExportRequest();

    if (validationError) {
      setError(validationError);

      addToast({
        variant: "error",
        title: "Export belum bisa dilakukan",
        description: validationError
      });

      return;
    }

    setError(null);

    downloadMutation.mutate({
      format
    });
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

  function handleCustomFileNameChange(value: string) {
    setFileName(sanitizeFileNameInput(value));

    if (error?.includes("Nama file")) {
      setError(null);
    }
  }

  return (
    <AppShell>
      <header className="mb-5 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-zinc-500">Sakuin Export</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[var(--sakuin-text)] sm:text-4xl">
            Export Data
          </h1>
          <p className="mt-1 text-sm font-medium text-zinc-600">
            Unduh data transaksi dalam format JSON, CSV, atau Excel.
          </p>
        </div>

        <div className="hidden h-12 w-12 items-center justify-center rounded-xl bg-[var(--sakuin-primary)] text-white sm:flex">
          <Database className="h-5 w-5" />
        </div>
      </header>

      <div className="mb-5 rounded-3xl border border-[var(--sakuin-secondary)] bg-[var(--sakuin-primary)] p-5 text-white shadow-[0_20px_50px_rgba(37,99,235,0.15)] sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-white/85">
              <Filter className="h-4 w-4" />
              Filter Data Export
            </p>

            <h2 className="mt-2 text-2xl font-black sm:text-3xl">
              Atur data sebelum download
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/85">
              Pilih jenis transaksi, rentang tanggal, dan nama file sebelum
              mengunduh laporan.
            </p>
          </div>

          {downloadMutation.isPending ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-black text-[var(--sakuin-text)]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Menyiapkan file
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-black text-[var(--sakuin-text)]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Export siap
            </div>
          )}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-white/60 p-1">
          {(["ALL", "INCOME", "EXPENSE"] as const).map((item) => (
            <button
              className={
                typeFilter === item
                  ? "rounded-xl bg-[var(--sakuin-secondary)] px-3 py-3 text-xs font-black text-white"
                  : "rounded-xl px-3 py-3 text-xs font-black text-[var(--sakuin-muted)] transition hover:bg-white hover:text-[var(--sakuin-text)]"
              }
              disabled={downloadMutation.isPending}
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
            <span className="mb-2 block text-xs font-black text-[var(--sakuin-muted)]">
              Tanggal mulai
            </span>
            <input
              className="min-h-12 w-full rounded-xl border border-[var(--sakuin-border)] bg-white px-4 text-sm font-semibold text-[var(--sakuin-text)] outline-none transition focus:border-[var(--sakuin-primary)] focus:ring-4 focus:ring-[var(--sakuin-focus)]/20 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={downloadMutation.isPending}
              type="date"
              value={startDate}
              onChange={(event) => {
                setStartDate(event.target.value);
                setError(null);
              }}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-black text-[var(--sakuin-muted)]">
              Tanggal akhir
            </span>
            <input
              className="min-h-12 w-full rounded-xl border border-[var(--sakuin-border)] bg-white px-4 text-sm font-semibold text-[var(--sakuin-text)] outline-none transition focus:border-[var(--sakuin-primary)] focus:ring-4 focus:ring-[var(--sakuin-focus)]/20 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={downloadMutation.isPending}
              type="date"
              value={endDate}
              onChange={(event) => {
                setEndDate(event.target.value);
                setError(null);
              }}
            />
          </label>
        </div>

        {dateRangeError ? (
          <div className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-100">
            {dateRangeError}
          </div>
        ) : null}

        <div className="mt-5 rounded-2xl border border-[var(--sakuin-border)] bg-white p-4">
          <label className="flex items-center gap-3">
            <input
              checked={isCustomFileNameEnabled}
              className="h-4 w-4 accent-black"
              disabled={downloadMutation.isPending}
              type="checkbox"
              onChange={(event) => {
                setIsCustomFileNameEnabled(event.target.checked);
                setError(null);
              }}
            />
            <span className="text-sm font-black text-[var(--sakuin-text)]">
              Gunakan nama file custom
            </span>
          </label>

          {isCustomFileNameEnabled ? (
            <div className="mt-4">
              <label className="block">
                <span className="mb-2 block text-xs font-black text-zinc-500">
                  Nama file
                </span>
                <input
                  className="min-h-12 w-full rounded-xl border border-[var(--sakuin-border)] bg-white px-4 text-sm font-semibold text-[var(--sakuin-text)] outline-none transition placeholder:text-zinc-400 focus:border-[var(--sakuin-primary)] focus:ring-4 focus:ring-[var(--sakuin-focus)]/20 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={downloadMutation.isPending}
                  maxLength={MAX_CUSTOM_FILE_NAME_LENGTH}
                  placeholder="Contoh: laporan-transaksi-mei-2026"
                  value={fileName}
                  onChange={(event) =>
                    handleCustomFileNameChange(event.target.value)
                  }
                />
              </label>

              <p className="mt-2 text-xs leading-5 text-zinc-600">
                Tidak perlu menulis ekstensi file. Karakter ilegal akan diganti
                otomatis. Maksimal {MAX_CUSTOM_FILE_NAME_LENGTH} karakter.
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3 rounded-2xl border border-[var(--sakuin-border)] bg-white p-4 sm:grid-cols-3">
          {activeFilterSummary.map((item) => (
            <div key={item.label}>
              <p className="text-[11px] font-black uppercase text-zinc-500">
                {item.label}
              </p>
              <p className="mt-1 break-words text-sm font-black text-[var(--sakuin-text)]">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--sakuin-secondary)] px-4 text-sm font-black text-white transition hover:bg-[var(--sakuin-secondary)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={downloadMutation.isPending}
            onClick={resetFilters}
            type="button"
          >
            <RefreshCcw className="h-4 w-4" />
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

          const previewFileName = getDownloadFileNamePreview({
            format: option.format,
            type: typeFilter,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            fileName: isCustomFileNameEnabled ? sanitizedFileName : undefined
          });

          return (
            <div
              className="rounded-3xl border border-[var(--sakuin-border)] bg-white p-5 shadow-sm transition hover:bg-[var(--sakuin-primary-soft)]"
              key={option.format}
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--sakuin-primary)] text-white">
                <Icon className="h-6 w-6" />
              </div>

              <h2 className="text-lg font-black text-[var(--sakuin-text)]">
                {option.title}
              </h2>

              <p className="mt-2 min-h-16 text-sm leading-6 text-zinc-600">
                {option.description}
              </p>

              <div className="mt-4 rounded-2xl bg-zinc-50 p-3">
                <p className="text-[11px] font-black uppercase text-zinc-500">
                  Nama file
                </p>
                <p className="mt-1 break-words text-xs font-bold text-zinc-700">
                  {previewFileName}
                </p>
              </div>

              <Button
                className="mt-5 w-full rounded-xl bg-[var(--sakuin-secondary)] text-white hover:bg-[var(--sakuin-secondary)]"
                disabled={downloadMutation.isPending}
                onClick={() => handleDownload(option.format)}
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {isDownloading
                  ? `Menyiapkan ${option.format.toUpperCase()}...`
                  : `Download ${option.format.toUpperCase()}`}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="mt-5 rounded-3xl border border-[var(--sakuin-border)] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-[var(--sakuin-text)]">Catatan Export</h2>

        <div className="mt-3 grid gap-3 text-sm leading-6 text-zinc-600 sm:grid-cols-3">
          <div className="rounded-2xl bg-[var(--sakuin-primary-soft)] p-4">
            <p className="font-black text-[var(--sakuin-text)]">JSON</p>
            <p className="mt-1">Cocok untuk backup dan kebutuhan teknis.</p>
          </div>

          <div className="rounded-2xl bg-[var(--sakuin-primary-soft)] p-4">
            <p className="font-black text-[var(--sakuin-text)]">CSV</p>
            <p className="mt-1">
              Cocok untuk analisis sederhana di spreadsheet.
            </p>
          </div>

          <div className="rounded-2xl bg-[var(--sakuin-primary-soft)] p-4">
            <p className="font-black text-[var(--sakuin-text)]">XLSX</p>
            <p className="mt-1">
              File Excel membuka data transaksi dalam format spreadsheet.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-[var(--sakuin-border)] bg-[var(--sakuin-primary-soft)] p-4 text-sm leading-6 text-zinc-700">
          <div className="flex items-start gap-3">
            <CalendarDays className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              Jika rentang tanggal dikosongkan, export akan mengambil semua
              transaksi sesuai jenis transaksi yang dipilih.
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-[var(--sakuin-border)] bg-zinc-50 p-4 text-sm leading-6 text-zinc-700">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              Tombol export akan nonaktif saat file sedang disiapkan agar tidak
              terjadi download ganda.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
