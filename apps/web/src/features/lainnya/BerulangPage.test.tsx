import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { dismissSnack } from "../../components/saku";
import { ToastProvider } from "../../components/toast/ToastProvider";
import { getCategories } from "../categories/category.service";
import { describeSchedule, dueThisWeek, monthlyEstimate } from "../recurring/recurring-data";
import { createRecurringRule, getRecurringRules, updateRecurringRule } from "../recurring/recurring.service";
import type { RecurringRule } from "../recurring/recurring.types";
import { BerulangPage } from "./BerulangPage";

vi.mock("../auth/auth-context", () => ({
  useAuth: () => ({ user: { id: "user-1", name: "Nadia", email: "nadia@sakuin.test" } })
}));

vi.mock("../recurring/recurring.service", () => ({
  getRecurringRules: vi.fn(),
  createRecurringRule: vi.fn(),
  updateRecurringRule: vi.fn(),
  deleteRecurringRule: vi.fn()
}));

vi.mock("../categories/category.service", () => ({
  getCategories: vi.fn(),
  createCategory: vi.fn()
}));

function rule(overrides: Partial<RecurringRule> & Pick<RecurringRule, "id" | "amount">): RecurringRule {
  return {
    categoryId: "cat-bills",
    type: "EXPENSE",
    note: null,
    frequency: "MONTHLY",
    interval: 1,
    dayOfMonth: 5,
    dayOfWeek: null,
    startDate: "2026-01-01T00:00:00.000Z",
    endDate: null,
    nextRunAt: new Date(2026, 9, 5).toISOString(),
    autoPost: true,
    isActive: true,
    lastRunAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    category: { id: "cat-bills", name: "Tagihan", type: "EXPENSE", icon: "receipt", color: null },
    ...overrides
  };
}

const RULES = [
  rule({ id: "r-net", amount: "350000", note: "Internet rumah" }),
  rule({ id: "r-adik", amount: "100000", note: "Uang saku adik", frequency: "WEEKLY", dayOfMonth: null, dayOfWeek: 1, nextRunAt: new Date(2026, 8, 21).toISOString() }),
  rule({
    id: "r-gaji",
    amount: "3000000",
    note: null,
    type: "INCOME",
    dayOfMonth: 1,
    category: { id: "cat-salary", name: "Gaji", type: "INCOME", icon: "wallet", color: null },
    categoryId: "cat-salary"
  }),
  rule({ id: "r-musik", amount: "55000", note: "Langganan musik", dayOfMonth: 20, isActive: false })
];

describe("recurring helpers", () => {
  it("describes schedules and estimates a month of active rules", () => {
    expect(describeSchedule(RULES[0])).toBe("Tiap bulan, tanggal 5");
    expect(describeSchedule(RULES[1])).toBe("Tiap Senin");
    expect(describeSchedule({ ...RULES[1], interval: 2 })).toBe("Tiap 2 minggu, Senin");
    // 350.000 + 100.000 × 52/12; the paused subscription does not count.
    expect(monthlyEstimate(RULES)).toEqual({ expense: 783_333, income: 3_000_000 });
    expect(dueThisWeek(RULES, new Date(2026, 8, 16, 10)).map((item) => item.id)).toEqual(["r-adik"]);
  });
});

describe("BerulangPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(new Date(2026, 8, 16, 10));
    vi.mocked(getRecurringRules).mockResolvedValue(RULES);
    vi.mocked(getCategories).mockResolvedValue([
      { id: "cat-bills", name: "Tagihan", type: "EXPENSE", icon: "receipt", color: null, isDefault: true, limit: null },
      { id: "cat-salary", name: "Gaji", type: "INCOME", icon: "wallet", color: null, isDefault: true, limit: null }
    ]);
  });

  afterEach(() => {
    act(() => dismissSnack());
    vi.useRealTimers();
  });

  function renderBerulang() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
    });
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter>
            <BerulangPage />
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    );
    return userEvent.setup();
  }

  it("lists rules with the monthly estimate and pauses one", async () => {
    vi.mocked(updateRecurringRule).mockResolvedValue({ ...RULES[0], isActive: false });
    const user = renderBerulang();

    expect(await screen.findByText("783.333")).toBeInTheDocument();
    expect(screen.getByText("3.000.000")).toBeInTheDocument();
    expect(screen.getByText("Minggu ini: Uang saku adik (Senin)")).toBeInTheDocument();
    expect(screen.getByText("Tiap bulan, tanggal 20 · dijeda")).toBeInTheDocument();

    await user.click(screen.getByRole("switch", { name: "Jeda Internet rumah" }));
    await waitFor(() => expect(updateRecurringRule).toHaveBeenCalledWith("r-net", { isActive: false }));
  });

  it("creates a weekly rule that records itself", async () => {
    vi.mocked(createRecurringRule).mockResolvedValue(RULES[1]);
    const user = renderBerulang();

    await user.click(await screen.findByRole("button", { name: "Tambah transaksi berulang" }));
    const sheet = screen.getByRole("dialog", { name: "Transaksi berulang baru" });
    await user.type(within(sheet).getByLabelText("Nama"), "Uang saku adik");
    await user.type(within(sheet).getByLabelText("Nominal"), "100000");
    await user.click(within(sheet).getByRole("radio", { name: "Tiap minggu" }));
    await user.click(within(sheet).getByRole("button", { name: "Senin" }));
    await user.click(within(sheet).getByRole("button", { name: "Buat jadwal" }));

    await waitFor(() =>
      expect(createRecurringRule).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "EXPENSE",
          categoryId: "cat-bills",
          amount: "100000",
          note: "Uang saku adik",
          frequency: "WEEKLY",
          dayOfWeek: 1,
          dayOfMonth: null,
          autoPost: true,
          isActive: true
        })
      )
    );
  });
});
