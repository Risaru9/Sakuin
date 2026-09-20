import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { dismissSnack } from "../../components/saku";
import { ToastProvider } from "../../components/toast/ToastProvider";
import { requestComposerFocus } from "../quick-composer/composer-bridge";
import { getSummary } from "../summary/summary.service";
import { getTransactions } from "../transactions/transaction.service";
import type { Transaction } from "../transactions/transaction.types";
import { SearchPage } from "./SearchPage";

vi.mock("../auth/auth-context", () => ({
  useAuth: () => ({ user: { id: "user-1", name: "Nadia", email: "nadia@sakuin.test" } })
}));

vi.mock("../categories/category.service", () => ({
  getCategories: vi.fn(() =>
    Promise.resolve(
      [
        ["cat-salary", "Gaji", "INCOME", "wallet"],
        ["cat-food", "Makanan", "EXPENSE", "utensils"],
        ["cat-transport", "Transportasi", "EXPENSE", "car"]
      ].map(([id, name, type, icon]) => ({ id, name, type, icon, color: null, isDefault: true, limit: null }))
    )
  ),
  createCategory: vi.fn()
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

vi.mock("../quick-composer/composer-bridge", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../quick-composer/composer-bridge")>();
  return { ...actual, requestComposerFocus: vi.fn(actual.requestComposerFocus) };
});

function localIso(month: number, day: number) {
  return new Date(2026, month - 1, day).toISOString();
}

function tx(id: string, note: string, amount: number, day: number, overrides: Partial<Transaction> = {}): Transaction {
  const date = localIso(9, day);

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

const TRANSACTIONS = [
  tx("tx-1", "Kopi susu", 18000, 16),
  tx("tx-2", "Bensin", 30000, 16, {
    categoryId: "cat-transport",
    category: { id: "cat-transport", name: "Transportasi", type: "EXPENSE", icon: "car", color: null }
  }),
  tx("tx-3", "Kopi dari teman", 50000, 12, {
    type: "INCOME",
    categoryId: "cat-salary",
    category: { id: "cat-salary", name: "Gaji", type: "INCOME", icon: "wallet", color: null }
  })
];

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="location">{`${location.pathname}${location.search}`}</p>;
}

function renderSearch(path = "/cari") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route element={<SearchPage />} path="/cari" />
            <Route element={<LocationProbe />} path="/dashboard" />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );

  return userEvent.setup();
}

describe("SearchPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(new Date(2026, 8, 16, 10));
    vi.mocked(getTransactions).mockResolvedValue({
      items: TRANSACTIONS,
      pagination: { page: 1, limit: 100, total: TRANSACTIONS.length, totalPages: 1 }
    });
    vi.mocked(getSummary).mockResolvedValue({
      availablePeriods: { years: [2026] },
      monthlyTrend: []
    } as never);
  });

  afterEach(() => {
    act(() => dismissSnack());
    vi.useRealTimers();
  });

  it("filters while typing and marks the matching words", async () => {
    const user = renderSearch();

    expect(await screen.findByText("3 transaksi · keluar 48.000 · masuk 50.000")).toBeInTheDocument();

    await user.type(screen.getByRole("searchbox", { name: "Cari catatan atau kategori" }), "kopi");

    expect(screen.getByText("2 transaksi · keluar 18.000 · masuk 50.000")).toBeInTheDocument();
    const marks = document.querySelectorAll("mark");
    expect([...marks].map((mark) => mark.textContent)).toEqual(["Kopi", "Kopi"]);

    await user.click(screen.getByRole("button", { name: "Masuk" }));
    expect(screen.getByText("1 transaksi · masuk 50.000")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Kopi dari teman, Gaji/ })).toBeInTheDocument();
  });

  it("narrows the list to one category", async () => {
    const user = renderSearch();

    await screen.findByText(/3 transaksi/);
    await user.click(screen.getByRole("button", { name: "Kategori" }));
    const sheet = await screen.findByRole("dialog", { name: "Saring kategori" });
    await user.click(within(sheet).getByRole("button", { name: "Transportasi" }));

    expect(screen.getByText("1 transaksi · keluar 30.000")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Transportasi" })).toHaveAttribute("aria-pressed", "true");
  });

  it("offers to record a word that has no entries yet", async () => {
    const user = renderSearch("/cari?bulan=2026-08");

    await user.type(await screen.findByRole("searchbox"), "martabak");

    expect(await screen.findByText("Belum ada catatan “martabak”")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Catat “martabak”" }));

    expect(requestComposerFocus).toHaveBeenCalledWith({ text: "martabak " });
    expect(screen.getByTestId("location")).toHaveTextContent("/dashboard?bulan=2026-08");
  });

  it("goes back to Beranda for the current month", async () => {
    const user = renderSearch("/cari?bulan=2026-09");

    await user.click(await screen.findByRole("button", { name: "Kembali ke catatan" }));

    expect(screen.getByTestId("location")).toHaveTextContent(/^\/dashboard$/);
  });
});
