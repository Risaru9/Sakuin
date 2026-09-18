import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ChevronDown, Repeat } from "lucide-react";
import { AppShell } from "../../components/layout/AppShell";
import {
  SakuMascot,
  SakuSparkle,
  showSnack,
  StickerButton,
  StickerCard
} from "../../components/saku";
import { ApiClientError } from "../../lib/api-client";
import { cn } from "../../lib/cn";
import { queryKeys } from "../../lib/query-keys";
import { ACCOUNT_TYPE_VISUALS, accountBalance, monthChangeByAccount } from "../accounts/account-data";
import { AccountFormSheet } from "../accounts/AccountFormSheet";
import {
  getAccountsWithArchived,
  getAccountTransfers,
  restoreAccount
} from "../accounts/account.service";
import type { FinanceAccount } from "../accounts/account.types";
import { TransferSheet } from "../accounts/TransferSheet";
import { fetchWholeMonth, formatPlainAmount, getMonthListParams } from "../beranda/beranda-data";
import { getTodayInputValue } from "../transactions/transaction-date";
import { FloatingSnackHost, SubPageHeader } from "./SubPageParts";

function AccountIcon({ account, size = 44 }: { account: FinanceAccount; size?: number }) {
  const visual = ACCOUNT_TYPE_VISUALS[account.type];

  return (
    <span
      aria-hidden="true"
      className="saku-line-thin flex shrink-0 items-center justify-center rounded-full"
      style={{ width: size, height: size, background: visual.background }}
    >
      <visual.Icon
        className="size-[47%]"
        strokeWidth={2.3}
        style={{ color: account.color ?? "var(--color-saku-ink)" }}
      />
    </span>
  );
}

function describeMonthChange(change: number | undefined) {
  if (!change) {
    return null;
  }

  return `Bulan ini ${change > 0 ? "+" : "−"}${formatPlainAmount(Math.abs(change))}`;
}

function RekeningSkeleton() {
  return (
    <div aria-hidden="true" className="mt-4 space-y-3">
      <div className="h-[118px] animate-pulse rounded-saku-hero bg-saku-dash/60" />
      {[0, 1, 2].map((index) => (
        <div className="h-[70px] animate-pulse rounded-saku-card bg-saku-dash/40" key={index} />
      ))}
    </div>
  );
}

