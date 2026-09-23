import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const distDirectory = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const html = readFileSync(join(distDirectory, "index.html"), "utf8");
const entry = html.match(/\/assets\/index-([A-Za-z0-9_-]+)\.js/);

if (!entry) {
  throw new Error("Build web tidak memuat entry JavaScript yang dapat dipakai sebagai versi cache.");
}

const workerPath = join(distDirectory, "sw.js");
const worker = readFileSync(workerPath, "utf8");
const marker = "__SAKUIN_BUILD_ID__";

if (!worker.includes(marker)) {
  throw new Error("Service worker tidak memuat penanda versi build.");
}

writeFileSync(workerPath, worker.replaceAll(marker, entry[1]));
