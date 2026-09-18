import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { dismissSnack } from "../../components/saku";
import { ToastProvider } from "../../components/toast/ToastProvider";
import {
  archiveAccount,
  createAccountTransfer,
  getAccountsWithArchived,
  getAccountTransfers,
  restoreAccount,
  updateAccount
} from "../accounts/account.service";
import type { FinanceAccount } from "../accounts/account.types";
import { getTransactions } from "../transactions/transaction.service";
import { RekeningPage } from "./RekeningPage";

vi.mock("../auth/auth-context", () => ({
  useAuth: () => ({ user: { id: "user-1", name: "Nadia", email: "nadia@sakuin.test" } })
}));

vi.mock("../accounts/account.service", () => ({
  getAccounts: vi.fn(() => Promise.resolve([])),
  getAccountsWithArchived: vi.fn(),
  getAccountTransfers: vi.fn(),
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
  archiveAccount: vi.fn(),
  restoreAccount: vi.fn(),
  createAccountTransfer: vi.fn()
}));

vi.mock("../transactions/transaction.service", () => ({
  getTransactions: vi.fn()
}));

function account(id: string, name: string, type: FinanceAccount["type"], balance: number, extra: Partial<FinanceAccount> = {}) {
  return {
    id,
    name,
    type,
    icon: null,
    color: null,
    initialBalance: String(balance),
    balance: String(balance),
    transactionCount: 0,
    isArchived: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...extra
  } satisfies FinanceAccount;
}

const ACCOUNTS = [
  account("acc-cash", "Dompet Utama", "CASH", 740_500, { initialBalance: "2000000" }),
  account("acc-bca", "BCA", "BANK", 2_900_000),
  account("acc-gopay", "GoPay", "E_WALLET", 500_000),
  account("acc-jenius", "Jenius", "BANK", 120_000, { isArchived: true })
];

function renderRekening() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });

  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={["/lainnya/rekening"]}>
          <RekeningPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );

  return userEvent.setup();
}

