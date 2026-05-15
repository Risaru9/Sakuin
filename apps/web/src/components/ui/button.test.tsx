import { render, screen } from "@testing-library/react";
import { Button } from "./button";

describe("Button", () => {
  it("menampilkan children ketika tidak loading", () => {
    render(<Button>Simpan</Button>);

    expect(screen.getByRole("button", { name: "Simpan" })).toBeInTheDocument();
  });

  it("menampilkan teks loading dan disabled ketika isLoading true", () => {
    render(<Button isLoading>Simpan</Button>);

    const button = screen.getByRole("button", { name: "Memproses..." });

    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it("disabled ketika prop disabled true", () => {
    render(<Button disabled>Simpan</Button>);

    expect(screen.getByRole("button", { name: "Simpan" })).toBeDisabled();
  });

  it("menerapkan class tambahan dari className", () => {
    render(<Button className="custom-class">Simpan</Button>);

    expect(screen.getByRole("button", { name: "Simpan" })).toHaveClass(
      "custom-class"
    );
  });
});