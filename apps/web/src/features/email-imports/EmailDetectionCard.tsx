import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Unplug,
  XCircle
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { queryKeys } from "../../lib/query-keys";
import { formatDate, formatRupiah, getErrorMessage } from "../dashboard/dashboard-utils";
import {
  approveEmailImport,
  disconnectGmail,
  getEmailImportOverview,
  getGmailAuthUrl,
  ignoreEmailImport,
  syncGmail,
  type EmailTransactionImport
} from "./email-import.service";

const supportedBanks = [
  "BCA",
  "BRI",
  "BNI",
  "Mandiri",
  "BSI",
  "CIMB Niaga",
  "Permata",
  "BTN",
  "Danamon",
  "OCBC",
  "Bank Jago",
  "SeaBank",
  "Maybank"
];

function getStatusBadge(importItem: EmailTransactionImport) {
  if (importItem.status === "imported") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (importItem.status === "duplicate") {
    return "bg-amber-50 text-amber-800 ring-amber-200";
  }

  if (importItem.status === "ignored") {
    return "bg-slate-100 text-slate-600 ring-slate-200";
  }

  return "bg-blue-50 text-blue-700 ring-blue-200";
}

function getStatusLabel(status: EmailTransactionImport["status"]) {
  if (status === "imported") return "Tercatat";
  if (status === "duplicate") return "Duplikat";
  if (status === "ignored") return "Diabaikan";
  return "Review";
}

function formatProvider(importItem: EmailTransactionImport) {
  const provider = importItem.financialProvider || "Tidak dikenal";
  return `M-Banking ${provider}`;
}

function formatDetectionTitle(importItem: EmailTransactionImport) {
  const title = formatProvider(importItem);
  if (!importItem.merchant) {
    return title;
  }

  return `${title} - ${importItem.merchant}`.slice(0, 72);
}

