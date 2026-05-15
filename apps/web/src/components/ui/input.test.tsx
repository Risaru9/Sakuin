import { render, screen } from "@testing-library/react";
import { Input } from "./input";

describe("Input", () => {
  it("menampilkan label dan input", () => {
    render(<Input label="Email" name="email" placeholder="Masukkan email" />);

    const input = screen.getByLabelText("Email");

    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("name", "email");
    expect(input).toHaveAttribute("placeholder", "Masukkan email");
  });

  it("menggunakan id dari props jika tersedia", () => {
    render(<Input id="custom-email" label="Email" name="email" />);

    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "id",
      "custom-email"
    );
  });

  it("menampilkan pesan error jika error diberikan", () => {
    render(<Input label="Email" name="email" error="Email wajib diisi" />);

    expect(screen.getByText("Email wajib diisi")).toBeInTheDocument();
  });

  it("menerapkan class tambahan dari className", () => {
    render(<Input label="Email" name="email" className="custom-input" />);

    expect(screen.getByLabelText("Email")).toHaveClass("custom-input");
  });
});