import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "../../components/toast/ToastProvider";
import { createTransactionsBulk, deleteTransaction } from "../transactions/transaction.service";
import { getTodayInputValue, toIsoDate } from "../transactions/transaction-date";
import { QuickComposer } from "./QuickComposer";

vi.mock("../categories/category.service", () => ({
  getCategories: vi.fn(() =>
    Promise.resolve(
      [
        ["cat-salary", "Gaji", "INCOME", "wallet"],
        ["cat-income-other", "Pemasukan Lainnya", "INCOME", "plus-circle"],
        ["cat-food", "Makanan", "EXPENSE", "utensils"],
        ["cat-transport", "Transportasi", "EXPENSE", "car"],
        ["cat-expense-other", "Pengeluaran Lainnya", "EXPENSE", "minus-circle"]
      ].map(([id, name, type, icon]) => ({
        id,
        name,
        type,
        icon,
        color: null,
        isDefault: true,
        limit: null
      }))
    )
  )
}));

vi.mock("../accounts/account.service", () => ({
  getAccounts: vi.fn(() =>
    Promise.resolve([
      { id: "acc-cash", name: "Dompet Utama", type: "CASH", isArchived: false },
      { id: "acc-bca", name: "BCA", type: "BANK", isArchived: false },
      { id: "acc-old", name: "Dompet Lama", type: "CASH", isArchived: true }
    ])
  )
}));

vi.mock("../transactions/transaction.service", () => ({
  createTransactionsBulk: vi.fn(),
  deleteTransaction: vi.fn(() => Promise.resolve({}))
}));

function savedTransaction(overrides: Record<string, unknown> = {}) {
  const now = new Date().toISOString();

  return {
    id: "tx-1",
    type: "EXPENSE",
    amount: "18000",
    categoryId: "cat-food",
    category: { id: "cat-food", name: "Makanan", type: "EXPENSE", icon: "utensils", color: null, isDefault: true },
    date: toIsoDate(getTodayInputValue()),
    note: "kopi susu",
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function renderComposer() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });

  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <QuickComposer />
      </ToastProvider>
    </QueryClientProvider>
  );

  return { user: userEvent.setup() };
}

async function typeEntry(user: ReturnType<typeof userEvent.setup>, text: string) {
  const input = screen.getByLabelText(/catat transaksi, misalnya/i);
  await user.type(input, text);
  // Categories load asynchronously; the guess appears once they are in.
  await screen.findByRole("group", { name: "Tebakan Saku" });

  return input;
}

describe("QuickComposer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("shows the guess while typing and saves on Enter", async () => {
    vi.mocked(createTransactionsBulk).mockResolvedValueOnce([savedTransaction()] as never);
    const { user } = renderComposer();

    const input = await typeEntry(user, "kopi susu 18rb");
    const guess = screen.getByRole("group", { name: "Tebakan Saku" });

    expect(within(guess).getByText("−18.000")).toBeInTheDocument();
    expect(within(guess).getByRole("button", { name: /kategori makanan/i })).toBeInTheDocument();
    expect(within(guess).getByRole("button", { name: /hari ini/i })).toBeInTheDocument();
    expect(within(guess).getByRole("button", { name: /dompet utama/i })).toBeInTheDocument();

    await user.keyboard("{Enter}");

    expect(createTransactionsBulk).toHaveBeenCalledWith({
      transactions: [
        {
          type: "EXPENSE",
          amount: "18000",
          categoryId: "cat-food",
          date: toIsoDate(getTodayInputValue()),
          note: "kopi susu"
        }
      ]
    });
    expect(input).toHaveValue("");
    expect(await screen.findByText("Yay, kopi susu tercatat!")).toBeInTheDocument();
    expect(screen.getByText("Makanan · −18.000")).toBeInTheDocument();
  });

  it("undoes the last entry from the snackbar", async () => {
    vi.mocked(createTransactionsBulk).mockResolvedValueOnce([savedTransaction()] as never);
    const { user } = renderComposer();

    await typeEntry(user, "kopi susu 18rb");
    await user.keyboard("{Enter}");
    await user.click(await screen.findByRole("button", { name: "Batalkan" }));

    await waitFor(() => expect(deleteTransaction).toHaveBeenCalledWith("tx-1"));
    expect(screen.queryByText("Yay, kopi susu tercatat!")).not.toBeInTheDocument();
  });

  it("asks for an amount instead of saving text without one", async () => {
    const { user } = renderComposer();

    await user.type(screen.getByLabelText(/catat transaksi, misalnya/i), "kopi susu");
    // Wait for categories so the hint is about the missing amount, not loading.
    await waitFor(async () => {
      await user.keyboard("{Enter}");
      expect(screen.getByRole("alert")).toHaveTextContent("Tambahkan nominal");
    });
    expect(createTransactionsBulk).not.toHaveBeenCalled();
  });

  it("lets the user change category and account in the detail sheet", async () => {
    vi.mocked(createTransactionsBulk).mockResolvedValueOnce([
      savedTransaction({ categoryId: "cat-transport" })
    ] as never);
    const { user } = renderComposer();

    await typeEntry(user, "kopi susu 18rb");
    await user.click(screen.getByRole("button", { name: /kategori makanan/i }));

    const sheet = await screen.findByRole("dialog", { name: "Detail catatan" });
    expect(within(sheet).queryByRole("button", { name: /dompet lama/i })).not.toBeInTheDocument();

    await user.click(within(sheet).getByRole("button", { name: "Transportasi" }));
    await user.click(within(sheet).getByRole("button", { name: "BCA" }));
    await user.click(within(sheet).getByRole("button", { name: "Simpan · −18.000" }));

    expect(createTransactionsBulk).toHaveBeenCalledWith({
      transactions: [
        expect.objectContaining({ categoryId: "cat-transport", accountId: "acc-bca" })
      ]
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("flips the type and picks a matching category", async () => {
    const { user } = renderComposer();

    await typeEntry(user, "kopi susu 18rb");
    await user.click(screen.getByRole("button", { name: /jenis keluar/i }));

    const guess = screen.getByRole("group", { name: "Tebakan Saku" });
    expect(within(guess).getByText("+18.000")).toBeInTheDocument();
    expect(within(guess).getByRole("button", { name: /kategori pemasukan lainnya/i })).toBeInTheDocument();
  });

  it("gives the text back and shows an error when saving fails", async () => {
    vi.mocked(createTransactionsBulk).mockRejectedValueOnce(new Error("Server sedang sibuk"));
    const { user } = renderComposer();

    const input = await typeEntry(user, "kopi susu 18rb");
    await user.keyboard("{Enter}");

    expect(await screen.findByText("Catatan belum tersimpan")).toBeInTheDocument();
    expect(screen.getByText("Server sedang sibuk")).toBeInTheDocument();
    expect(input).toHaveValue("kopi susu 18rb");
  });
});
