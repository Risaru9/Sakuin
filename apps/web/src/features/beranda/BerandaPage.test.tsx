import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { dismissSnack } from "../../components/saku";
import { ToastProvider } from "../../components/toast/ToastProvider";
import { getSummary } from "../summary/summary.service";
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  getTransactions,
  updateTransaction
} from "../transactions/transaction.service";
import type { Transaction } from "../transactions/transaction.types";
import { BerandaPage } from "./BerandaPage";

vi.mock("../auth/auth-context", () => ({
  useAuth: () => ({ user: { id: "user-1", name: "Nadia Putri", email: "nadia@sakuin.test" } })
}));

vi.mock("../categories/category.service", () => ({
  getCategories: vi.fn(() =>
    Promise.resolve(
      [
        ["cat-salary", "Gaji", "INCOME", "wallet"],
        ["cat-food", "Makanan", "EXPENSE", "utensils"],
        ["cat-transport", "Transportasi", "EXPENSE", "car"],
        ["cat-other", "Pengeluaran Lainnya", "EXPENSE", "minus-circle"]
      ].map(([id, name, type, icon]) => ({ id, name, type, icon, color: null, isDefault: true, limit: null }))
    )
  ),
  createCategory: vi.fn()
}));

vi.mock("../summary/summary.service", () => ({
  getSummary: vi.fn()
}));

vi.mock("../transactions/transaction.service", () => ({
  getTransaction: vi.fn(),
  getTransactions: vi.fn(),
  createTransaction: vi.fn(),
  createTransactionsBulk: vi.fn(),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn()
}));

vi.mock("../reminders/daily-review-completion", () => ({
  markTodayReviewed: vi.fn()
}));

const TODAY = new Date(2026, 8, 16, 10, 0);

function localIso(month: number, day: number) {
  return new Date(2026, month - 1, day).toISOString();
}

function tx(id: string, note: string, amount: number, date: string, overrides: Partial<Transaction> = {}): Transaction {
  return {
    id,
    type: "EXPENSE",
    amount: amount.toFixed(2),
    note,
    date,
    categoryId: "cat-food",
    category: { id: "cat-food", name: "Makanan", type: "EXPENSE", icon: "utensils", color: null },
    createdAt: date,
    updatedAt: date,
    ...overrides
  };
}

let serverTransactions: Transaction[] = [];

function summaryWith(transactionCount: number) {
  return {
    totalIncome: "0.00",
    totalExpense: "0.00",
    balance: "0.00",
    incomeThisMonth: "0.00",
    expenseThisMonth: "0.00",
    balanceThisMonth: "0.00",
    recentTransactions: [],
    transactionCount,
    availablePeriods: { years: [2026] },
    safeToSpend: { status: "SAFE", suggestedDailyLimit: 82_000 },
    monthlyTrend: [
      { month: "2026-08", income: "0.00", expense: "410000.00", balance: "0.00" },
      { month: "2026-09", income: "100000.00", expense: "48000.00", balance: "0.00" }
    ],
    habit: null
  } as never;
}

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="location">{`${location.pathname}${location.search}`}</p>;
}

function renderBeranda(path = "/dashboard") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });

  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route element={<BerandaPage />} path="/dashboard" />
            <Route element={<LocationProbe />} path="/cari" />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );

  return { user: userEvent.setup() };
}

function rowButton(name: RegExp) {
  return screen.findByRole("button", { name });
}

