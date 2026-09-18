import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { dismissSnack } from "../../components/saku";
import { ToastProvider } from "../../components/toast/ToastProvider";
import { getCategories, setCategoryLimit } from "../categories/category.service";
import { getSummary } from "../summary/summary.service";
import { getTransactions } from "../transactions/transaction.service";
import { LaporanPage } from "./LaporanPage";

vi.mock("../auth/auth-context", () => ({
  useAuth: () => ({ user: { id: "user-1", name: "Nadia", email: "nadia@sakuin.test" } })
}));

const CATEGORIES = [
  ["cat-salary", "Gaji", "INCOME", "wallet", null],
  ["cat-food", "Makanan", "EXPENSE", "utensils", 1_200_000],
  ["cat-bills", "Tagihan", "EXPENSE", "receipt", 800_000],
  ["cat-transport", "Transportasi", "EXPENSE", "car", 400_000],
  ["cat-shop", "Belanja", "EXPENSE", "shopping-bag", null]
] as const;

vi.mock("../categories/category.service", () => ({
  getCategories: vi.fn(),
  createCategory: vi.fn(),
  setCategoryLimit: vi.fn()
}));

vi.mock("../accounts/account.service", () => ({
  getAccounts: vi.fn(() => Promise.resolve([]))
}));

vi.mock("../summary/summary.service", () => ({
  getSummary: vi.fn()
}));

vi.mock("../transactions/transaction.service", () => ({
  getTransactions: vi.fn(),
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn()
}));

function categoryItem(categoryId: string, categoryName: string, amount: number, type: "INCOME" | "EXPENSE" = "EXPENSE") {
  const icon = CATEGORIES.find(([id]) => id === categoryId)?.[3] ?? null;
  return { categoryId, categoryName, categoryIcon: icon, categoryColor: null, type, totalAmount: amount.toFixed(2), transactionCount: 1, limit: null };
}

function summaryFor(month: number) {
  const september = month === 9;

  return {
    totalIncome: september ? "3500000.00" : "3200000.00",
    totalExpense: september ? "2259500.00" : "2567500.00",
    availablePeriods: { years: [2026] },
    monthlyTrend: [
      { month: "2026-08", income: "3200000.00", expense: "2567500.00", balance: "0.00" },
      { month: "2026-09", income: "3500000.00", expense: "2259500.00", balance: "0.00" }
    ],
    expenseByCategory: [
      categoryItem("cat-food", "Makanan", 980_000),
      categoryItem("cat-bills", "Tagihan", 520_000),
      categoryItem("cat-transport", "Transportasi", 450_000),
      categoryItem("cat-shop", "Belanja", 309_500)
    ],
    incomeByCategory: [categoryItem("cat-salary", "Gaji", 3_500_000, "INCOME")]
  } as never;
}

function renderLaporan(path = "/laporan") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });

  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <LaporanPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );

  return userEvent.setup();
}

