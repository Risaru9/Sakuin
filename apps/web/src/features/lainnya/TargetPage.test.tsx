import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Laptop, PiggyBank, Umbrella } from "lucide-react";
import { MemoryRouter } from "react-router-dom";
import { dismissSnack } from "../../components/saku";
import { ToastProvider } from "../../components/toast/ToastProvider";
import { describeGoalHint, goalVisual } from "../goals/goal-data";
import { createGoal, getGoal, getGoals, updateGoal } from "../goals/goal.service";
import type { Goal } from "../goals/goal.types";
import { TargetPage } from "./TargetPage";

vi.mock("../auth/auth-context", () => ({
  useAuth: () => ({ user: { id: "user-1", name: "Nadia", email: "nadia@sakuin.test" } })
}));

vi.mock("../goals/goal.service", () => ({
  getGoals: vi.fn(),
  getGoal: vi.fn(),
  createGoal: vi.fn(),
  updateGoal: vi.fn(),
  deleteGoal: vi.fn()
}));

function goal(id: string, name: string, target: number, current: number, deadline: string | null): Goal {
  return {
    id,
    name,
    targetAmount: String(target),
    currentAmount: String(current),
    deadline,
    description: null,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-09-02T05:00:00.000Z"
  };
}

const GOALS = [
  goal("g-concert", "Tiket konser", 750_000, 750_000, null),
  goal("g-laptop", "Laptop baru", 8_000_000, 3_200_000, "2026-12-31T00:00:00.000Z"),
  goal("g-emergency", "Dana darurat", 5_000_000, 1_500_000, null)
];

describe("goal helpers", () => {
  it("picks an icon from the name and suggests a monthly amount for the deadline", () => {
    expect(goalVisual("Laptop baru", 0).Icon).toBe(Laptop);
    expect(goalVisual("Dana darurat", 1).Icon).toBe(Umbrella);
    expect(goalVisual("Beli kulkas", 2).Icon).toBe(PiggyBank);

    const now = new Date(2026, 8, 16, 10);
    expect(describeGoalHint(GOALS[1], now)).toBe("Sisihkan ±1,38 jt per bulan supaya tepat waktu");
    expect(describeGoalHint(GOALS[2], now)).toBe("Pelan-pelan saja, sudah 30%");
    expect(describeGoalHint({ ...GOALS[1], deadline: "2026-08-01T00:00:00.000Z" }, now)).toMatch(/sudah lewat/);
  });
});

describe("TargetPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(new Date(2026, 8, 16, 10));
    vi.mocked(getGoals).mockResolvedValue(GOALS);
    vi.mocked(getGoal).mockImplementation(async (id) => ({
      ...GOALS.find((item) => item.id === id)!,
      history: [{ id: "h1", amount: "500000", currentAmount: "3200000", createdAt: "2026-09-01T03:00:00.000Z" }]
    }));
  });

  afterEach(() => {
    act(() => dismissSnack());
    vi.useRealTimers();
  });

  function renderTarget() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
    });
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter>
            <TargetPage />
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    );
    return userEvent.setup();
  }

  it("shows running goals first with the total saved", async () => {
    renderTarget();

    expect(await screen.findByText("Total ditabung 5.450.000")).toBeInTheDocument();
    expect(screen.getByText("2 target berjalan · 1 tercapai")).toBeInTheDocument();
    const names = screen.getAllByRole("button", { name: /^Ubah target/ }).map((button) => button.getAttribute("aria-label"));
    expect(names).toEqual(["Ubah target Laptop baru", "Ubah target Dana darurat", "Ubah target Tiket konser"]);
    expect(screen.getByText("Tercapai!")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tabung ke Tiket konser" })).not.toBeInTheDocument();
  });

  it("adds a deposit and never goes past the target", async () => {
    vi.mocked(updateGoal).mockResolvedValue(GOALS[2]);
    const user = renderTarget();

    await user.click(await screen.findByRole("button", { name: "Tabung ke Laptop baru" }));
    const sheet = screen.getByRole("dialog", { name: "Tabung ke Laptop baru" });
    expect(within(sheet).getByText("Mantap! Tinggal 4.550.000 lagi.")).toBeInTheDocument();
    expect(await within(sheet).findByText("+500.000")).toBeInTheDocument();

    await user.click(within(sheet).getByRole("button", { name: "Tabung 250.000" }));
    await waitFor(() => expect(updateGoal).toHaveBeenCalledWith("g-laptop", { currentAmount: "3450000" }));

    await user.click(screen.getByRole("button", { name: "Tabung ke Dana darurat" }));
    const second = screen.getByRole("dialog", { name: "Tabung ke Dana darurat" });
    const amount = within(second).getByLabelText("Nominal");
    await user.clear(amount);
    await user.type(amount, "9000000");
    expect(within(second).getByText("Wah, targetnya langsung tercapai!")).toBeInTheDocument();
    await user.click(within(second).getByRole("button", { name: "Tabung 3.500.000" }));
    await waitFor(() => expect(updateGoal).toHaveBeenCalledWith("g-emergency", { currentAmount: "5000000" }));
  });

  it("creates a goal with an optional starting amount", async () => {
    vi.mocked(createGoal).mockResolvedValue(goal("g-new", "Liburan", 3_000_000, 200_000, null));
    const user = renderTarget();

    await user.click(await screen.findByRole("button", { name: "Tambah target" }));
    const sheet = screen.getByRole("dialog", { name: "Target baru" });
    await user.type(within(sheet).getByLabelText("Nama"), "Liburan");
    await user.type(within(sheet).getByLabelText("Jumlah target"), "3000000");
    await user.type(within(sheet).getByLabelText("Sudah terkumpul (boleh kosong)"), "200000");
    await user.click(within(sheet).getByRole("button", { name: "Buat target" }));

    await waitFor(() =>
      expect(createGoal).toHaveBeenCalledWith({
        name: "Liburan",
        targetAmount: "3000000",
        currentAmount: "200000",
        deadline: null
      })
    );
  });
});
