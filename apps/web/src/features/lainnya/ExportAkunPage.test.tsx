import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { dismissSnack } from "../../components/saku";
import { ToastProvider } from "../../components/toast/ToastProvider";
import { requestPasswordReset } from "../auth/auth.service";
import { getCategories } from "../categories/category.service";
import { getExportRange } from "../export/export-data";
import { downloadTransactionsExport } from "../export/export.service";
import { getUserProfile, updateUserProfile } from "../profile/profile.service";
import { getTransactions } from "../transactions/transaction.service";
import { AkunPage } from "./AkunPage";
import { ExportPage } from "./ExportPage";

const updateAuthUser = vi.fn();

vi.mock("../auth/auth-context", () => ({
  useAuth: () => ({
    user: { id: "user-1", name: "Nadia", email: "nadia@sakuin.test", safeBalanceLimit: "0" },
    updateAuthUser
  })
}));

vi.mock("../auth/auth.service", () => ({ requestPasswordReset: vi.fn() }));
vi.mock("../profile/profile.service", () => ({ getUserProfile: vi.fn(), updateUserProfile: vi.fn() }));
vi.mock("../transactions/transaction.service", () => ({ getTransactions: vi.fn() }));
vi.mock("../categories/category.service", () => ({ getCategories: vi.fn() }));
vi.mock("../accounts/account.service", () => ({ getAccounts: vi.fn(() => Promise.resolve([])) }));
vi.mock("../../components/pwa/use-app-version", () => ({
  useAppVersion: () => ({ installed: null, latest: null, checking: false, check: vi.fn(), openDownload: vi.fn(), updateAvailable: false })
}));
vi.mock("../export/export.service", () => ({ downloadTransactionsExport: vi.fn() }));

function renderPage(page: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter>{page}</MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
  return userEvent.setup();
}

afterEach(() => {
  act(() => dismissSnack());
});

describe("getExportRange", () => {
  it("covers the chosen period up to today", () => {
    expect(getExportRange("month", "2026-09-16")).toEqual({ startKey: "2026-09-01", endKey: "2026-09-16", label: "1 Sep – 16 Sep 2026" });
    expect(getExportRange("quarter", "2026-09-16")?.startKey).toBe("2026-06-17");
    expect(getExportRange("year", "2026-09-16")?.startKey).toBe("2026-01-01");
    expect(getExportRange("all", "2026-09-16")).toMatchObject({ startKey: null, endKey: null });
    expect(getExportRange("custom", "2026-09-16", { startKey: "", endKey: "2026-09-16" })).toBeNull();
  });
});

describe("ExportPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(new Date(2026, 8, 16, 10));
    vi.mocked(getCategories).mockResolvedValue([
      { id: "cat-food", name: "Makanan", type: "EXPENSE", icon: "utensils", color: null, isDefault: true, limit: null }
    ]);
    vi.mocked(getTransactions).mockResolvedValue({ items: [], pagination: { page: 1, limit: 1, total: 86, totalPages: 86 } });
  });

  afterEach(() => vi.useRealTimers());

  it("counts the entries in the period and downloads them in the chosen format", async () => {
    vi.mocked(downloadTransactionsExport).mockResolvedValue({ fileName: "sakuin.csv", location: "Download/Sakuin/sakuin.csv", nativeDownload: true });
    const user = renderPage(<ExportPage />);

    expect(await screen.findByText("86 transaksi")).toBeInTheDocument();
    expect(screen.getByText("1 Sep – 16 Sep 2026")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /CSV/ }));
    await user.click(screen.getByRole("radio", { name: "Keluar" }));
    await user.selectOptions(screen.getByLabelText("Kategori"), "cat-food");
    await waitFor(() =>
      expect(getTransactions).toHaveBeenLastCalledWith(expect.objectContaining({ type: "EXPENSE", categoryId: "cat-food", limit: 1 }))
    );

    await user.click(await screen.findByRole("button", { name: "Unduh CSV" }));
    await waitFor(() =>
      expect(downloadTransactionsExport).toHaveBeenCalledWith({
        format: "csv",
        type: "EXPENSE",
        categoryId: "cat-food",
        startDate: "2026-09-01",
        endDate: "2026-09-16"
      })
    );
    expect(await screen.findByText("File diunduh")).toBeInTheDocument();
  });

  it("waits for both dates of a custom range", async () => {
    const user = renderPage(<ExportPage />);

    await user.click(screen.getByRole("button", { name: "Pilih tanggal" }));
    expect(screen.getByRole("button", { name: "Pilih tanggal dulu" })).toBeDisabled();
  });
});

describe("AkunPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserProfile).mockResolvedValue({ id: "user-1", name: "Nadia", email: "nadia@sakuin.test", safeBalanceLimit: "0" });
  });

  it("saves the name and safe balance", async () => {
    vi.mocked(updateUserProfile).mockResolvedValue({ id: "user-1", name: "Nadia Putri", email: "nadia@sakuin.test", safeBalanceLimit: "500000" });
    const user = renderPage(<AkunPage />);

    await user.click(await screen.findByRole("button", { name: "Ubah profil" }));
    const sheet = screen.getByRole("dialog", { name: "Ubah profil" });
    const name = within(sheet).getByLabelText("Nama");
    await user.clear(name);
    await user.type(name, "Nadia Putri");
    await user.type(within(sheet).getByLabelText("Saldo aman (boleh kosong)"), "500000");
    await user.click(within(sheet).getByRole("button", { name: "Simpan" }));

    await waitFor(() => expect(updateUserProfile).toHaveBeenCalledWith({ name: "Nadia Putri", safeBalanceLimit: "500000" }));
    expect(updateAuthUser).toHaveBeenCalledWith({ name: "Nadia Putri", safeBalanceLimit: "500000" });
  });

  it("sends a password reset link to the account email", async () => {
    vi.mocked(requestPasswordReset).mockResolvedValue(undefined as never);
    const user = renderPage(<AkunPage />);

    await user.click(await screen.findByRole("button", { name: /Ganti password/ }));
    await waitFor(() => expect(requestPasswordReset).toHaveBeenCalledWith({ email: "nadia@sakuin.test" }));
    expect(await screen.findByText("Link ganti password dikirim")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Hapus akun/ })).toHaveAttribute("href", "/account-deletion");
  });
});
