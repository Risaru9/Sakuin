import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { AsistenPage } from "./AsistenPage";
import { createTransaction } from "../../transactions/transaction.service";
import { getAiChatHistory } from "../ai.service";

// Mock Auth Context
vi.mock("../../auth/auth-context", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      name: "Sakuin User",
      email: "user@sakuin.test",
      safeBalanceLimit: "50000.00"
    }
  })
}));

// Mock API services
vi.mock("../ai.service", () => ({
  sendAiChatMessage: vi.fn(),
  getAiChatHistory: vi.fn(),
  clearAiChatHistory: vi.fn()
}));

vi.mock("../../profile/profile.service", () => ({
  getUserProfile: vi.fn(() =>
    Promise.resolve({ name: "Sakuin User", email: "user@sakuin.test" })
  )
}));

vi.mock("../../categories/category.service", () => ({
  getCategories: vi.fn(() =>
    Promise.resolve([
      {
        id: "cat-food",
        name: "Makanan",
        type: "EXPENSE",
        icon: "utensils",
        color: "#FF0000",
        isDefault: true,
        limit: null
      },
      {
        id: "cat-transport",
        name: "Bensin",
        type: "EXPENSE",
        icon: "car",
        color: "#0000FF",
        isDefault: true,
        limit: null
      }
    ])
  )
}));

vi.mock("../../transactions/transaction.service", () => ({
  createTransaction: vi.fn()
}));

describe("AsistenPage - Flow Simpan Draft", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false
        }
      }
    });
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AsistenPage />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it("menampilkan riwayat chat dan draft transaksi tunggal", async () => {
    vi.mocked(getAiChatHistory).mockResolvedValue([
      {
        id: "welcome-message",
        role: "assistant",
        content: "Halo! Saya Asisten Sakuin.",
        createdAt: "2026-06-01T00:00:00.000Z"
      },
      {
        id: "msg-draft-1",
        role: "assistant",
        content: "Ini draft transaksinya.",
        transactionDrafts: [
          {
            type: "EXPENSE",
            amount: "15000",
            categoryId: "cat-food",
            categoryName: "Makanan",
            note: "makan geprek",
            date: "2026-06-01",
            confidence: "high",
            missingFields: [],
            warnings: []
          }
        ],
        createdAt: "2026-06-01T00:00:01.000Z"
      }
    ]);

    renderComponent();

    // Pastikan chat welcome dan draft muncul
    await waitFor(() => {
      expect(screen.getByText("Ini draft transaksinya.")).toBeInTheDocument();
    });

    expect(screen.getByText("Makanan")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Simpan Draft/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Batalkan Draft/i })).toBeInTheDocument();
  });

  it("berhasil menyimpan draft transaksi tunggal ketika tombol diklik", async () => {
    vi.mocked(getAiChatHistory).mockResolvedValue([
      {
        id: "msg-draft-1",
        role: "assistant",
        content: "Draft sudah siap.",
        transactionDrafts: [
          {
            type: "EXPENSE",
            amount: "15000",
            categoryId: "cat-food",
            categoryName: "Makanan",
            note: "makan geprek",
            date: "2026-06-01",
            confidence: "high",
            missingFields: [],
            warnings: []
          }
        ],
        createdAt: "2026-06-01T00:00:01.000Z"
      }
    ]);

    vi.mocked(createTransaction).mockResolvedValueOnce({ id: "tx-123" } as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Simpan Draft/i })).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Simpan Draft/i }));

    // Verifikasi pemanggilan api save
    expect(createTransaction).toHaveBeenCalledWith({
      type: "EXPENSE",
      amount: "15000",
      categoryId: "cat-food",
      note: "makan geprek",
      date: "2026-06-01"
    });

    // Cek bahwa tombol terupdate menjadi sudah disimpan
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Sudah disimpan/i })).toBeInTheDocument();
    });
  });

  it("berhasil membatalkan draft transaksi tunggal ketika tombol batalkan diklik", async () => {
    vi.mocked(getAiChatHistory).mockResolvedValue([
      {
        id: "msg-draft-1",
        role: "assistant",
        content: "Draft sudah siap.",
        transactionDrafts: [
          {
            type: "EXPENSE",
            amount: "15000",
            categoryId: "cat-food",
            categoryName: "Makanan",
            note: "makan geprek",
            date: "2026-06-01",
            confidence: "high",
            missingFields: [],
            warnings: []
          }
        ],
        createdAt: "2026-06-01T00:00:01.000Z"
      }
    ]);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Batalkan Draft/i })).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Batalkan Draft/i }));

    // Cek bahwa status terupdate menjadi dibatalkan
    await waitFor(() => {
      expect(screen.getAllByText("Dibatalkan").length).toBeGreaterThan(0);
    });
    expect(createTransaction).not.toHaveBeenCalled();
  });

  it("berhasil menyimpan semua draft transaksi sekaligus pada multi draft", async () => {
    vi.mocked(getAiChatHistory).mockResolvedValue([
      {
        id: "msg-multi-draft",
        role: "assistant",
        content: "Saya siapkan beberapa draft.",
        transactionDrafts: [
          {
            type: "EXPENSE",
            amount: "15000",
            categoryId: "cat-food",
            categoryName: "Makanan",
            note: "geprek",
            date: "2026-06-01",
            confidence: "high",
            missingFields: [],
            warnings: []
          },
          {
            type: "EXPENSE",
            amount: "30000",
            categoryId: "cat-transport",
            categoryName: "Bensin",
            note: "bensin",
            date: "2026-06-01",
            confidence: "high",
            missingFields: [],
            warnings: []
          }
        ],
        createdAt: "2026-06-01T00:00:01.000Z"
      }
    ]);

    vi.mocked(createTransaction)
      .mockResolvedValueOnce({ id: "tx-1" } as any)
      .mockResolvedValueOnce({ id: "tx-2" } as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Simpan Semua Draft/i })).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Simpan Semua Draft/i }));

    expect(createTransaction).toHaveBeenCalledTimes(2);
    expect(createTransaction).toHaveBeenNthCalledWith(1, {
      type: "EXPENSE",
      amount: "15000",
      categoryId: "cat-food",
      note: "geprek",
      date: "2026-06-01"
    });
    expect(createTransaction).toHaveBeenNthCalledWith(2, {
      type: "EXPENSE",
      amount: "30000",
      categoryId: "cat-transport",
      note: "bensin",
      date: "2026-06-01"
    });

    await waitFor(() => {
      expect(screen.getByText("2 draft transaksi berhasil disimpan sekaligus. Data dashboard dan transaksi akan ikut diperbarui.")).toBeInTheDocument();
    });
  });
});
