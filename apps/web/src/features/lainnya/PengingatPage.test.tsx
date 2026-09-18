import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { dismissSnack } from "../../components/saku";
import { ToastProvider } from "../../components/toast/ToastProvider";
import {
  getNotificationPermission,
  subscribeBrowserToPushReminder,
  unsubscribeBrowserFromPushReminder
} from "../../lib/transaction-reminder";
import { getRemoteReminderSettings, updateRemoteReminderSettings } from "../reminders/reminder.service";
import { PengingatPage } from "./PengingatPage";

vi.mock("../auth/auth-context", () => ({
  useAuth: () => ({ user: { id: "user-1", name: "Nadia", email: "nadia@sakuin.test" } })
}));

vi.mock("../../lib/transaction-reminder", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/transaction-reminder")>()),
  getNotificationPermission: vi.fn(),
  subscribeBrowserToPushReminder: vi.fn(),
  unsubscribeBrowserFromPushReminder: vi.fn(),
  sendTestTransactionReminder: vi.fn()
}));

vi.mock("../reminders/reminder.service", () => ({
  getRemoteReminderSettings: vi.fn(),
  updateRemoteReminderSettings: vi.fn()
}));

const REMOTE = {
  enabled: false,
  frequency: "EVENING" as const,
  eveningHour: 20,
  quietStartHour: 21,
  quietEndHour: 7,
  maxPerDay: 1,
  timezoneOffsetMinutes: -420,
  dailyReviewCompletedDate: null,
  hasActiveSubscription: false
};

function renderPengingat() {
  render(
    <ToastProvider>
      <MemoryRouter>
        <PengingatPage />
      </MemoryRouter>
    </ToastProvider>
  );
  return userEvent.setup();
}

describe("PengingatPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(getNotificationPermission).mockResolvedValue("granted");
    vi.mocked(getRemoteReminderSettings).mockResolvedValue(REMOTE);
    vi.mocked(updateRemoteReminderSettings).mockResolvedValue({ ...REMOTE, enabled: true });
  });

  afterEach(() => {
    act(() => dismissSnack());
  });

  it("turns the nightly reminder on and off, saving it locally and on the server", async () => {
    vi.mocked(subscribeBrowserToPushReminder).mockResolvedValue(undefined as never);
    vi.mocked(unsubscribeBrowserFromPushReminder).mockResolvedValue(undefined as never);
    const user = renderPengingat();

    expect(screen.getByText("Hari ini ada jajan yang belum dicatat?")).toBeInTheDocument();
    const toggle = screen.getByRole("switch", { name: "Ingatkan aku mencatat" });
    expect(toggle).toHaveAttribute("aria-checked", "false");

    await user.click(toggle);
    await waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "true"));
    expect(subscribeBrowserToPushReminder).toHaveBeenCalled();
    expect(updateRemoteReminderSettings).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true, frequency: "EVENING", eveningHour: 20, maxPerDay: 1 })
    );
    expect(await screen.findByText("Pengingat aktif")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kirim notifikasi tes sekarang" })).toBeInTheDocument();

    await user.click(toggle);
    await waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "false"));
    expect(unsubscribeBrowserFromPushReminder).toHaveBeenCalled();
  });

  it("explains a blocked permission and keeps the reminder off", async () => {
    vi.mocked(getNotificationPermission).mockResolvedValue("denied");
    vi.mocked(subscribeBrowserToPushReminder).mockRejectedValue(new Error("Izin notifikasi ditolak"));
    const user = renderPengingat();

    expect(await screen.findByRole("alert")).toHaveTextContent("Notifikasi Sakuin sedang diblokir");

    await user.click(screen.getByRole("switch", { name: "Ingatkan aku mencatat" }));
    expect(await screen.findByText("Notifikasi belum bisa aktif")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Ingatkan aku mencatat" })).toHaveAttribute("aria-checked", "false");
  });
});