describe("LaporanPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(new Date(2026, 8, 16, 10));
    vi.mocked(getCategories).mockResolvedValue(
      CATEGORIES.map(([id, name, type, icon, limit]) => ({ id, name, type, icon, color: null, isDefault: true, limit }))
    );
    vi.mocked(getSummary).mockImplementation(async (params = {}) => summaryFor(params.month ?? 9));
    vi.mocked(getTransactions).mockResolvedValue({
      items: [
        {
          id: "tx-salary",
          type: "INCOME",
          amount: "3500000.00",
          note: "Gaji September",
          date: new Date(2026, 8, 1).toISOString(),
          categoryId: "cat-salary",
          category: { id: "cat-salary", name: "Gaji", type: "INCOME", icon: "wallet", color: null },
          account: null,
          createdAt: new Date(2026, 8, 1).toISOString(),
          updatedAt: new Date(2026, 8, 1).toISOString()
        }
      ],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 }
    });
  });

  afterEach(() => {
    act(() => dismissSnack());
    vi.useRealTimers();
  });

  it("shows spending by category, the change from last month and the budgets", async () => {
    renderLaporan();

    expect(await screen.findByText("Rp 2.259.500")).toBeInTheDocument();
    expect(screen.getByText("Sejauh ini 12% lebih hemat dari Agustus")).toBeInTheDocument();
    expect(getSummary).toHaveBeenCalledWith({ month: 9, year: 2026 });

    const breakdown = screen.getByRole("region", { name: "Pengeluaran per kategori" });
    const legend = within(breakdown).getAllByRole("listitem").map((item) => item.textContent);
    expect(legend).toEqual(["Makanan43%980.000", "Tagihan23%520.000", "Transportasi20%450.000", "Belanja14%309.500"]);

    const budgets = screen.getByRole("region", { name: "Anggaran bulan ini" });
    // Limits come with the categories, which may land after the summary.
    const rows = await within(budgets).findAllByRole("button", { name: /ketuk untuk mengubah batas/i });
    expect(rows.map((row) => row.getAttribute("aria-label"))).toEqual([
      "Transportasi: 450.000 dari 400.000. Lewat batas 50.000. Ketuk untuk mengubah batas.",
      "Makanan: 980.000 dari 1.200.000. Hampir batas · sisa 220.000. Ketuk untuk mengubah batas.",
      "Tagihan: 520.000 dari 800.000. Sisa 280.000. Ketuk untuk mengubah batas."
    ]);
  });

  it("switches to income with the income-versus-spending card and the entries", async () => {
    const user = renderLaporan();

    await screen.findByText("Rp 2.259.500");
    await user.click(screen.getByRole("radio", { name: "Pemasukan" }));

    expect(screen.getByText("Rp 3.500.000")).toBeInTheDocument();
    expect(screen.getByText("Sejauh ini 300.000 lebih banyak dari Agustus")).toBeInTheDocument();
    expect(screen.getByText("Sisa 1.240.500")).toBeInTheDocument();
    expect(screen.getByText("Kamu menyisihkan 35% pemasukan bulan ini.")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /^Gaji September, Gaji, \+3\.500\.000/ })).toBeInTheDocument();
  });

  it("sets a limit from Atur and updates the budget list", async () => {
    vi.mocked(setCategoryLimit).mockImplementation(async (id, limit) => ({
      id,
      name: "Belanja",
      type: "EXPENSE",
      icon: "shopping-bag",
      color: null,
      isDefault: true,
      limit
    }));
    const user = renderLaporan();

    await screen.findByText("Rp 2.259.500");
    await user.click(screen.getByRole("button", { name: "Atur" }));
    const chooser = await screen.findByRole("dialog", { name: "Atur anggaran" });
    await user.click(within(chooser).getByRole("button", { name: /Belanja/ }));

    const sheet = await screen.findByRole("dialog", { name: "Belanja" });
    expect(within(sheet).getByText("tanpa batas")).toBeInTheDocument();
    await user.click(within(sheet).getByRole("button", { name: "500 rb" }));
    expect(within(sheet).getByLabelText("Batas per bulan")).toHaveValue("500.000");
    expect(within(sheet).getByText("dari 500.000 (62%)")).toBeInTheDocument();
    await user.click(within(sheet).getByRole("button", { name: "Simpan batas" }));

    await waitFor(() => expect(setCategoryLimit).toHaveBeenCalledWith("cat-shop", 500000));
    expect(await screen.findByText("Batas Belanja disimpan")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^Belanja: 309\.500 dari 500\.000\. Sisa 190\.500/ })
    ).toBeInTheDocument();
  });

  it("removes a limit with Tanpa batas", async () => {
    vi.mocked(setCategoryLimit).mockImplementation(async (id, limit) => ({
      id,
      name: "Tagihan",
      type: "EXPENSE",
      icon: "receipt",
      color: null,
      isDefault: true,
      limit
    }));
    const user = renderLaporan();

    await user.click(await screen.findByRole("button", { name: /^Tagihan: 520\.000/ }));
    const sheet = await screen.findByRole("dialog", { name: "Tagihan" });
    await user.click(within(sheet).getByRole("button", { name: "Tanpa batas" }));
    await user.click(within(sheet).getByRole("button", { name: "Simpan batas" }));

    await waitFor(() => expect(setCategoryLimit).toHaveBeenCalledWith("cat-bills", null));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /^Tagihan: 520\.000/ })).not.toBeInTheDocument()
    );
  });

  it("moves between months and never past the current one", async () => {
    const user = renderLaporan();

    await screen.findByText("Rp 2.259.500");
    expect(screen.getByRole("button", { name: "Bulan berikutnya" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Bulan sebelumnya" }));

    expect(await screen.findByRole("heading", { name: "Agustus 2026" })).toBeInTheDocument();
    await waitFor(() => expect(getSummary).toHaveBeenCalledWith({ month: 8, year: 2026 }));
    expect(await screen.findByRole("region", { name: "Anggaran Agustus" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bulan berikutnya" })).toBeEnabled();
  });

  it("offers a retry when the report cannot load", async () => {
    vi.mocked(getSummary).mockRejectedValueOnce(new Error("offline"));
    const user = renderLaporan();

    expect(await screen.findByRole("heading", { name: "Waduh, laporan gagal dimuat" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Coba lagi" }));

    expect(await screen.findByText("Rp 2.259.500")).toBeInTheDocument();
  });

  it("invites setting a first limit when no category has one", async () => {
    vi.mocked(getCategories).mockResolvedValue(
      CATEGORIES.map(([id, name, type, icon]) => ({ id, name, type, icon, color: null, isDefault: true, limit: null }))
    );
    renderLaporan();

    expect(await screen.findByText("Belum ada batas bulanan.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Atur batas" })).toBeInTheDocument();
  });
});
