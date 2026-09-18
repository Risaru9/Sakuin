import { BerandaPage } from "../beranda/BerandaPage";
import { SearchPage } from "../beranda/SearchPage";
import { LainnyaPage } from "../lainnya/LainnyaPage";
import { LaporanPage } from "../laporan/LaporanPage";
import { installFakeApi } from "./dev-fake-api";

// Development-only (/dev/beranda, /dev/cari, /dev/laporan, /dev/lainnya): the real screens
// backed by an in-memory API.
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
