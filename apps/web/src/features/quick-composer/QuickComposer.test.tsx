import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { dismissSnack } from "../../components/saku";
import { ToastProvider } from "../../components/toast/ToastProvider";
import { createCategory } from "../categories/category.service";
import { markTodayReviewed } from "../reminders/daily-review-completion";
import { createTransactionsBulk, deleteTransaction } from "../transactions/transaction.service";
import { getTodayInputValue, toIsoDate } from "../transactions/transaction-date";
import { requestComposerFocus } from "./composer-bridge";
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
  ),
  createCategory: vi.fn()
}));

vi.mock("../reminders/daily-review-completion", () => ({
  markTodayReviewed: vi.fn()
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
        <MemoryRouter>
          <QuickComposer />
        </MemoryRouter>
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

  afterEach(() => {
    dismissSnack();
  });

  it("opens Tanya Saku from Saku's face", () => {
    renderComposer();

    expect(screen.getByRole("link", { name: "Tanya Saku" })).toHaveAttribute("href", "/asisten");
  });

  it("shows the guess while typing and saves on Enter", async () => {
    vi.mocked(createTransactionsBulk).mockResolvedValueOnce([savedTransaction()] as never);
    const { user } = renderComposer();

    const input = await typeEntry(user, "kopi susu 18rb");
    const guess = screen.getByRole("group", { name: "Tebakan Saku" });

    expect(within(guess).getByText("−18.000")).toBeInTheDocument();
    expect(within(guess).getByRole("button", { name: /kategori makanan/i })).toBeInTheDocument();
    expect(within(guess).getByRole("button", { name: /hari ini/i })).toBeInTheDocument();
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
    // Recording counts as today's review, so reminders stop for the day.
    expect(markTodayReviewed).toHaveBeenCalledTimes(1);
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

  it("lets the user change category in the detail sheet", async () => {
    vi.mocked(createTransactionsBulk).mockResolvedValueOnce([
      savedTransaction({ categoryId: "cat-transport" })
    ] as never);
    const { user } = renderComposer();

    await typeEntry(user, "kopi susu 18rb");
    await user.click(screen.getByRole("button", { name: /kategori makanan/i }));

    const sheet = await screen.findByRole("dialog", { name: "Detail catatan" });
    expect(within(sheet).queryByRole("button", { name: /dompet lama/i })).not.toBeInTheDocument();

    await user.click(within(sheet).getByRole("button", { name: "Transportasi" }));
    await user.click(within(sheet).getByRole("button", { name: "Simpan · −18.000" }));

    expect(createTransactionsBulk).toHaveBeenCalledWith({
      transactions: [
        expect.objectContaining({ categoryId: "cat-transport" })
      ]
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("creates a category from the detail sheet and selects it", async () => {
    vi.mocked(createCategory).mockResolvedValueOnce({
      id: "cat-laundry",
      name: "Laundry",
      type: "EXPENSE",
      icon: "shirt",
      color: null,
      isDefault: false,
      limit: 100000
    });
    const { user } = renderComposer();

    await typeEntry(user, "cuci baju 25rb");
    await user.click(screen.getByRole("button", { name: /^kategori /i }));
    const sheet = await screen.findByRole("dialog", { name: "Detail catatan" });
    await user.click(within(sheet).getByRole("button", { name: "Tambah" }));

    const newCategory = await screen.findByRole("dialog", { name: "Kategori baru" });
    await user.type(within(newCategory).getByLabelText("Nama"), "Laundry");
    await user.click(within(newCategory).getByRole("radio", { name: "Ikon shirt" }));
    await user.type(within(newCategory).getByLabelText(/batas per bulan/i), "100000");
    expect(within(newCategory).getByLabelText(/batas per bulan/i)).toHaveValue("100.000");
    await user.click(within(newCategory).getByRole("button", { name: "Tambah kategori" }));

    expect(createCategory).toHaveBeenCalledWith({
      name: "Laundry",
      type: "EXPENSE",
      icon: "shirt",
      limit: 100000
    });
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Kategori baru" })).not.toBeInTheDocument()
    );
    expect(within(sheet).getByRole("button", { name: "Laundry" })).toHaveAttribute("aria-pressed", "true");
  });

  it("fills and focuses the field when another screen asks for it", async () => {
    renderComposer();

    act(() => requestComposerFocus({ text: "bensin 30rb" }));

    const input = screen.getByLabelText(/catat transaksi, misalnya/i);
    expect(input).toHaveValue("bensin 30rb");
    expect(input).toHaveFocus();
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
    vi.mocked(createTransactionsBulk).mockReset().mockRejectedValueOnce(new Error("Server sedang sibuk"));
    const { user } = renderComposer();

    const input = await typeEntry(user, "kopi susu 18rb");
    await user.keyboard("{Enter}");

    expect(await screen.findByText("Catatan belum tersimpan")).toBeInTheDocument();
    expect(screen.getByText("Server sedang sibuk")).toBeInTheDocument();
    expect(input).toHaveValue("kopi susu 18rb");
  });
});
