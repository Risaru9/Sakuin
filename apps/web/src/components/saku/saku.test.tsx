import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  BottomSheet,
  CategoryBadge,
  SakuMascot,
  SegmentedControl,
  StickerButton,
  StickerChip,
  StickerSwitch,
  getCategoryVisual
} from ".";

describe("SakuMascot", () => {
  it("dekoratif secara default dan menandai ekspresinya", () => {
    const { container } = render(<SakuMascot mood="worried" />);
    const svg = container.querySelector("svg");

    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("data-mood", "worried");
  });

  it("punya nama aksesibel ketika label diisi", () => {
    render(<SakuMascot label="Saku senang" />);

    expect(screen.getByRole("img", { name: "Saku senang" })).toHaveAttribute(
      "data-mood",
      "happy"
    );
  });
});

describe("StickerButton", () => {
  it("menampilkan teks loading dan disabled ketika isLoading true", () => {
    render(<StickerButton isLoading>Simpan</StickerButton>);

    const button = screen.getByRole("button", { name: "Memproses..." });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("default type button supaya tidak mengirim form tanpa sengaja", () => {
    render(<StickerButton>Simpan</StickerButton>);

    expect(screen.getByRole("button", { name: "Simpan" })).toHaveAttribute("type", "button");
  });
});

describe("StickerChip", () => {
  it("menandai chip terpilih lewat aria-pressed", () => {
    render(
      <>
        <StickerChip active>Keluar</StickerChip>
        <StickerChip active={false}>Masuk</StickerChip>
        <StickerChip>Aksi</StickerChip>
      </>
    );

    expect(screen.getByRole("button", { name: "Keluar" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Masuk" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Aksi" })).not.toHaveAttribute("aria-pressed");
  });
});

describe("StickerSwitch", () => {
  it("mengirim nilai kebalikan saat diketuk", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<StickerSwitch checked={false} label="Pengingat aktif" onCheckedChange={onCheckedChange} />);

    const toggle = screen.getByRole("switch", { name: "Pengingat aktif" });
    expect(toggle).toHaveAttribute("aria-checked", "false");

    await user.click(toggle);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });
});

describe("SegmentedControl", () => {
  function TypeSwitcher() {
    const [value, setValue] = useState<"out" | "in">("out");

    return (
      <SegmentedControl
        ariaLabel="Jenis transaksi"
        onChange={setValue}
        options={[
          { value: "out", label: "Keluar" },
          { value: "in", label: "Masuk" }
        ]}
        value={value}
      />
    );
  }

  it("memilih opsi lewat klik dan tombol panah", async () => {
    const user = userEvent.setup();
    render(<TypeSwitcher />);

    const keluar = screen.getByRole("radio", { name: "Keluar" });
    const masuk = screen.getByRole("radio", { name: "Masuk" });
    expect(keluar).toHaveAttribute("aria-checked", "true");

    await user.click(masuk);
    expect(masuk).toHaveAttribute("aria-checked", "true");

    await user.keyboard("{ArrowRight}");
    expect(keluar).toHaveAttribute("aria-checked", "true");
    expect(keluar).toHaveFocus();
  });
});

describe("BottomSheet", () => {
  it("tidak merender apa pun ketika tertutup", () => {
    render(
      <BottomSheet onClose={() => undefined} open={false} title="Detail catatan">
        Isi
      </BottomSheet>
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("tampil sebagai dialog dan menutup lewat Escape atau tombol tutup", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <BottomSheet onClose={onClose} open subtitle="Pilih kategori" title="Detail catatan">
        <p>Isi popup</p>
      </BottomSheet>
    );

    const dialog = screen.getByRole("dialog", { name: "Detail catatan" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveFocus();
    expect(screen.getByText("Isi popup")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getAllByRole("button", { name: "Tutup" })[1]);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("hanya menutup sheet paling atas saat Escape ditekan pada sheet bertumpuk", async () => {
    const user = userEvent.setup();
    const closeOuter = vi.fn();
    const closeInner = vi.fn();

    function Stacked() {
      const [innerOpen, setInnerOpen] = useState(false);

      return (
        <BottomSheet onClose={closeOuter} open title="Ubah catatan">
          <button onClick={() => setInnerOpen(true)} type="button">
            Tambah
          </button>
          <BottomSheet
            onClose={() => {
              closeInner();
              setInnerOpen(false);
            }}
            open={innerOpen}
            title="Kategori baru"
          >
            Form
          </BottomSheet>
        </BottomSheet>
      );
    }

    render(<Stacked />);
    await user.click(screen.getByRole("button", { name: "Tambah" }));
    expect(screen.getByRole("dialog", { name: "Kategori baru" })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(closeInner).toHaveBeenCalledTimes(1);
    expect(closeOuter).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { name: "Kategori baru" })).not.toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(closeOuter).toHaveBeenCalledTimes(1);
  });

  it("mengunci scroll halaman selama terbuka", () => {
    const { rerender } = render(
      <BottomSheet onClose={() => undefined} open title="Detail">
        Isi
      </BottomSheet>
    );
    expect(document.body.style.overflow).toBe("hidden");

    rerender(
      <BottomSheet onClose={() => undefined} open={false} title="Detail">
        Isi
      </BottomSheet>
    );
    expect(document.body.style.overflow).toBe("");
  });
});

describe("CategoryBadge", () => {
  it("memakai ikon sesuai kategori bawaan", () => {
    const { container } = render(<CategoryBadge icon="utensils" />);

    expect(container.firstChild).toHaveAttribute("data-icon", "utensils");
  });

  it("memakai tampilan cadangan untuk ikon yang tidak dikenal", () => {
    const { container } = render(<CategoryBadge icon="ikon-aneh" />);

    expect(container.firstChild).toHaveAttribute("data-icon", "fallback");
    expect(getCategoryVisual(null)).toBe(getCategoryVisual("ikon-aneh"));
  });
});