describe("RekeningPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(new Date(2026, 8, 16, 10));
    vi.mocked(getAccountsWithArchived).mockResolvedValue(ACCOUNTS);
    vi.mocked(getAccountTransfers).mockResolvedValue([
      {
        id: "tr-1",
        fromAccount: { id: "acc-bca", name: "BCA", type: "BANK", icon: null, color: null },
        toAccount: { id: "acc-gopay", name: "GoPay", type: "E_WALLET", icon: null, color: null },
        amount: "100000.00",
        note: "Top up GoPay",
        date: new Date(2026, 8, 5, 12).toISOString(),
        createdAt: new Date(2026, 8, 5, 12).toISOString(),
        updatedAt: new Date(2026, 8, 5, 12).toISOString()
      }
    ]);
    vi.mocked(getTransactions).mockResolvedValue({
      items: [
        {
          id: "tx-coffee",
          type: "EXPENSE",
          amount: "18000.00",
          note: "Kopi",
          date: new Date(2026, 8, 15).toISOString(),
          categoryId: "cat-food",
          category: { id: "cat-food", name: "Makanan", type: "EXPENSE", icon: "utensils", color: null },
          account: { id: "acc-cash", name: "Dompet Utama", type: "CASH", icon: null, color: null },
          createdAt: new Date(2026, 8, 15).toISOString(),
          updatedAt: new Date(2026, 8, 15).toISOString()
        }
      ],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 }
    });
  });

  afterEach(() => {
    act(() => dismissSnack());
    vi.useRealTimers();
  });

  it("shows the total of active accounts and each account's movement this month", async () => {
    renderRekening();

    expect(await screen.findByText("Rp 4.140.500")).toBeInTheDocument();
    expect(screen.getByText("3 rekening aktif")).toBeInTheDocument();
    expect(await screen.findByText("Tunai · Bulan ini −18.000")).toBeInTheDocument();
    expect(screen.getByText("Bank · Bulan ini −100.000")).toBeInTheDocument();
    expect(screen.getByText("E-wallet · Bulan ini +100.000")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ubah Jenius" })).not.toBeInTheDocument();
  });

  it("moves money from the fullest account and suggests the note", async () => {
    vi.mocked(createAccountTransfer).mockResolvedValue({} as never);
    const user = renderRekening();

    await user.click(await screen.findByRole("button", { name: "Pindah uang antar-rekening" }));
    const sheet = screen.getByRole("dialog", { name: "Pindah uang" });
    expect(within(sheet).getByRole("button", { name: /Dari: BCA/ })).toBeInTheDocument();
    expect(within(sheet).getByRole("button", { name: /Ke: GoPay/ })).toBeInTheDocument();

    await user.click(within(sheet).getByRole("button", { name: "200 rb" }));
    expect(within(sheet).getByText("→ 2.700.000")).toBeInTheDocument();
    expect(within(sheet).getByRole("textbox", { name: "Catatan pindah uang" })).toHaveValue("Top up GoPay");

    await user.click(within(sheet).getByRole("button", { name: "Pindahkan 200.000" }));

    await waitFor(() =>
      expect(createAccountTransfer).toHaveBeenCalledWith(
        expect.objectContaining({ fromAccountId: "acc-bca", toAccountId: "acc-gopay", amount: "200000", note: "Top up GoPay" })
      )
    );
    expect(await screen.findByText("200.000 dipindah ke GoPay")).toBeInTheDocument();
  });

  it("warns but still allows moving more than the recorded balance", async () => {
    const user = renderRekening();

    await user.click(await screen.findByRole("button", { name: "Pindah uang antar-rekening" }));
    const sheet = screen.getByRole("dialog", { name: "Pindah uang" });
    await user.click(within(sheet).getByRole("button", { name: /Tukar rekening/ }));
    await user.click(within(sheet).getByRole("button", { name: "1 jt" }));

    expect(within(sheet).getByText(/Saldo GoPay di Sakuin tidak cukup/)).toBeInTheDocument();
    expect(within(sheet).getByRole("button", { name: "Tetap pindahkan 1.000.000" })).toBeEnabled();
  });

  it("keeps the opening balance in step when the current balance is corrected", async () => {
    vi.mocked(updateAccount).mockResolvedValue(ACCOUNTS[0]);
    const user = renderRekening();

    await user.click(await screen.findByRole("button", { name: "Ubah Dompet Utama" }));
    const sheet = screen.getByRole("dialog", { name: "Ubah rekening" });
    const balance = within(sheet).getByLabelText("Saldo sekarang");
    expect(balance).toHaveValue("740.500");

    await user.clear(balance);
    await user.type(balance, "800000");
    await user.click(within(sheet).getByRole("button", { name: "Simpan" }));

    // 2.000.000 opening − 1.259.500 moved = 740.500 now; 800.000 now needs 2.059.500 opening.
    await waitFor(() =>
      expect(updateAccount).toHaveBeenCalledWith("acc-cash", expect.objectContaining({ initialBalance: "2059500" }))
    );
  });

  it("archives after a confirmation and restores from the archive", async () => {
    vi.mocked(archiveAccount).mockResolvedValue(ACCOUNTS[2]);
    vi.mocked(restoreAccount).mockResolvedValue(ACCOUNTS[3]);
    const user = renderRekening();

    await user.click(await screen.findByRole("button", { name: "Ubah GoPay" }));
    const sheet = screen.getByRole("dialog", { name: "Ubah rekening" });
    await user.click(within(sheet).getByRole("button", { name: "Arsipkan rekening ini" }));
    await user.click(within(sheet).getByRole("button", { name: "Ya, arsipkan" }));
    await waitFor(() => expect(archiveAccount).toHaveBeenCalledWith("acc-gopay"));

    await user.click(screen.getByRole("button", { name: "Diarsipkan (1)" }));
    await user.click(screen.getByRole("button", { name: "Aktifkan" }));
    await waitFor(() => expect(restoreAccount).toHaveBeenCalledWith("acc-jenius"));
  });
});
