import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, useToast } from "./ToastProvider";

function ToastTestComponent() {
  const { addToast, clearToasts } = useToast();

  return (
    <div>
      <button
        type="button"
        onClick={() =>
          addToast({
            variant: "success",
            title: "Transaksi berhasil",
            description: "Data transaksi sudah tersimpan.",
            duration: 0
          })
        }
      >
        Show toast
      </button>

      <button type="button" onClick={clearToasts}>
        Clear toast
      </button>
    </div>
  );
}

describe("ToastProvider", () => {
  it("menampilkan toast ketika addToast dipanggil", async () => {
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <ToastTestComponent />
      </ToastProvider>
    );

    await user.click(screen.getByRole("button", { name: "Show toast" }));

    expect(screen.getByText("Transaksi berhasil")).toBeInTheDocument();
    expect(screen.getByText("Data transaksi sudah tersimpan.")).toBeInTheDocument();
  });

  it("menghapus toast ketika tombol close diklik", async () => {
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <ToastTestComponent />
      </ToastProvider>
    );

    await user.click(screen.getByRole("button", { name: "Show toast" }));

    expect(screen.getByText("Transaksi berhasil")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Tutup notifikasi" }));

    expect(screen.queryByText("Transaksi berhasil")).not.toBeInTheDocument();
  });

  it("clearToasts menghapus semua toast", async () => {
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <ToastTestComponent />
      </ToastProvider>
    );

    await user.click(screen.getByRole("button", { name: "Show toast" }));

    expect(screen.getByText("Transaksi berhasil")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear toast" }));

    expect(screen.queryByText("Transaksi berhasil")).not.toBeInTheDocument();
  });
});