/** Rekening: total money, one card per account, moving money between them, and the archive. */
export function RekeningPage() {
  const queryClient = useQueryClient();
  const [formAccount, setFormAccount] = useState<FinanceAccount | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const monthKey = getTodayInputValue().slice(0, 7);
  const listParams = useMemo(() => getMonthListParams(monthKey), [monthKey]);

  const accountsQuery = useQuery({
    queryKey: queryKeys.accountsWithArchived,
    queryFn: getAccountsWithArchived,
    staleTime: 60_000
  });
  // Both only feed the "Bulan ini" line; the month list is shared with Beranda's cache.
  const monthQuery = useQuery({
    queryKey: queryKeys.transactions.list(listParams),
    queryFn: () => fetchWholeMonth(listParams),
    staleTime: 60_000,
    refetchOnWindowFocus: false
  });
  const transfersQuery = useQuery({
    queryKey: queryKeys.accountTransfers,
    queryFn: getAccountTransfers,
    staleTime: 60_000
  });

  const allAccounts = accountsQuery.data ?? [];
  const active = allAccounts.filter((account) => !account.isArchived);
  const archived = allAccounts.filter((account) => account.isArchived);
  const total = active.reduce((sum, account) => sum + accountBalance(account), 0);
  const changes = useMemo(
    () =>
      monthChangeByAccount({
        transactions: monthQuery.data?.items ?? [],
        transfers: transfersQuery.data ?? [],
        monthKey
      }),
    [monthQuery.data, transfersQuery.data, monthKey]
  );

  const restoreMutation = useMutation({
    mutationFn: (account: FinanceAccount) => restoreAccount(account.id),
    onSuccess: (_saved, account) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
      showSnack({ title: `${account.name} aktif lagi`, mood: "happy" });
    },
    onError: (caughtError) =>
      showSnack({
        title: "Belum bisa diaktifkan",
        detail: caughtError instanceof ApiClientError ? caughtError.message : "Coba lagi sebentar lagi.",
        mood: "worried"
      })
  });

  function openForm(account: FinanceAccount | null) {
    setFormAccount(account);
    setFormOpen(true);
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-xl pb-4">
        <SubPageHeader addLabel="Tambah rekening" onAdd={() => openForm(null)} title="Rekening" />

        {accountsQuery.isPending ? <RekeningSkeleton /> : null}

        {accountsQuery.isError ? (
          <StickerCard className="mt-4 flex items-center gap-3 p-4">
            <SakuMascot mood="worried" size={56} />
            <div className="min-w-0 flex-1">
              <p className="font-black">Rekening belum termuat</p>
              <p className="text-sm font-bold text-saku-muted">Periksa koneksi, lalu coba lagi.</p>
            </div>
            <StickerButton onClick={() => void accountsQuery.refetch()} size="md" variant="plain">
              Coba lagi
            </StickerButton>
          </StickerCard>
        ) : null}

        {accountsQuery.data ? (
          <>
            <div className="saku-line relative mt-4 rounded-saku-hero bg-saku-accent px-4 py-3.5 text-white shadow-saku">
              <SakuSparkle className="absolute top-3.5 right-[110px] text-white" size={12} />
              <SakuMascot animated className="absolute right-2.5 bottom-1.5" size={70} />
              <p className="text-xs font-extrabold text-white/90">Total saldo semua rekening</p>
              <p className="mt-0.5 pr-[76px] font-saku-head text-[34px] leading-10 font-semibold">
                Rp {formatPlainAmount(total)}
              </p>
              <p className="saku-line-thin mt-2 inline-flex -rotate-[1.5deg] items-center rounded-full bg-saku-coin px-2.5 py-0.5 text-xs font-black text-saku-ink">
                {active.length} rekening aktif
              </p>
            </div>

            <ul className="mt-4 flex flex-col gap-3">
              {active.map((account) => {
                const change = describeMonthChange(changes.get(account.id));

                return (
                  <li key={account.id}>
                    <button
                      aria-label={`Ubah ${account.name}`}
                      className="saku-line saku-press flex w-full items-center gap-3 rounded-saku-card bg-saku-paper px-3.5 py-3 text-left shadow-saku focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30"
                      onClick={() => openForm(account)}
                      type="button"
                    >
                      <AccountIcon account={account} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base font-black">{account.name}</span>
                        <span className="block truncate text-xs font-bold text-saku-muted">
                          {ACCOUNT_TYPE_VISUALS[account.type].label}
                          {change ? ` · ${change}` : ""}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "shrink-0 font-saku-head text-[19px] font-semibold",
                          accountBalance(account) < 0 && "text-saku-over-text"
                        )}
                      >
                        {accountBalance(account) < 0 ? "−" : ""}Rp {formatPlainAmount(Math.abs(accountBalance(account)))}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {active.length >= 2 ? (
              <StickerButton className="mt-4 w-full font-saku-head" onClick={() => setTransferOpen(true)} variant="coin">
                <Repeat aria-hidden="true" className="size-[18px]" strokeWidth={2.6} />
                Pindah uang antar-rekening
              </StickerButton>
            ) : (
              <p className="mt-4 px-1 text-center text-sm font-bold text-saku-muted">
                Tambah satu rekening lagi untuk bisa pindah uang, misalnya top up e-wallet.
              </p>
            )}

            {archived.length > 0 ? (
              <section className="mt-6">
                <button
                  aria-expanded={archiveOpen}
                  className="flex min-h-11 items-center gap-2 rounded-full px-1 text-[13px] font-black text-saku-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30"
                  onClick={() => setArchiveOpen((current) => !current)}
                  type="button"
                >
                  <Archive aria-hidden="true" className="size-4" strokeWidth={2.4} />
                  Diarsipkan ({archived.length})
                  <ChevronDown
                    aria-hidden="true"
                    className={cn("size-3.5 transition-transform", archiveOpen && "rotate-180")}
                    strokeWidth={2.6}
                  />
                </button>
                <p className="px-1 text-xs font-bold text-saku-muted">
                  Rekening yang diarsipkan tetap menyimpan riwayatnya.
                </p>

                {archiveOpen ? (
                  <StickerCard className="mt-3 overflow-hidden">
                    <ul>
                      {archived.map((account, index) => (
                        <li
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5",
                            index < archived.length - 1 && "saku-dash-bottom"
                          )}
                          key={account.id}
                        >
                          <AccountIcon account={account} size={38} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[15px] font-black">{account.name}</span>
                            <span className="block text-xs font-bold text-saku-muted">
                              Saldo terakhir Rp {formatPlainAmount(accountBalance(account))}
                            </span>
                          </span>
                          <StickerButton
                            disabled={restoreMutation.isPending}
                            onClick={() => restoreMutation.mutate(account)}
                            size="md"
                            variant="plain"
                          >
                            Aktifkan
                          </StickerButton>
                        </li>
                      ))}
                    </ul>
                  </StickerCard>
                ) : null}
              </section>
            ) : null}
          </>
        ) : null}
      </div>

      <FloatingSnackHost />

      <AccountFormSheet
        account={formAccount}
        canArchive={active.length > 1}
        onClose={() => setFormOpen(false)}
        open={formOpen}
      />
      <TransferSheet accounts={active} onClose={() => setTransferOpen(false)} open={transferOpen} />
    </AppShell>
  );
}