describe("BerandaPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(TODAY);
    localStorage.clear();
    serverTransactions = [
      tx("tx-coffee", "Kopi susu", 18000, localIso(9, 16)),
      tx("tx-fuel", "Bensin", 30000, localIso(9, 16), {
        categoryId: "cat-transport",
        category: { id: "cat-transport", name: "Transportasi", type: "EXPENSE", icon: "car", color: null }
      }),
      tx("tx-gift", "Dikasih kakak", 100000, localIso(9, 15), {
        type: "INCOME",
        categoryId: "cat-salary",
        category: { id: "cat-salary", name: "Gaji", type: "INCOME", icon: "wallet", color: null }
      }),
      tx("tx-august", "Sepatu", 410000, localIso(8, 20))
    ];

    vi.mocked(getTransactions).mockImplementation(async (params = {}) => {
      const items = serverTransactions.filter(
        (item) =>
          (!params.startDate || item.date >= params.startDate) &&
          (!params.endDate || item.date <= params.endDate)
      );
      return { items, pagination: { page: 1, limit: 100, total: items.length, totalPages: 1 } };
    });
    vi.mocked(getSummary).mockResolvedValue(summaryWith(serverTransactions.length));
  });

  afterEach(() => {
    act(() => dismissSnack());
    vi.useRealTimers();
  });

  it("opens the widget edit link for an entry in the month", async () => {
    renderBeranda("/dashboard?ubah=tx-coffee");
    const sheet = await screen.findByRole("dialog", { name: "Ubah catatan" });
    expect(within(sheet).getByLabelText("Nominal")).toHaveValue("18.000");
    expect(getTransaction).not.toHaveBeenCalled();
  });

  it("fetches an edit entry outside the loaded month", async () => {
    vi.mocked(getTransaction).mockResolvedValue(serverTransactions[3]);
    renderBeranda("/dashboard?ubah=tx-august");
    const sheet = await screen.findByRole("dialog", { name: "Ubah catatan" });
    expect(within(sheet).getByLabelText("Nominal")).toHaveValue("410.000");
    expect(getTransaction).toHaveBeenCalledWith("tx-august");
  });

  it("shows the month's totals and entries grouped by day", async () => {
    renderBeranda();

    expect(await rowButton(/^Kopi susu, Makanan, −18\.000/)).toBeInTheDocument();
    const monthButton = screen.getByRole("button", { name: /bulan september 2026/i });
    const header = monthButton.closest("header") as HTMLElement;
    expect(within(header).getByText("Keluar").nextElementSibling).toHaveTextContent("48.000");
    expect(within(header).getByText("Masuk").nextElementSibling).toHaveTextContent("100.000");
    expect(within(header).getByText("Sisa").nextElementSibling).toHaveTextContent("52.000");
    expect(await within(header).findByText("Masih aman · ±82 rb/hari")).toBeInTheDocument();

    const today = screen.getByRole("region", { name: "Hari ini" });
    expect(within(today).getByText("Keluar 48.000")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Kemarin" })).toHaveTextContent("Masuk 100.000");
    expect(screen.queryByText("Sepatu")).not.toBeInTheDocument();
  });

  it("edits an entry from its row", async () => {
    vi.mocked(updateTransaction).mockImplementation(async (id, input) => ({
      ...serverTransactions.find((item) => item.id === id)!,
      amount: Number(input.amount).toFixed(2)
    }));
    const { user } = renderBeranda();

    await user.click(await rowButton(/^Kopi susu, Makanan/));
    const sheet = await screen.findByRole("dialog", { name: "Ubah catatan" });
    expect(within(sheet).getByRole("button", { name: "Simpan perubahan" })).toBeDisabled();

    const amount = within(sheet).getByLabelText("Nominal");
    expect(amount).toHaveValue("18.000");
    await user.clear(amount);
    await user.type(amount, "20000");
    await user.click(within(sheet).getByRole("button", { name: "Simpan perubahan" }));

    expect(screen.queryByRole("dialog", { name: "Ubah catatan" })).not.toBeInTheDocument();
    await waitFor(() =>
      expect(updateTransaction).toHaveBeenCalledWith("tx-coffee", {
        type: "EXPENSE",
        amount: "20000",
        categoryId: "cat-food",
        note: "Kopi susu"
      })
    );
    expect(await rowButton(/^Kopi susu, Makanan, −20\.000/)).toBeInTheDocument();
    expect(await screen.findByText("Perubahan tersimpan")).toBeInTheDocument();
    expect(screen.getByText("Diubah")).toBeInTheDocument();
  });

  it("moves an entry to another category and day", async () => {
    vi.mocked(updateTransaction).mockImplementation(async (id) => serverTransactions.find((item) => item.id === id)!);
    const { user } = renderBeranda();

    await user.click(await rowButton(/^Kopi susu, Makanan/));
    const sheet = await screen.findByRole("dialog", { name: "Ubah catatan" });
    await user.click(within(sheet).getByRole("button", { name: "Kategori: Makanan" }));
    await user.click(within(sheet).getByRole("button", { name: "Transportasi" }));
    expect(within(sheet).getByRole("button", { name: "Kategori: Transportasi" })).toBeInTheDocument();
    await user.click(within(sheet).getByRole("button", { name: "Tanggal: Hari ini, 16 Sep" }));
    await user.click(within(sheet).getByRole("button", { name: "Kemarin" }));
    expect(within(sheet).getByRole("button", { name: "Tanggal: Kemarin, 15 Sep" })).toBeInTheDocument();
    await user.click(within(sheet).getByRole("button", { name: "Simpan perubahan" }));

    await waitFor(() =>
      expect(updateTransaction).toHaveBeenCalledWith(
        "tx-coffee",
        expect.objectContaining({ categoryId: "cat-transport", date: localIso(9, 15) })
      )
    );
  });

  it("deletes without asking and brings the entry back with Batalkan", async () => {
    vi.mocked(deleteTransaction).mockResolvedValue({} as never);
    vi.mocked(createTransaction).mockImplementation(async (input) =>
      tx("tx-coffee-again", input.note ?? "", Number(input.amount), input.date)
    );
    const { user } = renderBeranda();

    await user.click(await rowButton(/^Kopi susu, Makanan/));
    const sheet = await screen.findByRole("dialog", { name: "Ubah catatan" });
    await user.click(within(sheet).getByRole("button", { name: "Hapus" }));

    await waitFor(() => expect(deleteTransaction).toHaveBeenCalledWith("tx-coffee"));
    expect(screen.queryByRole("button", { name: /^Kopi susu, Makanan/ })).not.toBeInTheDocument();
    expect(await screen.findByText("Kopi susu dihapus")).toBeInTheDocument();
    expect(screen.getByText("Makanan · −18.000")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Batalkan" }));

    await waitFor(() =>
      expect(createTransaction).toHaveBeenCalledWith({
        type: "EXPENSE",
        amount: "18000",
        categoryId: "cat-food",
        date: localIso(9, 16),
        note: "Kopi susu"
      })
    );
    expect(await rowButton(/^Kopi susu, Makanan/)).toBeInTheDocument();
  });

  it("restores the row when deleting fails", async () => {
    vi.mocked(deleteTransaction).mockRejectedValue(new Error("Server sibuk"));
    const { user } = renderBeranda();

    await user.click(await rowButton(/^Kopi susu, Makanan/));
    await user.click(within(await screen.findByRole("dialog", { name: "Ubah catatan" })).getByRole("button", { name: "Hapus" }));

    expect(await screen.findByText("Catatan belum terhapus")).toBeInTheDocument();
    expect(await rowButton(/^Kopi susu, Makanan/)).toBeInTheDocument();
    expect(screen.queryByText("Kopi susu dihapus")).not.toBeInTheDocument();
  });

  it("opens another month from the month sheet", async () => {
    const { user } = renderBeranda();

    await user.click(await screen.findByRole("button", { name: /bulan september 2026/i }));
    const sheet = await screen.findByRole("dialog", { name: "Pilih bulan" });
    expect(within(sheet).getByRole("button", { name: "Oktober 2026, belum tiba" })).toBeDisabled();
    expect(within(sheet).getByRole("button", { name: "Agustus 2026" })).toHaveTextContent("−410 rb");

    await user.click(within(sheet).getByRole("button", { name: "Agustus 2026" }));

    expect(await rowButton(/^Sepatu, Makanan/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /bulan agustus 2026/i })).toBeInTheDocument();
    expect(screen.queryByText("Masih aman · ±82 rb/hari")).not.toBeInTheDocument();
  });

  it("welcomes a first-time user and fills the composer from an example", async () => {
    serverTransactions = [];
    vi.mocked(getSummary).mockResolvedValue(summaryWith(0));
    const { user } = renderBeranda();

    expect(
      await screen.findByRole("heading", { name: "Halo, Nadia! Catatan pertamamu tinggal satu ketikan." })
    ).toBeInTheDocument();
    expect(screen.getByText("Belum ada catatan")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "kopi 18rb" }));

    const input = screen.getByLabelText(/catat transaksi, misalnya/i);
    expect(input).toHaveValue("kopi 18rb");
    expect(input).toHaveFocus();
  });

  it("offers a retry when the list cannot load", async () => {
    vi.mocked(getTransactions).mockRejectedValueOnce(new Error("offline"));
    const { user } = renderBeranda();

    expect(await screen.findByRole("heading", { name: "Waduh, catatan gagal dimuat" })).toBeInTheDocument();
    const header = screen.getByRole("button", { name: /bulan september 2026/i }).closest("header") as HTMLElement;
    expect(within(header).getByText("Keluar").nextElementSibling).toHaveTextContent("–");
    await user.click(screen.getByRole("button", { name: "Coba lagi" }));

    expect(await rowButton(/^Kopi susu, Makanan/)).toBeInTheDocument();
  });

  it("focuses the composer when opened from the Android widget", async () => {
    renderBeranda("/dashboard?widgetAction=quick");

    await waitFor(() => expect(screen.getByLabelText(/catat transaksi, misalnya/i)).toHaveFocus());
  });

  it("opens search for the month on screen", async () => {
    const { user } = renderBeranda("/dashboard?bulan=2026-08");

    await user.click(await screen.findByRole("button", { name: "Cari catatan" }));

    expect(screen.getByTestId("location")).toHaveTextContent("/cari?bulan=2026-08");
  });
});
