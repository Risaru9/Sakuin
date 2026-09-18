import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SakuSnackHost } from "./saku-snack-host";
import { dismissSnack, showSnack, SNACK_DURATION_MS } from "./snack-store";

describe("Saku snack store", () => {
  afterEach(() => {
    act(() => dismissSnack());
    vi.useRealTimers();
  });

  it("shows one message at a time and hides it after a few seconds", () => {
    vi.useFakeTimers();
    render(<SakuSnackHost />);

    act(() => showSnack({ title: "Kopi tercatat" }));
    act(() => showSnack({ title: "Bensin tercatat" }));

    expect(screen.queryByText("Kopi tercatat")).not.toBeInTheDocument();
    expect(screen.getByText("Bensin tercatat")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(SNACK_DURATION_MS));
    expect(screen.queryByText("Bensin tercatat")).not.toBeInTheDocument();
  });

  it("runs the action once and closes the message", async () => {
    const onAction = vi.fn();
    const user = userEvent.setup();
    render(<SakuSnackHost />);

    act(() => showSnack({ title: "Kopi dihapus", actionLabel: "Batalkan", onAction }));
    await user.click(screen.getByRole("button", { name: "Batalkan" }));

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Kopi dihapus")).not.toBeInTheDocument();
  });

  it("ignores a stale dismiss for an older message", () => {
    render(<SakuSnackHost />);

    act(() => showSnack({ title: "Pertama" }));
    act(() => showSnack({ title: "Kedua" }));
    act(() => dismissSnack(1));

    expect(screen.getByText("Kedua")).toBeInTheDocument();
  });
});