export function EmailDetectionCard() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const overviewQuery = useQuery({
    queryKey: queryKeys.emailImports.overview,
    queryFn: getEmailImportOverview,
    staleTime: 30_000
  });

  async function refreshAfterImport() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.emailImports.overview }),
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts }),
      queryClient.invalidateQueries({ queryKey: queryKeys.summary }),
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all })
    ]);
  }

  const approveMutation = useMutation({
    mutationFn: approveEmailImport,
    onSuccess: refreshAfterImport
  });

  const ignoreMutation = useMutation({
    mutationFn: ignoreEmailImport,
    onSuccess: refreshAfterImport
  });

  const gmailMutation = useMutation({
    mutationFn: getGmailAuthUrl,
    onSuccess: async (result) => {
      if (result.authUrl) {
        if (Capacitor.isNativePlatform()) {
          await Browser.open({ url: result.authUrl });
          return;
        }

        window.location.href = result.authUrl;
      }
    }
  });

  const syncMutation = useMutation({
    mutationFn: syncGmail,
    onSuccess: async (result) => {
      setSyncMessage(
        `${result.processed} email diproses, ${result.imported} tercatat, ${result.needsReview} perlu review.`
      );
      await refreshAfterImport();
    },
    onError: (error) => {
      setSyncMessage(getErrorMessage(error));
    }
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectGmail,
    onSuccess: async () => {
      setSyncMessage("Koneksi Gmail diputus.");
      await refreshAfterImport();
    },
    onError: (error) => {
      setSyncMessage(getErrorMessage(error));
    }
  });

  const overview = overviewQuery.data;
  const hasConnectedGmail = (overview?.connections ?? []).some(
    (connection) => connection.status === "active"
  );

  useEffect(() => {
    function handleEmailImportReturned() {
      setSyncMessage("Gmail terhubung. Sinkronkan untuk mendeteksi transaksi m-banking terbaru.");
      void refreshAfterImport();
    }

    window.addEventListener("sakuin:email-import-returned", handleEmailImportReturned);

    return () => {
      window.removeEventListener("sakuin:email-import-returned", handleEmailImportReturned);
    };
  }, []);

  useEffect(() => {
    const emailImportStatus = searchParams.get("emailImport");
    const emailImportMessage = searchParams.get("message");

    if (!emailImportStatus) {
      return;
    }

    if (emailImportStatus === "connected") {
      setSyncMessage("Gmail terhubung. Sinkronkan untuk mendeteksi transaksi m-banking terbaru.");
      void refreshAfterImport();
    } else if (emailImportStatus === "error") {
      setSyncMessage(emailImportMessage ?? "Koneksi Gmail gagal. Coba hubungkan ulang.");
    }

    const next = new URLSearchParams(searchParams);
    next.delete("emailImport");
    next.delete("message");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  return (
    <section className="sakuin-card-lift rounded-3xl border border-blue-100 bg-gradient-to-b from-blue-50 to-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--sakuin-primary-soft)] text-[var(--sakuin-primary)]">
            <Mail className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-black text-[var(--sakuin-text)]">
              Otomasi M-Banking
            </h2>
            <p className="mt-1 text-xs font-semibold leading-5 text-zinc-500">
              Hubungkan Gmail sekali. Sakuin mengenali email resmi bank, membuat rekening bank otomatis, dan mencatat transaksinya.
            </p>
          </div>
        </div>

        <button
          className="sakuin-press flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--sakuin-border)] bg-white text-zinc-600 shadow-sm transition hover:bg-zinc-50"
          onClick={() => overviewQuery.refetch()}
          type="button"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Tercatat", overview?.stats.imported ?? 0, "text-emerald-700"],
          ["Review", overview?.stats.needsReview ?? 0, "text-blue-700"],
          ["Duplikat", overview?.stats.duplicate ?? 0, "text-amber-700"],
          ["Diabaikan", overview?.stats.ignored ?? 0, "text-slate-600"]
        ].map(([label, value, color]) => (
          <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100" key={label}>
            <p className="text-[11px] font-bold text-zinc-500">{label}</p>
            <p className={["mt-1 text-xl font-black", color as string].join(" ")}>
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <p className="text-[11px] font-semibold leading-5 text-zinc-600">
            Gmail hanya diberi izin baca. Sakuin memproses email transaksi dari domain resmi bank; hasil ambigu masuk review dan email lain diabaikan.
          </p>
        </div>

        <div
          className={[
            "mt-3 rounded-2xl px-3 py-2 text-xs font-black ring-1",
            hasConnectedGmail
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
              : "bg-amber-50 text-amber-800 ring-amber-200"
          ].join(" ")}
        >
          {hasConnectedGmail
            ? "Aktif: transaksi bank baru akan dipetakan otomatis ke rekening yang sesuai."
            : "Status: Gmail belum terhubung."}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            className="rounded-xl"
            disabled={!overview?.gmailConfigured || gmailMutation.isPending}
            onClick={() => gmailMutation.mutate()}
            size="sm"
            type="button"
          >
            <Sparkles className="h-4 w-4" />
            {overview?.gmailConfigured ? "Hubungkan Gmail" : "OAuth belum aktif"}
          </Button>
          <Button
            className="rounded-xl"
            disabled={
              !overview?.connections.length ||
              syncMutation.isPending ||
              !overview?.gmailConfigured
            }
            isLoading={syncMutation.isPending}
            onClick={() => syncMutation.mutate({ maxMessages: 25 })}
            size="sm"
            type="button"
            variant="secondary"
          >
            <RefreshCw className="h-4 w-4" />
            Sinkronkan
          </Button>
        </div>

        {syncMessage ? (
          <p className="mt-2 rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-zinc-600 ring-1 ring-slate-100">
            {syncMessage}
          </p>
        ) : null}

        {(overview?.connections ?? []).length > 0 ? (
          <div className="mt-3 grid gap-2">
            {overview?.connections.map((connection) => (
              <div
                className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-100"
                key={connection.id}
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-black text-[var(--sakuin-text)]">
                    {connection.emailAddress}
                  </p>
                  <p className="mt-0.5 text-[10px] font-bold text-zinc-500">
                    {connection.lastSyncedAt
                      ? `Sync ${formatDate(connection.lastSyncedAt)}`
                      : "Belum pernah sync"}
                  </p>
                  {connection.detectedProviders.length > 0 ? (
                    <p className="mt-1 text-[10px] font-black text-blue-700">
                      Bank terdeteksi: {connection.detectedProviders.join(", ")}
                    </p>
                  ) : null}
                </div>
                <button
                  className="sakuin-press flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-rose-600 transition hover:bg-rose-50"
                  disabled={disconnectMutation.isPending}
                  onClick={() => disconnectMutation.mutate(connection.id)}
                  type="button"
                >
                  <Unplug className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-4 rounded-2xl border border-blue-100 bg-white p-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-[var(--sakuin-primary)]" />
          <p className="text-xs font-black text-[var(--sakuin-text)]">
            Bank yang didukung
          </p>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {supportedBanks.map((bank) => (
            <span
              className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700 ring-1 ring-blue-100"
              key={bank}
            >
              {bank}
            </span>
          ))}
        </div>
        <p className="mt-3 text-[11px] font-semibold leading-5 text-zinc-500">
          Sinkronisasi otomatis berjalan sekali sehari. Tombol Sinkronkan dapat digunakan kapan saja untuk mengambil email terbaru.
        </p>
      </div>

      <div className="mt-5 grid gap-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-black text-[var(--sakuin-text)]">
            Hasil deteksi terbaru
          </p>
          <p className="text-[11px] font-bold text-zinc-500">
            {overview?.connections.length ?? 0} email terhubung
          </p>
        </div>

        {overviewQuery.isLoading ? (
          <div className="rounded-2xl bg-slate-50 p-5 text-center text-sm font-semibold text-zinc-500">
            Memuat deteksi...
          </div>
        ) : (overview?.recentImports ?? []).length > 0 ? (
          <div className="grid max-h-[32rem] gap-3 overflow-y-auto pr-1">
            {overview?.recentImports.map((item) => (
            <div
              className="rounded-2xl border border-[var(--sakuin-border)] bg-white p-3 shadow-sm"
              key={item.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-[var(--sakuin-text)]">
                    {formatDetectionTitle(item)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-zinc-500">
                    {item.method ?? "Email"} | {item.occurredAt ? formatDate(item.occurredAt) : "Tanggal belum jelas"}
                    {item.emailAddress ? ` | ${item.emailAddress}` : ""}
                  </p>
                  {item.accountName ? (
                    <p className="mt-1 text-[11px] font-black text-blue-700">
                      Masuk ke rekening {item.accountName}
                    </p>
                  ) : null}
                </div>
                <span className={["shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ring-1", getStatusBadge(item)].join(" ")}>
                  {getStatusLabel(item.status)}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                {item.amount ? (
                  <p className={["text-lg font-black", item.type === "INCOME" ? "text-emerald-700" : "text-rose-700"].join(" ")}>
                    {formatRupiah(item.amount)}
                  </p>
                ) : (
                  <p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                    Nominal belum jelas
                  </p>
                )}
                <p className="text-[11px] font-bold text-zinc-500">
                  Confidence {Math.round(item.confidence * 100)}%
                </p>
              </div>
              {item.statusReason ? (
                <p className="mt-2 text-[11px] font-semibold leading-5 text-zinc-500">
                  {item.statusReason}
                </p>
              ) : null}
              {item.status === "needs_review" ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    className="rounded-xl"
                    disabled={approveMutation.isPending}
                    onClick={() => approveMutation.mutate(item.id)}
                    size="sm"
                    type="button"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Setujui
                  </Button>
                  <Button
                    className="rounded-xl"
                    disabled={ignoreMutation.isPending}
                    onClick={() => ignoreMutation.mutate(item.id)}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    <XCircle className="h-4 w-4" />
                    Abaikan
                  </Button>
                </div>
              ) : null}
            </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-[var(--sakuin-primary-soft)] p-5 text-center">
            <AlertTriangle className="mx-auto h-5 w-5 text-[var(--sakuin-primary)]" />
            <p className="mt-2 text-sm font-bold text-zinc-600">
              Belum ada email transaksi yang diproses.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
