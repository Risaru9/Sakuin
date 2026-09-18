import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { dismissSnack } from "../../components/saku";
import { ToastProvider } from "../../components/toast/ToastProvider";
import { getCategories, setCategoryLimit } from "../categories/category.service";
import type { Category } from "../categories/category.types";
import { getSummary } from "../summary/summary.service";
import { buildCategoryRows, KategoriPage } from "./KategoriPage";

vi.mock("../auth/auth-context", () => ({
  useAuth: () => ({ user: { id: "user-1", name: "Nadia", email: "nadia@sakuin.test" } })
}));

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

function category(id: string, name: string, type: Category["type"], limit: number | null, isDefault = true): Category {
  return { id, name, type, icon: null, color: null, isDefault, limit };
}

const CATEGORIES = [
  category("cat-food", "Makanan", "EXPENSE", 1_200_000),
  category("cat-transport", "Transportasi", "EXPENSE", 400_000),
  category("cat-shop", "Belanja", "EXPENSE", null),
  category("cat-laundry", "Laundry", "EXPENSE", 100_000, false),
  category("cat-other", "Lainnya", "EXPENSE", null),
  category("cat-salary", "Gaji", "INCOME", null)
];

function item(categoryId: string, amount: number) {
  return { categoryId, totalAmount: amount.toFixed(2) };
}

const EXPENSES = [item("cat-food", 980_000), item("cat-transport", 450_000), item("cat-shop", 309_500), item("cat-laundry", 60_000)];

describe("buildCategoryRows", () => {
  it("orders by spending and only gives expense categories a limit bar", () => {
    const rows = buildCategoryRows(CATEGORIES, "EXPENSE", EXPENSES);

    expect(rows.map((row) => [row.category.name, row.status, row.percent])).toEqual([
      ["Makanan", "watch", 82],
      ["Transportasi", "over", 100],
      ["Belanja", null, 0],
      ["Laundry", "ok", 60],
      ["Lainnya", null, 0]
    ]);
    expect(buildCategoryRows(CATEGORIES, "INCOME", [item("cat-salary", 3_000_000)])[0]).toMatchObject({
      spent: 3_000_000,
      limit: null
    });
  });
});

describe("KategoriPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(new Date(2026, 8, 16, 10));
    vi.mocked(getCategories).mockResolvedValue(CATEGORIES);
    vi.mocked(getSummary).mockResolvedValue({
      expenseByCategory: EXPENSES,
      incomeByCategory: [item("cat-salary", 3_000_000)]
    } as never);
  });

  afterEach(() => {
    act(() => dismissSnack());
    vi.useRealTimers();
  });

  it("lists categories with their limits and sets a limit on a category without one", async () => {
    vi.mocked(setCategoryLimit).mockResolvedValue({ ...CATEGORIES[2], limit: 500_000 });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
    });
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter>
            <KategoriPage />
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    );
    const user = userEvent.setup();

    expect(await screen.findByText("Batas bulan September · 3 kategori punya batas")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Pengeluaran (5)" })).toBeChecked();
    expect(screen.getByText("buatanmu")).toBeInTheDocument();
    expect(screen.getByText("lewat")).toBeInTheDocument();
    expect(screen.getByText("hampir")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Belanja: 309\.500, belum ada batas/ }));
    const sheet = screen.getByRole("dialog");
    await user.click(within(sheet).getByRole("button", { name: "500 rb" }));
    await user.click(within(sheet).getByRole("button", { name: "Simpan batas" }));

    await waitFor(() => expect(setCategoryLimit).toHaveBeenCalledWith("cat-shop", 500_000));

    await user.click(screen.getByRole("radio", { name: "Pemasukan (1)" }));
    expect(screen.getByText("Gaji")).toBeInTheDocument();
    expect(screen.queryByText("+ Atur batas")).not.toBeInTheDocument();
  });
});
