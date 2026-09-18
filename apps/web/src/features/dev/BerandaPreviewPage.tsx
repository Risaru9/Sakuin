import type { ComponentType } from "react";
import { useParams } from "react-router-dom";
import { BerandaPage } from "../beranda/BerandaPage";
import { SearchPage } from "../beranda/SearchPage";
import { AkunPage } from "../lainnya/AkunPage";
import { BerulangPage } from "../lainnya/BerulangPage";
import { ExportPage } from "../lainnya/ExportPage";
import { KategoriPage } from "../lainnya/KategoriPage";
import { LainnyaPage } from "../lainnya/LainnyaPage";
import { PengingatPage } from "../lainnya/PengingatPage";
import { RekeningPage } from "../lainnya/RekeningPage";
import { TargetPage } from "../lainnya/TargetPage";
import { LaporanPage } from "../laporan/LaporanPage";
import { installFakeApi } from "./dev-fake-api";

// Development-only (/dev/beranda, /dev/cari, /dev/laporan, /dev/lainnya and its pages such as
// /dev/lainnya/rekening): the real screens backed by an in-memory API.
// Installed while this module loads so the very first queries already hit the fake server.
installFakeApi();

export function BerandaPreviewPage() {
  return <BerandaPage searchPath="/dev/cari" />;
}

export function SearchPreviewPage() {
  return <SearchPage homePath="/dev/beranda" />;
}

export function LaporanPreviewPage() {
  return <LaporanPage />;
}

export function LainnyaPreviewPage() {
  return <LainnyaPage />;
}

const LAINNYA_SECTIONS: Record<string, ComponentType> = {
  rekening: RekeningPage,
  kategori: KategoriPage,
  target: TargetPage,
  berulang: BerulangPage,
  pengingat: PengingatPage,
  export: ExportPage,
  akun: AkunPage
};

export function LainnyaSectionPreviewPage() {
  const { section = "" } = useParams();
  const Page = LAINNYA_SECTIONS[section];

  return Page ? <Page /> : <p className="p-6 font-black">Belum ada pratinjau untuk "{section}".</p>;
}
