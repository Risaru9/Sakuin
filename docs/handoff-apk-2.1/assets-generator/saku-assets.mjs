// Generates Saku artwork for Android (vector drawables) and the web (SVG for PNG rendering)
// from one description that mirrors apps/web/src/components/saku/saku-mascot.tsx.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = dirname(fileURLToPath(import.meta.url));
const INK = "#1D1A33";
const COIN = "#FFC83D";
const MASCOT = "#74AAFF";
const CHEEK = "#FF9FB2";
const WHITE = "#FFFFFF";
const TONGUE = "#FF8FA3";
const SWEAT = "#8FD3FF";
const CREAM = "#FFF7E8";

const n = (value) => Number(value.toFixed(2));

function circlePath(cx, cy, r) {
  return ellipsePath(cx, cy, r, r);
}

function ellipsePath(cx, cy, rx, ry) {
  return `M${n(cx - rx)},${n(cy)} a${n(rx)},${n(ry)} 0 1,0 ${n(rx * 2)},0 a${n(rx)},${n(ry)} 0 1,0 ${n(-rx * 2)},0 Z`;
}

// Vector drawables have no stroke-dasharray, so the stitch becomes separate dashes.
function dashedQuad(p0, p1, p2, dash, gap) {
  const point = (t) => [
    (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t ** 2 * p2[0],
    (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t ** 2 * p2[1]
  ];
  const samples = [];
  let length = 0;
  let previous = point(0);
  for (let i = 0; i <= 400; i += 1) {
    const current = point(i / 400);
    length += Math.hypot(current[0] - previous[0], current[1] - previous[1]);
    samples.push({ at: length, p: current });
    previous = current;
  }
  const atLength = (target) => samples.find((sample) => sample.at >= target)?.p ?? samples[samples.length - 1].p;
  const parts = [];
  for (let start = 0; start < length; start += dash + gap) {
    const a = atLength(start);
    const b = atLength(Math.min(length, start + dash));
    parts.push(`M${n(a[0])},${n(a[1])} L${n(b[0])},${n(b[1])}`);
  }
  return parts.join(" ");
}

/** Shapes in the 120x120 mascot box. */
function mascotShapes(mood = "happy") {
  const shapes = [
    { d: circlePath(80, 30, 17), fill: COIN, stroke: INK, width: 4 },
    { d: circlePath(80, 30, 8.5), stroke: INK, width: 2.4, strokeAlpha: 0.5 },
    {
      d: "M16,44 Q16,36 24,36 H96 Q104,36 104,44 V76 Q104,106 60,114 Q16,106 16,76 Z",
      fill: MASCOT,
      stroke: INK,
      width: 4,
      join: "round"
    },
    { d: dashedQuad([26, 50], [60, 60], [94, 50], 6, 6), stroke: WHITE, width: 3, cap: "round", strokeAlpha: 0.8 }
  ];
  const eyeRy = mood === "wow" ? 12.5 : 11;
  const dx = mood === "wow" ? 0 : 2;
  const dy = mood === "worried" ? 4 : 2;
  for (const cx of [43, 73]) {
    shapes.push({ d: ellipsePath(cx, 74, 9.5, eyeRy), fill: WHITE, stroke: INK, width: 3 });
    shapes.push({ d: circlePath(cx + dx, 74 + dy, 5.2), fill: INK });
    shapes.push({ d: circlePath(cx + dx + 2, 71 + dy, 1.9), fill: WHITE });
  }
  if (mood === "wow") {
    shapes.push({ d: ellipsePath(60, 98, 6.5, 8), fill: INK });
    shapes.push({ d: ellipsePath(60, 101, 3.5, 3), fill: TONGUE });
  } else if (mood === "worried") {
    shapes.push({ d: "M48,99 Q54,93 60,99 Q66,105 72,99", stroke: INK, width: 4, cap: "round" });
  } else {
    shapes.push({ d: "M49,93 Q60,105 71,93", stroke: INK, width: 4.2, cap: "round" });
  }
  shapes.push({ d: ellipsePath(30, 92, 6.5, 3.8), fill: CHEEK });
  shapes.push({ d: ellipsePath(90, 92, 6.5, 3.8), fill: CHEEK });
  if (mood === "worried") {
    shapes.push({ d: "M34,58 L50,63", stroke: INK, width: 3.5, cap: "round" });
    shapes.push({ d: "M86,58 L70,63", stroke: INK, width: 3.5, cap: "round" });
    shapes.push({ d: "M107,48 Q114,60 107,65 Q100,60 107,48 Z", fill: SWEAT, stroke: INK, width: 2.5 });
  }
  if (mood === "wow") {
    shapes.push({ d: "M104,16 l4,-8", stroke: INK, width: 3, cap: "round" });
    shapes.push({ d: "M110,24 l8,-3", stroke: INK, width: 3, cap: "round" });
  }
  return shapes;
}

function vectorPath(shape) {
  const attrs = [`android:pathData="${shape.d}"`];
  if (shape.fill) attrs.push(`android:fillColor="${shape.fill}"`);
  if (shape.stroke) {
    attrs.push(`android:strokeColor="${shape.stroke}"`, `android:strokeWidth="${shape.width}"`);
    if (shape.strokeAlpha) attrs.push(`android:strokeAlpha="${shape.strokeAlpha}"`);
    if (shape.cap) attrs.push(`android:strokeLineCap="${shape.cap}"`);
    if (shape.join) attrs.push(`android:strokeLineJoin="${shape.join}"`);
  }
  return `        <path\n            ${attrs.join("\n            ")} />`;
}

function svgPath(shape) {
  const attrs = [`d="${shape.d}"`, `fill="${shape.fill ?? "none"}"`];
  if (shape.stroke) {
    attrs.push(`stroke="${shape.stroke}"`, `stroke-width="${shape.width}"`);
    if (shape.strokeAlpha) attrs.push(`stroke-opacity="${shape.strokeAlpha}"`);
    if (shape.cap) attrs.push(`stroke-linecap="${shape.cap}"`);
    if (shape.join) attrs.push(`stroke-linejoin="${shape.join}"`);
  }
  return `<path ${attrs.join(" ")}/>`;
}

/** Android vector: the mascot scaled by `scale` and moved by (tx, ty) inside a viewport. */
function vectorDrawable({ size, viewport, groups, comment }) {
  const body = groups
    .map((group) => {
      const paths = group.shapes.map(vectorPath).join("\n");
      return `    <group\n        android:scaleX="${group.scale}"\n        android:scaleY="${group.scale}"\n        android:translateX="${group.tx}"\n        android:translateY="${group.ty}">\n${paths}\n    </group>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="utf-8"?>
<!-- ${comment} Generated from the web mascot (components/saku/saku-mascot.tsx). -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="${size}dp"
    android:height="${size}dp"
    android:viewportWidth="${viewport}"
    android:viewportHeight="${viewport}">
${body}
</vector>
`;
}

function write(relativePath, content) {
  const target = join(OUT, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

// ---------- Android ----------

// Adaptive icon foreground (108dp canvas; the 66dp safe zone holds the mascot box).
const iconScale = 0.55;
const iconOffset = n((108 - 120 * iconScale) / 2);
write(
  "android/drawable/ic_launcher_saku.xml",
  vectorDrawable({
    size: 108,
    viewport: 108,
    comment: "Launcher and splash icon: Saku centred in the adaptive-icon safe zone.",
    groups: [{ scale: iconScale, tx: iconOffset, ty: n(iconOffset + 2) }]
      .map((group) => ({ ...group, shapes: mascotShapes("happy") }))
  })
);

// Themed (monochrome) icon for Android 13+: pocket and coin silhouettes.
write(
  "android/drawable/ic_launcher_saku_monochrome.xml",
  `<?xml version="1.0" encoding="utf-8"?>
<!-- Themed-icon silhouette of Saku: the launcher tints it. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <group
        android:scaleX="${iconScale}"
        android:scaleY="${iconScale}"
        android:translateX="${iconOffset}"
        android:translateY="${n(iconOffset + 2)}">
        <path
            android:fillColor="#FFFFFFFF"
            android:pathData="${circlePath(80, 30, 17)}" />
        <path
            android:fillColor="#FFFFFFFF"
            android:pathData="M16,44 Q16,36 24,36 H96 Q104,36 104,44 V76 Q104,106 60,114 Q16,106 16,76 Z" />
    </group>
</vector>
`
);

for (const mood of ["happy", "wow", "worried"]) {
  write(
    `android/drawable/saku_${mood}.xml`,
    vectorDrawable({
      size: 120,
      viewport: 120,
      comment: `Saku, ${mood}.`,
      groups: [{ scale: 1, tx: 0, ty: 0, shapes: mascotShapes(mood) }]
    })
  );
}

// Notification small icon: a white pocket with its coin (status bar tints it).
write(
  "android/drawable/ic_stat_saku.xml",
  `<?xml version="1.0" encoding="utf-8"?>
<!-- Status-bar icon: Saku's pocket and coin as one white silhouette. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="120"
    android:viewportHeight="120">
    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="${circlePath(80, 24, 18)}" />
    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="M10,46 Q10,36 20,36 H100 Q110,36 110,46 V76 Q110,110 60,118 Q10,110 10,76 Z" />
</vector>
`
);

// ---------- Web (SVG, rendered to PNG by a headless browser) ----------

function mascotSvgGroup(mood, scale, tx, ty) {
  return `<g transform="translate(${tx} ${ty}) scale(${scale})">${mascotShapes(mood).map(svgPath).join("")}</g>`;
}

// Round icon with the ink ring (legacy launcher PNGs, PWA "any" icons, favicons).
function roundIconSvg(size) {
  const ring = Math.max(1.5, size / 40);
  const r = size / 2 - ring / 2;
  const mascotBox = size * 0.74;
  const offset = (size - mascotBox) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${n(r)}" fill="${COIN}" stroke="${INK}" stroke-width="${n(ring)}"/>${mascotSvgGroup("happy", n(mascotBox / 120), n(offset), n(offset + size * 0.04))}</svg>`;
}

// Maskable icon: full-bleed yellow, mascot inside the 80% safe circle.
function maskableSvg(size) {
  const mascotBox = size * 0.62;
  const offset = (size - mascotBox) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="${COIN}"/>${mascotSvgGroup("happy", n(mascotBox / 120), n(offset), n(offset + size * 0.03))}</svg>`;
}

// Loose mascot (web loading screen, widget previews).
write("web/saku-round.svg", roundIconSvg(512));
for (const size of [16, 32, 48, 72, 96, 144, 192, 512]) {
  write(`render/round-${size}.svg`, roundIconSvg(size));
}
for (const size of [192, 512]) {
  write(`render/maskable-${size}.svg`, maskableSvg(size));
}

console.log("assets written", CREAM);

for (const mood of ["happy", "wow", "worried"]) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192"><rect width="192" height="192" rx="40" fill="#FFF0C2"/>${mascotSvgGroup(mood, 1.3, 18, 12)}</svg>`;
  write(`render/saku_notif_${mood}-192.html`, `<html><body style="margin:0">${svg}</body></html>`);
}
