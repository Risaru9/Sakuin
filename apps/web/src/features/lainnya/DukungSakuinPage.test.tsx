import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { DukungSakuinPage } from "./DukungSakuinPage";

vi.mock("../../components/layout/AppShell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => <>{children}</>
}));

it("shows the verified transfer details while QRIS remains unavailable and copies the account number", async () => {
  const user = userEvent.setup();
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText }
  });

  render(
    <MemoryRouter>
      <DukungSakuinPage />
    </MemoryRouter>
  );

  expect(screen.getByRole("heading", { name: "Transfer Bank Jago" })).toBeInTheDocument();
  expect(screen.getByText("100307635788")).toBeInTheDocument();
  expect(screen.getByText("Rizal Mahardika Putra")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "QRIS" })).toBeInTheDocument();
  expect(screen.getByText("Segera hadir")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Salin nomor rekening" }));
  expect(writeText).toHaveBeenCalledWith("100307635788");
});
