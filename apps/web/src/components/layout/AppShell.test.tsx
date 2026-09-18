import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppShell } from "./AppShell";

vi.mock("../../features/auth/auth-context", () => ({
  useAuth: () => ({ user: { id: "user-1", name: "Nadia", email: "nadia@sakuin.test" } })
}));

vi.mock("../../features/quick-composer/QuickComposer", () => ({
  QuickComposer: () => <div data-testid="composer" />
}));

function renderShell(path: string, props: Partial<Parameters<typeof AppShell>[0]> = {}) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppShell {...props}>
        <p>Isi halaman</p>
      </AppShell>
    </MemoryRouter>
  );
}

describe("AppShell", () => {
  it("has three tabs and keeps Lainnya selected on its sub pages", () => {
    renderShell("/goals");

    const nav = screen.getByRole("navigation", { name: "Navigasi utama mobile" });
    const links = within(nav).getAllByRole("link");

    expect(links.map((link) => link.textContent)).toEqual(["Catatan", "Laporan", "Lainnya"]);
    expect(within(nav).getByRole("link", { name: "Lainnya" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Catatan" })).not.toHaveAttribute("aria-current");
  });

  it("treats search as part of Catatan", () => {
    renderShell("/cari");

    const nav = screen.getByRole("navigation", { name: "Navigasi utama mobile" });
    expect(within(nav).getByRole("link", { name: "Catatan" })).toHaveAttribute("aria-current", "page");
  });

  it("docks the composer only when asked and can hide the bottom bar", () => {
    renderShell("/cari", { showQuickComposer: true, mobileNav: false });

    expect(screen.getByTestId("composer")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Navigasi utama mobile" })).not.toBeInTheDocument();
  });

  it("no longer shows the old + menu or floating assistant", () => {
    renderShell("/dashboard");

    expect(screen.queryByRole("button", { name: /menu aksi transaksi/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /asisten sakuin/i })).not.toBeInTheDocument();
  });
});
