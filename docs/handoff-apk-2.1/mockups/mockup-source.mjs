// Mockups for Sakuin APK 2.1: launcher icon, splash + loading, home-screen widget,
// quick-entry window, and three new notifications. Writes project/*.dc.html + canvas.json.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = join(ROOT, "project");
mkdirSync(OUT, { recursive: true });

const ICONS = {
  check: '<path d="M20 6 9 17l-5-5"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  refresh: '<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/>',
  chevronLeft: '<path d="m15 6-6 6 6 6"/>',
  chevronRight: '<path d="m9 6 6 6-6 6"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  checkCircle: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  pie: '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
  message: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  map: '<path d="M14.1 3.5 9.9 1.5a2 2 0 0 0-1.8 0L3.6 3.7A1 1 0 0 0 3 4.6v15.8a1 1 0 0 0 1.4.9l3.7-1.8a2 2 0 0 1 1.8 0l4.2 2a2 2 0 0 0 1.8 0l4.5-2.2a1 1 0 0 0 .6-.9V3.6a1 1 0 0 0-1.4-.9l-3.7 1.8a2 2 0 0 1-1.8 0z"/>',
  utensils: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>',
  car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
  bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>',
  banknote: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01"/><path d="M18 12h.01"/>',
  more: '<circle cx="12" cy="12" r="9"/><path d="M8 12h.01"/><path d="M12 12h.01"/><path d="M16 12h.01"/>',
  wifi: '<path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.86a10 10 0 0 1 14 0"/><path d="M8.5 16.43a5 5 0 0 1 7 0"/>',
  battery: '<rect x="2" y="7" width="16" height="10" rx="2"/><path d="M22 11v2"/>'
};

function icon(name, size, color, strokeWidth = 2.2) {
  const body = ICONS[name].replace(/<(\w+)([^>]*?)\s*\/>/g, "<$1$2></$1>");
  return `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" style="display: block; flex-shrink: 0;">${body}</svg>`;
}

const K = {
  font: "Nunito, 'Segoe UI', system-ui, sans-serif",
  head: "Fredoka, 'Arial Rounded MT Bold', 'Trebuchet MS', system-ui, sans-serif",
  href: "https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&amp;family=Nunito:wght@600;700;800;900&amp;display=swap",
  bg: "#fff7e8",
  ink: "#1d1a33",
  muted: "#625d78",
  dash: "#ecdcbc",
  track: "#f3e8d2",
  accent: "#2b63e0",
  accentSoft: "#dde8ff",
  coin: "#ffc83d",
  coinSoft: "#fff0c2",
  income: "#137a50",
  watchText: "#8a5a00",
  over: "#ff6b5b",
  overSoft: "#ffe1dc",
  overText: "#c62828",
  mascot: "#74aaff",
  line: "2.5px solid #1d1a33",
  lineThin: "2px solid #1d1a33",
  lineHair: "1.5px solid #1d1a33",
  shadowSm: "2px 2px 0 #1d1a33",
  shadow: "3px 3px 0 #1d1a33",
  shadowLg: "4px 4px 0 #1d1a33",
  wall: "#34405c",
  wallBlob: "#3d4b6b",
  wallBlob2: "#2d3852"
};

const CAT = {
  Makanan: { icon: "utensils", bg: "#ffe3bd", fg: "#b45309" },
  Transportasi: { icon: "car", bg: "#d6e4ff", fg: "#2b63e0" },
  Belanja: { icon: "bag", bg: "#ffd6e6", fg: "#be185d" },
  Tagihan: { icon: "receipt", bg: "#ccf1ea", fg: "#0f766e" },
  Gaji: { icon: "banknote", bg: "#d4f5e0", fg: "#15803d" },
  Lainnya: { icon: "more", bg: "#ebe8f2", fg: "#4b4666" }
};

const truncate = "white-space: nowrap; overflow: hidden; text-overflow: ellipsis;";

// Saku, the pocket mascot holding a coin. Same drawing as components/saku/saku-mascot.tsx.
function mascot(size, mood = "happy", extraClass = "") {
  const eyeRy = mood === "wow" ? 12.5 : 11;
  const pupilDy = mood === "worried" ? 4 : 2;
  const eye = (cx) =>
    `<ellipse cx="${cx}" cy="74" rx="9.5" ry="${eyeRy}" fill="#ffffff" stroke="${K.ink}" stroke-width="3"></ellipse>` +
    `<circle cx="${cx + (mood === "wow" ? 0 : 2)}" cy="${74 + pupilDy}" r="5.2" fill="${K.ink}"></circle>` +
    `<circle cx="${cx + (mood === "wow" ? 2 : 4)}" cy="${71 + pupilDy}" r="1.9" fill="#ffffff"></circle>`;
  const mouth = {
    happy: `<path d="M49 93 Q60 105 71 93" fill="none" stroke="${K.ink}" stroke-width="4.2" stroke-linecap="round"></path>`,
    wow: `<ellipse cx="60" cy="98" rx="6.5" ry="8" fill="${K.ink}"></ellipse><ellipse cx="60" cy="101" rx="3.5" ry="3" fill="#ff8fa3"></ellipse>`,
    worried: `<path d="M48 99 Q54 93 60 99 Q66 105 72 99" fill="none" stroke="${K.ink}" stroke-width="4" stroke-linecap="round"></path>`
  }[mood];
  const extras =
    mood === "worried"
      ? `<path d="M34 58 L50 63" stroke="${K.ink}" stroke-width="3.5" stroke-linecap="round"></path><path d="M86 58 L70 63" stroke="${K.ink}" stroke-width="3.5" stroke-linecap="round"></path><path d="M107 48 Q114 60 107 65 Q100 60 107 48 Z" fill="#8fd3ff" stroke="${K.ink}" stroke-width="2.5"></path>`
      : mood === "wow"
        ? `<path d="M104 16 l4 -8" stroke="${K.ink}" stroke-width="3" stroke-linecap="round"></path><path d="M110 24 l8 -3" stroke="${K.ink}" stroke-width="3" stroke-linecap="round"></path>`
        : "";
  return `<svg aria-hidden="true" class="${extraClass}" width="${size}" height="${size}" viewBox="0 0 120 120" style="display: block; flex-shrink: 0; overflow: visible;">
      <circle cx="80" cy="30" r="17" fill="${K.coin}" stroke="${K.ink}" stroke-width="4"></circle>
      <circle cx="80" cy="30" r="8.5" fill="none" stroke="${K.ink}" stroke-width="2.4" opacity="0.5"></circle>
      <path d="M16 44 Q16 36 24 36 H96 Q104 36 104 44 V76 Q104 106 60 114 Q16 106 16 76 Z" fill="${K.mascot}" stroke="${K.ink}" stroke-width="4" stroke-linejoin="round"></path>
      <path d="M26 50 Q60 60 94 50" fill="none" stroke="#ffffff" stroke-width="3" stroke-dasharray="6 6" stroke-linecap="round" opacity="0.8"></path>
      ${eye(43)}
      ${eye(73)}
      ${mouth}
      <ellipse cx="30" cy="92" rx="6.5" ry="3.8" fill="#ff9fb2"></ellipse>
      <ellipse cx="90" cy="92" rx="6.5" ry="3.8" fill="#ff9fb2"></ellipse>
      ${extras}
    </svg>`;
}

// Launcher icon: Saku centred on a round plate (adaptive icon, circle mask).
function appIcon(size, plate = K.coin, { ring = true } = {}) {
  const inner = Math.round(size * 0.74);
  return `<div style="display: flex; align-items: center; justify-content: center; width: ${size}px; height: ${size}px; border-radius: 9999px; background: ${plate}; ${ring ? `border: ${Math.max(2, Math.round(size / 40))}px solid ${K.ink};` : ""} overflow: hidden; flex-shrink: 0;">
      <div style="margin-top: ${Math.round(size * 0.04)}px;">${mascot(inner)}</div>
    </div>`;
}

function sparkle(size, color, extraStyle) {
  return `<svg aria-hidden="true" class="saku-twinkle" width="${size}" height="${size}" viewBox="0 0 24 24" style="position: absolute; ${extraStyle}"><path d="M12 1 C13 8 16 11 23 12 C16 13 13 16 12 23 C11 16 8 13 1 12 C8 11 11 8 12 1 Z" fill="${color}"></path></svg>`;
}

function doc(title, body, { script = null, props = "{}" } = {}) {
  const logic =
    script ??
    `class Component extends DCLogic {
  renderVals() {
    return {};
  }
}`;
  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<title>${title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="${K.href}">
<style>
body { margin: 0; background: ${K.bg}; font-family: ${K.font}; color: ${K.ink}; }
* { box-sizing: border-box; }
p, h1, h2, h3 { margin: 0; }
a { color: ${K.accent}; text-decoration: none; }
a:hover { color: ${K.ink}; }
input::placeholder { color: ${K.muted}; }
button { font-family: inherit; }
@keyframes saku-bob { 0%, 100% { transform: translateY(0) rotate(-3deg); } 50% { transform: translateY(-4px) rotate(3deg); } }
@keyframes saku-pop { 0% { transform: scale(0.4); opacity: 0; } 70% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); } }
@keyframes saku-twinkle { 0%, 100% { opacity: 0.35; transform: scale(0.75); } 50% { opacity: 1; transform: scale(1.1); } }
@keyframes saku-rise { from { transform: translateY(28px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes saku-dot { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-8px); } }
.saku-bob { animation: saku-bob 2.6s ease-in-out infinite; transform-origin: 50% 90%; }
.saku-pop { display: inline-block; animation: saku-pop 0.5s cubic-bezier(0.2, 1.5, 0.4, 1) both; }
.saku-twinkle { animation: saku-twinkle 2.2s ease-in-out infinite; }
.saku-rise { animation: saku-rise 0.35s cubic-bezier(0.2, 1.3, 0.4, 1) both; }
.saku-dot { animation: saku-dot 1.1s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .saku-bob, .saku-pop, .saku-twinkle, .saku-rise, .saku-dot { animation: none; }
}
</style>
</helmet>
${body}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='${props}'>
${logic}
</script>
</body>
</html>
`;
}

function withPreview(w, h) {
  return JSON.stringify({ $preview: { width: w, height: h } });
}

// ---------- phone pieces ----------

function statusBar(color = "#ffffff", time = "10.12") {
  return `<div style="position: absolute; left: 0; right: 0; top: 0; height: 32px; display: flex; align-items: center; justify-content: space-between; padding: 0 22px; font-family: ${K.font}; font-size: 13px; font-weight: 800; color: ${color};">
    <span>${time}</span>
    <span style="display: flex; align-items: center; gap: 6px;">${icon("wifi", 15, color, 2.4)}${icon("battery", 17, color, 2.2)}</span>
  </div>`;
}

function wallpaper() {
  return `<div style="position: absolute; inset: 0; background: ${K.wall};"></div>
  <div style="position: absolute; left: -90px; top: 120px; width: 300px; height: 300px; border-radius: 9999px; background: ${K.wallBlob};"></div>
  <div style="position: absolute; right: -120px; top: 470px; width: 340px; height: 340px; border-radius: 9999px; background: ${K.wallBlob2};"></div>`;
}

function otherApp(name, iconName, tint) {
  return `<div style="display: flex; flex-direction: column; align-items: center; gap: 6px; width: 76px;">
      <div style="display: flex; align-items: center; justify-content: center; width: 58px; height: 58px; border-radius: 9999px; background: ${tint};">${icon(iconName, 26, "#ffffff", 2)}</div>
      <span style="font-size: 12px; font-weight: 700; color: #ffffff; ${truncate} max-width: 76px;">${name}</span>
    </div>`;
}

function sakuinApp() {
  return `<div style="display: flex; flex-direction: column; align-items: center; gap: 6px; width: 76px;">
      ${appIcon(58)}
      <span style="font-size: 12px; font-weight: 800; color: #ffffff;">Sakuin</span>
    </div>`;
}

function homeScreen(inner, { dim = false } = {}) {
  return `<div style="position: relative; width: 390px; height: 844px; overflow: hidden; font-family: ${K.font}; color: ${K.ink}; font-variant-numeric: tabular-nums;">
${wallpaper()}
${statusBar()}
${inner}
${dim ? `<div style="position: absolute; inset: 0; background: rgba(29, 26, 51, 0.55);"></div>` : ""}
</div>`;
}

function dock() {
  return `<div style="position: absolute; left: 16px; right: 16px; bottom: 26px; display: flex; justify-content: space-between; padding: 0 4px;">
    ${otherApp("Telepon", "phone", "#4f8a6b")}
    ${otherApp("Pesan", "message", "#4a74b5")}
    ${otherApp("Browser", "globe", "#b8664a")}
    ${otherApp("Kamera", "camera", "#5c5a72")}
  </div>`;
}

// ---------- widget ----------

function bar(percent, fill, height = 12, { grow = true } = {}) {
  return `<div style="position: relative; ${grow ? "flex: 1;" : "width: 100%;"} min-width: 0; height: ${height}px; flex-shrink: 0; border-radius: 9999px; background: ${K.track}; border: ${K.lineHair}; overflow: hidden;">
      <div style="position: absolute; left: 0; top: 0; bottom: 0; width: ${Math.min(100, percent)}%; background: ${fill}; border-right: ${percent >= 100 ? "0" : K.lineHair};"></div>
    </div>`;
}

function catDot(name, size = 26) {
  const cat = CAT[name];
  return `<div style="display: flex; align-items: center; justify-content: center; width: ${size}px; height: ${size}px; border-radius: 9999px; background: ${cat.bg}; border: ${K.lineHair}; flex-shrink: 0;">${icon(cat.icon, Math.round(size * 0.5), cat.fg, 2.4)}</div>`;
}

function catatButton({ wide = false, height = 46 } = {}) {
  return `<button type="button" aria-label="Catat transaksi" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; ${wide ? "width: 100%;" : ""} min-height: ${height}px; padding: 0 16px; border-radius: 9999px; background: ${K.coin}; border: ${K.lineThin}; box-shadow: ${K.shadowSm}; font-family: ${K.head}; font-size: 17px; font-weight: 600; color: ${K.ink}; cursor: pointer;">${icon("plus", 18, K.ink, 3)}Catat</button>`;
}

const WATCH = { tone: "watch", fill: K.coin, label: "Makanan 86% dari batas", mood: "wow", percent: 86 };
const SAFE = { tone: "safe", fill: K.accent, label: "Makanan baru 42% dari batas", mood: "happy", percent: 42 };
const OVER = { tone: "over", fill: K.over, label: "Belanja lewat batas", mood: "worried", percent: 100 };

function widgetShell(w, h, inner) {
  return `<div style="position: relative; width: ${w}px; height: ${h}px; border-radius: 26px; background: ${K.bg}; border: ${K.line}; box-shadow: ${K.shadowLg}; overflow: hidden; font-family: ${K.font}; color: ${K.ink}; font-variant-numeric: tabular-nums;">
${inner}
</div>`;
}

function budgetLine(state, { compact = false } = {}) {
  const color = state.tone === "over" ? K.overText : state.tone === "watch" ? K.watchText : K.muted;
  return `<div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
      ${catDot(state.tone === "over" ? "Belanja" : "Makanan", compact ? 22 : 24)}
      <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px;">
        <span style="font-size: 12px; font-weight: 900; color: ${color}; ${truncate}">${state.label}</span>
        ${bar(state.percent, state.fill, compact ? 9 : 11, { grow: false })}
      </div>
    </div>`;
}

function widgetMedium(state = WATCH, { w = 358, h = 164 } = {}) {
  return widgetShell(
    w,
    h,
    `<div style="position: absolute; right: 12px; top: 10px;">${mascot(58, state.mood)}</div>
  <div style="display: flex; flex-direction: column; height: 100%; padding: 12px 14px 12px 16px;">
    <p style="font-size: 12px; font-weight: 900; color: ${K.muted};">Keluar hari ini</p>
    <p style="font-family: ${K.head}; font-size: 30px; font-weight: 600; line-height: 1.1;">43.000</p>
    <p style="margin-top: 2px; font-size: 13px; font-weight: 800;">Sisa bulan ini <span style="font-family: ${K.head}; font-weight: 600;">1.240.500</span></p>
    <div style="margin-top: auto; display: flex; align-items: flex-end; gap: 12px;">
      <div style="flex: 1; min-width: 0;">${budgetLine(state, { compact: true })}</div>
      ${catatButton({ height: 44 })}
    </div>
  </div>`
  );
}

function widgetLarge(state = WATCH, { w = 358, h = 268 } = {}) {
  return widgetShell(
    w,
    h,
    `<div style="display: flex; flex-direction: column; height: 100%; padding: 12px 14px 14px 16px;">
    <div style="display: flex; align-items: center; gap: 8px;">
      <p style="font-family: ${K.head}; font-size: 18px; font-weight: 600;">September</p>
      <span style="font-size: 11px; font-weight: 800; color: ${K.muted};">diperbarui 10.12</span>
      <button type="button" aria-label="Perbarui widget" style="margin-left: auto; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 9999px; background: #ffffff; border: ${K.lineHair}; cursor: pointer;">${icon("refresh", 15, K.ink, 2.5)}</button>
    </div>
    <div style="margin-top: 6px; display: flex; align-items: center; gap: 10px;">
      <div class="saku-bob">${mascot(66, state.mood)}</div>
      <div style="flex: 1; min-width: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px;">
        <div style="min-width: 0;">
          <p style="font-size: 12px; font-weight: 900; color: ${K.muted};">Keluar hari ini</p>
          <p style="font-family: ${K.head}; font-size: 24px; font-weight: 600; line-height: 1.15; ${truncate}">43.000</p>
        </div>
        <div style="min-width: 0;">
          <p style="font-size: 12px; font-weight: 900; color: ${K.muted};">Sisa bulan ini</p>
          <p style="font-family: ${K.head}; font-size: 24px; font-weight: 600; line-height: 1.15; ${truncate}">1.240.500</p>
        </div>
      </div>
    </div>
    <div style="margin-top: 10px; padding: 10px 12px; border-radius: 18px; background: #ffffff; border: ${K.lineThin};">
      ${budgetLine(state)}
    </div>
    <p style="margin-top: 8px; font-size: 12px; font-weight: 800; color: ${K.muted}; ${truncate}">Terakhir: Kopi susu −18.000</p>
    <div style="margin-top: auto;">${catatButton({ wide: true, height: 46 })}</div>
  </div>`
  );
}

function widgetSignedOut({ w = 358, h = 164 } = {}) {
  return widgetShell(
    w,
    h,
    `<div style="display: flex; align-items: center; gap: 14px; height: 100%; padding: 14px 16px;">
    ${mascot(72, "wow")}
    <div style="flex: 1; min-width: 0;">
      <p style="font-family: ${K.head}; font-size: 19px; font-weight: 600; line-height: 1.2;">Masuk dulu, ya</p>
      <p style="margin-top: 2px; font-size: 13px; font-weight: 700; color: ${K.muted};">Widget tampil setelah kamu masuk di aplikasi.</p>
      <button type="button" style="margin-top: 10px; display: inline-flex; align-items: center; min-height: 44px; padding: 0 16px; border-radius: 9999px; background: ${K.coin}; border: ${K.lineThin}; box-shadow: ${K.shadowSm}; font-family: ${K.head}; font-size: 16px; font-weight: 600; color: ${K.ink}; cursor: pointer;">Buka Sakuin</button>
    </div>
  </div>`
  );
}

// ---------- quick-entry window ----------

function keyboard(height = 290) {
  const keyRow = (keys, pad = 0) =>
    `<div style="display: flex; gap: 6px; padding: 0 ${pad}px;">${keys
      .split("")
      .map((k) => `<div style="flex: 1; height: 42px; border-radius: 8px; background: #4a4d5c; display: flex; align-items: center; justify-content: center; font-size: 17px; font-weight: 700; color: #ffffff;">${k}</div>`)
      .join("")}</div>`;
  return `<div style="position: absolute; left: 0; right: 0; bottom: 0; height: ${height}px; background: #2b2d38; padding: 12px 6px 0; display: flex; flex-direction: column; gap: 10px;">
    ${keyRow("qwertyuiop")}
    ${keyRow("asdfghjkl", 16)}
    ${keyRow("zxcvbnm", 44)}
    <div style="display: flex; gap: 6px;">
      <div style="width: 84px; height: 42px; border-radius: 8px; background: #3a3c48; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; color: #ffffff;">?123</div>
      <div style="flex: 1; height: 42px; border-radius: 8px; background: #4a4d5c;"></div>
      <div style="width: 84px; height: 42px; border-radius: 8px; background: ${K.coin}; display: flex; align-items: center; justify-content: center;">${icon("check", 20, K.ink, 3)}</div>
    </div>
  </div>`;
}

function quickField({ text = "", caret = true, placeholder = "Catat… misal kopi 18rb" } = {}) {
  const content = text
    ? `<span style="flex: 1; min-width: 0; font-size: 16px; font-weight: 800; ${truncate}">${text}${caret ? `<span style="display: inline-block; width: 2px; height: 19px; margin-left: 1px; vertical-align: -3px; background: ${K.accent};"></span>` : ""}</span>`
    : `<span style="flex: 1; min-width: 0; font-size: 16px; font-weight: 700; color: ${K.muted}; ${truncate}">${placeholder}</span>`;
  const save = text
    ? `<span style="flex-shrink: 0; display: inline-flex; align-items: center; min-height: 42px; padding: 0 14px; border-radius: 9999px; background: ${K.coin}; border: ${K.lineThin}; box-shadow: ${K.shadowSm}; font-family: ${K.head}; font-size: 15px; font-weight: 600;">Simpan</span>`
    : "";
  return `<div style="display: flex; align-items: center; gap: 10px; height: 58px; padding: 0 7px 0 6px; background: #ffffff; border: ${K.line}; border-radius: 9999px; box-shadow: ${K.shadow};">
      <div style="display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 9999px; background: ${K.coinSoft}; border: ${K.lineThin}; overflow: hidden; flex-shrink: 0;"><div style="margin-top: 6px;">${mascot(40)}</div></div>
      ${content}
      ${save}
    </div>`;
}

function savedRow({ name, category, amount, income = false, fresh = true }) {
  return `<div class="${fresh ? "saku-rise" : ""}" style="display: flex; align-items: center; gap: 10px; min-height: 56px; padding: 6px 8px 6px 10px; border-radius: 18px; background: ${fresh ? K.coinSoft : "#ffffff"}; border: ${K.lineThin};">
      ${catDot(category, 34)}
      <div style="flex: 1; min-width: 0;">
        <div style="display: flex; align-items: center; gap: 6px; min-width: 0;">
          <span style="font-size: 15px; font-weight: 900; ${truncate}">${name}</span>
          ${fresh ? `<span class="saku-pop" style="flex-shrink: 0; border-radius: 9999px; padding: 0 7px; background: ${K.coin}; border: ${K.lineHair}; font-family: ${K.head}; font-size: 11px; font-weight: 600;">Baru!</span>` : ""}
        </div>
        <span style="font-size: 12px; font-weight: 800; color: ${K.muted};">${category} · Hari ini</span>
      </div>
      <span style="flex-shrink: 0; font-family: ${K.head}; font-size: 17px; font-weight: 600; color: ${income ? K.income : K.ink};">${income ? "+" : "−"}${amount}</span>
      <a href="#" style="flex-shrink: 0; display: inline-flex; align-items: center; min-height: 44px; padding: 0 8px; font-size: 13px; font-weight: 900;">Ubah</a>
    </div>`;
}

function quickSheet(inner) {
  return `<div class="saku-rise" style="position: absolute; left: 8px; right: 8px; bottom: 298px; padding: 14px 14px 12px; background: ${K.bg}; border: ${K.line}; border-radius: 28px; box-shadow: ${K.shadowLg}; font-family: ${K.font}; color: ${K.ink};">
  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
    <p style="flex: 1; font-family: ${K.head}; font-size: 20px; font-weight: 600;">Catat cepat</p>
    <button type="button" aria-label="Tutup" style="display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 9999px; background: #ffffff; border: ${K.lineThin}; cursor: pointer;">${icon("x", 18, K.ink, 2.8)}</button>
  </div>
  ${inner}
</div>`;
}

function homeWithWidgets() {
  return `<div style="position: absolute; left: 16px; top: 64px;">${widgetMedium()}</div>
  <div style="position: absolute; left: 16px; top: 262px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px 12px; width: 358px; justify-items: center;">
    ${otherApp("Galeri", "image", "#8a5fb0")}
    ${otherApp("Kalender", "calendar", "#c9564b")}
    ${otherApp("Jam", "clock", "#4f6d8f")}
    ${otherApp("Peta", "map", "#3f8f7a")}
  </div>`;
}

// ---------- notifications ----------

function notifCard({ time, title, body, mood, actions = [] }) {
  return `<div style="padding: 14px 14px 10px 16px; border-radius: 26px; background: #f4f1f8;">
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; align-items: center; gap: 7px;">
            <div style="display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 9999px; background: ${K.accent};">
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 120 120" style="display: block;"><path d="M16 44 Q16 36 24 36 H96 Q104 36 104 44 V76 Q104 106 60 114 Q16 106 16 76 Z" fill="#ffffff"></path><circle cx="80" cy="22" r="14" fill="#ffffff"></circle></svg>
            </div>
            <span style="font-family: Roboto, 'Segoe UI', system-ui, sans-serif; font-size: 12px; font-weight: 500; color: #4a4458;">Sakuin · ${time}</span>
          </div>
          <p style="margin-top: 6px; font-family: Roboto, 'Segoe UI', system-ui, sans-serif; font-size: 15px; font-weight: 700; color: #1d1b20;">${title}</p>
          <p style="margin-top: 2px; font-family: Roboto, 'Segoe UI', system-ui, sans-serif; font-size: 14px; font-weight: 400; line-height: 1.35; color: #49454f;">${body}</p>
        </div>
        <div style="display: flex; align-items: flex-end; justify-content: center; width: 46px; height: 46px; border-radius: 14px; background: ${K.coinSoft}; overflow: hidden; flex-shrink: 0;"><div style="margin-bottom: -4px;">${mascot(42, mood)}</div></div>
      </div>
      ${
        actions.length
          ? `<div style="display: flex; gap: 4px; margin-top: 6px; margin-left: -6px;">${actions
              .map(
                (label) =>
                  `<button type="button" style="min-height: 40px; padding: 0 10px; border: 0; border-radius: 9999px; background: transparent; font-family: Roboto, 'Segoe UI', system-ui, sans-serif; font-size: 14px; font-weight: 600; color: ${K.accent}; cursor: pointer;">${label}</button>`
              )
              .join("")}</div>`
          : ""
      }
    </div>`;
}

// ---------- Pengingat page (same screen + 3 switches) ----------

function stickerSwitch(on) {
  return `<span style="position: relative; display: inline-block; width: 52px; height: 32px; border-radius: 9999px; background: ${on ? K.accent : K.track}; border: ${K.lineThin}; flex-shrink: 0;">
      <span style="position: absolute; top: 3px; left: ${on ? 23 : 3}px; width: 22px; height: 22px; border-radius: 9999px; background: #ffffff; border: ${K.lineThin};"></span>
    </span>`;
}

function switchRow({ iconName, title, detail, on = true, last = false, fresh = false }) {
  return `<div style="display: flex; align-items: center; gap: 12px; padding: 12px 14px; ${last ? "" : `border-bottom: 2px dashed ${K.dash};`} ${fresh ? `background: ${K.coinSoft};` : ""}">
      <span style="display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 9999px; background: #ffffff; border: ${K.lineThin}; flex-shrink: 0;">${icon(iconName, 18, K.ink, 2.4)}</span>
      <div style="flex: 1; min-width: 0;">
        <p style="font-size: 15px; font-weight: 900;">${title}</p>
        <p style="font-size: 12px; font-weight: 700; color: ${K.muted};">${detail}</p>
      </div>
      ${stickerSwitch(on)}
    </div>`;
}

function card(inner, extra = "") {
  return `<div style="background: #ffffff; border: ${K.line}; border-radius: 22px; box-shadow: ${K.shadow}; overflow: hidden; ${extra}">${inner}</div>`;
}

function fieldLabel(text, extra = "") {
  return `<p style="margin: 20px 4px 6px; font-size: 12px; font-weight: 900; letter-spacing: 0.05em; text-transform: uppercase; color: ${K.muted}; ${extra}">${text}</p>`;
}

function pengingat() {
  return `<div style="position: relative; width: 390px; height: 900px; overflow: hidden; background: ${K.bg}; font-family: ${K.font}; color: ${K.ink};">
  <div style="padding: 20px 16px 0;">
    <div style="display: flex; align-items: center; gap: 10px;">
      <button type="button" aria-label="Kembali" style="display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 9999px; background: #ffffff; border: ${K.lineThin}; box-shadow: ${K.shadowSm}; cursor: pointer;">${icon("chevronLeft", 20, K.ink, 2.8)}</button>
      <h1 style="font-family: ${K.head}; font-size: 24px; font-weight: 600;">Pengingat</h1>
    </div>

    ${card(`<div style="display: flex; align-items: center; gap: 12px; padding: 12px 14px;">
      <span style="display: flex; align-items: center; justify-content: center; width: 42px; height: 42px; border-radius: 9999px; background: ${K.coinSoft}; border: ${K.lineThin}; flex-shrink: 0;">${icon("bell", 20, K.ink, 2.3)}</span>
      <div style="flex: 1; min-width: 0;">
        <p style="font-size: 16px; font-weight: 900;">Ingatkan aku mencatat</p>
        <p style="font-size: 12px; font-weight: 700; color: ${K.muted};">Lewat notifikasi HP</p>
      </div>
      ${stickerSwitch(true)}
    </div>`, "margin-top: 14px;")}

    ${fieldLabel("Kapan diingatkan?")}
    ${card(`<div style="display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-bottom: 2px dashed ${K.dash};">
        ${icon("moon", 18, K.ink, 2.4)}
        <p style="flex: 1; font-size: 15px; font-weight: 900;">Setiap malam</p>
        <p style="font-family: ${K.head}; font-size: 20px; font-weight: 600;">20.00</p>
      </div>
      <div style="display: flex; align-items: center; gap: 12px; padding: 12px 14px;">
        ${icon("checkCircle", 20, K.income, 2.4)}
        <p style="font-size: 13px; font-weight: 800;">Tidak mengingatkan kalau hari ini sudah ada catatan</p>
      </div>`)}
    <p style="margin-top: 6px; padding: 0 4px; font-size: 12px; font-weight: 700; color: ${K.muted};">Paling banyak sekali sehari, biar tidak mengganggu.</p>

    <div style="position: relative;">
      ${fieldLabel("Kabar lain dari Saku")}
      <span class="saku-pop" style="position: absolute; right: 4px; top: 16px; border-radius: 9999px; padding: 1px 9px; background: ${K.coin}; border: ${K.lineHair}; font-family: ${K.head}; font-size: 12px; font-weight: 600;">Baru!</span>
    </div>
    ${card(
      switchRow({ iconName: "pie", title: "Batas kategori", detail: "Saat sudah 80% dan saat habis" }) +
        switchRow({ iconName: "repeat", title: "Tagihan besok", detail: "Sehari sebelum transaksi berulang, jam 09.00" }) +
        switchRow({ iconName: "calendar", title: "Ringkasan mingguan", detail: "Setiap Minggu jam 19.00", last: true })
    )}

    ${fieldLabel("Contoh notifikasi")}
    <div style="display: flex; gap: 10px; padding: 12px; border-radius: 20px; background: #ffffff; border: ${K.lineThin}; box-shadow: 0 8px 24px rgba(29, 26, 51, 0.12);">
      <span style="display: flex; align-items: flex-end; justify-content: center; width: 40px; height: 40px; border-radius: 12px; background: ${K.coinSoft}; border: ${K.lineHair}; overflow: hidden; flex-shrink: 0;">${mascot(36)}</span>
      <div style="min-width: 0;">
        <p style="font-size: 12px; font-weight: 800; color: ${K.muted};">Sakuin · 20.00</p>
        <p style="font-size: 14px; font-weight: 900;">Hari ini ada jajan yang belum dicatat?</p>
        <p style="font-size: 13px; font-weight: 700; color: ${K.muted};">Ketuk untuk catat sebentar, cuma 3 detik.</p>
      </div>
    </div>
    <button type="button" style="margin-top: 16px; width: 100%; min-height: 48px; border-radius: 9999px; background: #ffffff; border: ${K.lineThin}; box-shadow: ${K.shadowSm}; font-family: ${K.head}; font-size: 16px; font-weight: 600; color: ${K.ink}; cursor: pointer;">Kirim notifikasi tes sekarang</button>
  </div>
</div>`;
}

// ---------- artboards ----------

function ikonPilihan() {
  const option = (label, plate, note, recommended) => `<div style="display: flex; flex-direction: column; align-items: center; gap: 10px; width: 150px;">
      ${appIcon(118, plate)}
      <p style="font-family: ${K.head}; font-size: 18px; font-weight: 600;">${label}</p>
      <p style="font-size: 12px; font-weight: 800; color: ${K.muted}; text-align: center;">${note}</p>
      ${recommended ? `<span style="border-radius: 9999px; padding: 2px 10px; background: ${K.coin}; border: ${K.lineHair}; font-size: 12px; font-weight: 900; transform: rotate(-2deg);">Saran</span>` : ""}
    </div>`;
  return `<div style="position: relative; width: 640px; height: 300px; padding: 28px 32px; background: ${K.bg}; font-family: ${K.font}; color: ${K.ink};">
  <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;">
    ${option("A · Kuning", K.coin, "Paling mencolok di layar HP", true)}
    ${option("B · Biru", K.accent, "Warna utama Sakuin", false)}
    ${option("C · Krem", K.bg, "Paling kalem", false)}
    <div style="display: flex; flex-direction: column; align-items: center; gap: 10px; width: 110px; opacity: 0.75;">
      <div style="display: flex; align-items: center; justify-content: center; width: 86px; height: 86px; margin-top: 16px; border-radius: 9999px; background: #ffffff; border: 2px dashed ${K.muted};">
        <svg aria-hidden="true" width="54" height="54" viewBox="0 0 60 60"><path d="M40 10 C24 6 12 14 16 24 C20 34 44 28 44 40 C44 50 30 54 18 50" fill="none" stroke="#2f6fe0" stroke-width="9" stroke-linecap="round"></path><circle cx="36" cy="22" r="7" fill="${K.coin}"></circle></svg>
      </div>
      <p style="font-size: 14px; font-weight: 900; color: ${K.muted};">Ikon lama</p>
    </div>
  </div>
</div>`;
}

function ikonLayarUtama() {
  return homeScreen(`<div style="position: absolute; left: 16px; top: 72px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 22px 12px; width: 358px; justify-items: center;">
    ${otherApp("Galeri", "image", "#8a5fb0")}
    ${otherApp("Kalender", "calendar", "#c9564b")}
    ${otherApp("Jam", "clock", "#4f6d8f")}
    ${otherApp("Peta", "map", "#3f8f7a")}
    ${otherApp("Musik", "music", "#b0782f")}
    ${sakuinApp()}
    ${otherApp("Kamera", "camera", "#5c5a72")}
    ${otherApp("Browser", "globe", "#b8664a")}
  </div>
  ${dock()}`);
}

function layarPembuka() {
  return `<div style="position: relative; width: 390px; height: 844px; overflow: hidden; background: ${K.bg};">
  ${statusBar(K.ink, "10.12")}
  <div style="position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);">${appIcon(160)}</div>
</div>`;
}

function memuat() {
  return `<div style="position: relative; width: 390px; height: 844px; overflow: hidden; background: ${K.bg}; font-family: ${K.font}; color: ${K.ink};">
  ${statusBar(K.ink, "10.12")}
  ${sparkle(16, K.coin, "left: 108px; top: 318px;")}
  ${sparkle(12, K.accent, "right: 110px; top: 340px; animation-delay: 0.8s;")}
  ${sparkle(14, K.coin, "right: 126px; top: 492px; animation-delay: 1.4s;")}
  <div style="position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);">
    <div class="saku-bob">${appIcon(160)}</div>
  </div>
  <div style="position: absolute; left: 0; right: 0; top: 530px; display: flex; flex-direction: column; align-items: center; gap: 6px;">
    <p style="font-family: ${K.head}; font-size: 30px; font-weight: 600;">Sakuin</p>
    <p style="font-size: 14px; font-weight: 800; color: ${K.muted};">Menyiapkan catatanmu…</p>
    <div role="status" aria-label="Memuat" style="margin-top: 10px; display: flex; gap: 8px;">
      <span class="saku-dot" style="width: 12px; height: 12px; border-radius: 9999px; background: ${K.coin}; border: ${K.lineHair};"></span>
      <span class="saku-dot" style="width: 12px; height: 12px; border-radius: 9999px; background: ${K.coin}; border: ${K.lineHair}; animation-delay: 0.15s;"></span>
      <span class="saku-dot" style="width: 12px; height: 12px; border-radius: 9999px; background: ${K.coin}; border: ${K.lineHair}; animation-delay: 0.3s;"></span>
    </div>
  </div>
</div>`;
}

function widgetLayarUtama() {
  return homeScreen(`<div style="position: absolute; left: 16px; top: 64px;">${widgetMedium()}</div>
  <div style="position: absolute; left: 16px; top: 262px;">${widgetLarge()}</div>
  <div style="position: absolute; left: 16px; top: 560px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px 12px; width: 358px; justify-items: center;">
    ${otherApp("Galeri", "image", "#8a5fb0")}
    ${otherApp("Kalender", "calendar", "#c9564b")}
    ${otherApp("Jam", "clock", "#4f6d8f")}
    ${sakuinApp()}
  </div>
  ${dock()}`);
}

function widgetKeadaan() {
  const label = (text) => `<p style="font-size: 13px; font-weight: 900; color: #ffffff;">${text}</p>`;
  return `<div style="position: relative; width: 390px; height: 700px; overflow: hidden; font-family: ${K.font};">
  ${wallpaper()}
  <div style="position: relative; display: flex; flex-direction: column; gap: 10px; padding: 22px 16px;">
    ${label("Masih aman")}
    ${widgetMedium(SAFE)}
    ${label("Lewat batas")}
    ${widgetMedium(OVER)}
    ${label("Belum masuk")}
    ${widgetSignedOut()}
  </div>
</div>`;
}

function catatCepatMengetik() {
  return homeScreen(
    `${homeWithWidgets()}
  ${dock()}`,
    { dim: true }
  ).replace(
    /<\/div>\s*$/,
    `${quickSheet(`${quickField({ text: "kopi susu 18rb" })}
  <p style="margin-top: 10px; padding: 0 6px; font-size: 12px; font-weight: 800; color: ${K.muted};">Tekan Enter untuk simpan. Kategorinya Saku tebak sendiri.</p>`)}
${keyboard()}
</div>`
  );
}

function catatCepatTersimpan() {
  return homeScreen(
    `${homeWithWidgets()}
  ${dock()}`,
    { dim: true }
  ).replace(
    /<\/div>\s*$/,
    `${quickSheet(`<div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px;">
    ${savedRow({ name: "Kopi susu", category: "Makanan", amount: "18.000" })}
    <div class="saku-rise" style="display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 16px; background: #ffffff; border: ${K.lineHair};">
      <span style="font-size: 12px; font-weight: 900; color: ${K.watchText}; white-space: nowrap;">Makanan 86% dari batas</span>
      ${bar(86, K.coin, 10)}
    </div>
  </div>
  ${quickField({ text: "", placeholder: "Catat lagi…" })}
  <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px; padding: 0 6px;">
    <span style="font-size: 12px; font-weight: 800; color: ${K.muted};">Hari ini keluar <span style="font-family: ${K.head}; font-weight: 600; color: ${K.ink};">61.000</span></span>
    <a href="#" style="display: inline-flex; align-items: center; gap: 2px; min-height: 44px; font-size: 13px; font-weight: 900;">Buka Sakuin${icon("chevronRight", 16, K.accent, 2.8)}</a>
  </div>`)}
${keyboard()}
</div>`
  );
}

function catatCepatCoba() {
  const body = homeScreen(
    `${homeWithWidgets()}
  ${dock()}`,
    { dim: true }
  ).replace(
    /<\/div>\s*$/,
    `<div style="position: absolute; left: 8px; right: 8px; bottom: 298px; padding: 14px 14px 12px; background: ${K.bg}; border: ${K.line}; border-radius: 28px; box-shadow: ${K.shadowLg}; font-family: ${K.font}; color: ${K.ink};">
  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
    <p style="flex: 1; font-family: ${K.head}; font-size: 20px; font-weight: 600;">Catat cepat</p>
    <button type="button" aria-label="Mulai ulang" onClick="{{ reset }}" style="display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 9999px; background: #ffffff; border: ${K.lineThin}; cursor: pointer;">${icon("x", 18, K.ink, 2.8)}</button>
  </div>
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <sc-for list="{{ rows }}" as="r" hint-placeholder-count="0">
      <div class="saku-rise" style="display: flex; align-items: center; gap: 10px; min-height: 56px; padding: 6px 12px 6px 10px; border-radius: 18px; background: {{ r.rowBg }}; border: ${K.lineThin};">
        <div style="display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 9999px; background: {{ r.dotBg }}; border: ${K.lineHair}; font-family: ${K.head}; font-size: 15px; font-weight: 600; color: {{ r.dotFg }}; flex-shrink: 0;">{{ r.initial }}</div>
        <div style="flex: 1; min-width: 0;">
          <p style="font-size: 15px; font-weight: 900; ${truncate}">{{ r.name }}</p>
          <p style="font-size: 12px; font-weight: 800; color: ${K.muted};">{{ r.category }} · Hari ini</p>
        </div>
        <span style="flex-shrink: 0; font-family: ${K.head}; font-size: 17px; font-weight: 600; color: {{ r.color }};">{{ r.amountLabel }}</span>
      </div>
    </sc-for>
    <sc-if value="{{ showBudget }}" hint-placeholder-val="{{ false }}">
      <div class="saku-rise" style="display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 16px; background: #ffffff; border: ${K.lineHair};">
        <span style="font-size: 12px; font-weight: 900; color: {{ budget.color }}; white-space: nowrap;">{{ budget.label }}</span>
        <div style="position: relative; flex: 1; min-width: 0; height: 10px; border-radius: 9999px; background: ${K.track}; border: ${K.lineHair}; overflow: hidden;">
          <div style="position: absolute; left: 0; top: 0; bottom: 0; width: {{ budget.width }}; background: {{ budget.fill }};"></div>
        </div>
      </div>
    </sc-if>
  </div>
  <div style="margin-top: 10px; display: flex; align-items: center; gap: 10px; height: 58px; padding: 0 7px 0 6px; background: #ffffff; border: ${K.line}; border-radius: 9999px; box-shadow: ${K.shadow};">
    <div style="display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 9999px; background: ${K.coinSoft}; border: ${K.lineThin}; overflow: hidden; flex-shrink: 0;"><div style="margin-top: 6px;">${mascot(40)}</div></div>
    <input value="{{ text }}" onChange="{{ onInput }}" onKeyDown="{{ onKey }}" placeholder="{{ placeholder }}" aria-label="Catat transaksi" style="flex: 1; min-width: 0; border: 0; outline: none; background: transparent; font-family: ${K.font}; font-size: 16px; font-weight: 800; color: ${K.ink};">
    <sc-if value="{{ canSave }}" hint-placeholder-val="{{ false }}">
      <button type="button" onClick="{{ save }}" style="flex-shrink: 0; display: inline-flex; align-items: center; min-height: 42px; padding: 0 14px; border-radius: 9999px; background: ${K.coin}; border: ${K.lineThin}; box-shadow: ${K.shadowSm}; font-family: ${K.head}; font-size: 15px; font-weight: 600; color: ${K.ink}; cursor: pointer;">Simpan</button>
    </sc-if>
  </div>
  <p style="margin-top: 8px; padding: 0 6px; font-size: 12px; font-weight: 800; color: ${K.muted};">Coba ketik, misal: <b>bakso 15rb</b>, <b>parkir 5rb</b>, <b>gaji 5jt</b>, lalu Enter.</p>
</div>
${keyboard()}
</div>`
  );

  const catData = {};
  for (const [name, cat] of Object.entries(CAT)) catData[name] = { bg: cat.bg, fg: cat.fg };

  const script = `var P_CAT = ${JSON.stringify(catData)};
var P_RULES = [
  ["Makanan", ["makan", "nasi", "kopi", "bakso", "mie", "jajan", "minum", "sarapan", "teh", "roti", "snack", "ayam", "martabak", "seblak"]],
  ["Transportasi", ["bensin", "parkir", "ojek", "gojek", "grab", "tol", "angkot", "kereta", "bus", "krl"]],
  ["Tagihan", ["listrik", "token", "pulsa", "wifi", "internet", "pdam", "kos", "cicilan"]],
  ["Belanja", ["belanja", "sabun", "sampo", "sayur", "baju", "shopee", "indomaret", "alfamart"]],
  ["Gaji", ["gaji", "honor", "freelance", "bonus"]]
];
var P_BUDGET = { Makanan: { spent: 412000, limit: 500000 }, Belanja: { spent: 470000, limit: 500000 } };

function pFmt(value) {
  return Math.round(value).toLocaleString("id-ID");
}

function pParse(text) {
  var raw = String(text || "").trim();
  if (!raw) return null;
  var match = raw.match(/(\\d+(?:[.,]\\d+)*)\\s*(rb|ribu|k|jt|juta)?/i);
  if (!match) return null;
  var digits = match[1];
  var unit = (match[2] || "").toLowerCase();
  var value;
  if (unit === "jt" || unit === "juta") value = parseFloat(digits.replace(/\\./g, "").replace(",", ".")) * 1000000;
  else if (unit) value = parseFloat(digits.replace(/\\./g, "").replace(",", ".")) * 1000;
  else {
    value = parseFloat(digits.replace(/[.,]/g, ""));
    if (value < 1000) value = value * 1000;
  }
  value = Math.round(value);
  if (!value) return null;
  var words = raw.replace(match[0], " ").replace(/\\s+/g, " ").trim();
  var lower = words.toLowerCase();
  var category = "Lainnya";
  for (var i = 0; i < P_RULES.length; i++) {
    var hit = P_RULES[i][1].some(function (w) { return lower.indexOf(w) !== -1; });
    if (hit) { category = P_RULES[i][0]; break; }
  }
  return { name: words ? words.charAt(0).toUpperCase() + words.slice(1) : category, category: category, amount: value, income: category === "Gaji" };
}

class Component extends DCLogic {
  s() {
    return Object.assign({ text: "", entries: [], spent: {} }, this.state || {});
  }

  save() {
    var state = this.s();
    var parsed = pParse(state.text);
    if (!parsed) return;
    var spent = Object.assign({}, state.spent);
    if (!parsed.income) spent[parsed.category] = (spent[parsed.category] || 0) + parsed.amount;
    this.setState({ text: "", entries: [parsed].concat(state.entries).slice(0, 2), spent: spent, last: parsed.category });
  }

  renderVals() {
    var self = this;
    var state = this.s();
    var rows = state.entries.map(function (e, index) {
      return {
        name: e.name,
        category: e.category,
        initial: e.category.charAt(0),
        dotBg: P_CAT[e.category].bg,
        dotFg: P_CAT[e.category].fg,
        rowBg: index === 0 ? "${K.coinSoft}" : "#ffffff",
        color: e.income ? "${K.income}" : "${K.ink}",
        amountLabel: (e.income ? "+" : "\\u2212") + pFmt(e.amount)
      };
    });
    var budget = null;
    var base = state.last ? P_BUDGET[state.last] : null;
    if (base) {
      var total = base.spent + (state.spent[state.last] || 0);
      var percent = Math.round((total / base.limit) * 100);
      if (percent >= 80) {
        var over = percent >= 100;
        budget = {
          label: over ? "Batas " + state.last + " habis" : state.last + " " + percent + "% dari batas",
          color: over ? "${K.overText}" : "${K.watchText}",
          fill: over ? "${K.over}" : "${K.coin}",
          width: Math.min(100, percent) + "%"
        };
      }
    }
    return {
      rows: rows,
      text: state.text,
      canSave: Boolean(pParse(state.text)),
      placeholder: rows.length ? "Catat lagi…" : "Catat… misal kopi 18rb",
      showBudget: Boolean(budget),
      budget: budget || {},
      onInput: function (event) { self.setState({ text: event.target.value }); },
      onKey: function (event) {
        if (event.key === "Enter") { event.preventDefault(); self.save(); }
      },
      save: function () { self.save(); },
      reset: function () { self.setState({ text: "", entries: [], spent: {}, last: null }); }
    };
  }
}`;
  return { body, script };
}

function notifikasi() {
  return `<div style="position: relative; width: 390px; height: 844px; overflow: hidden; font-family: Roboto, 'Segoe UI', system-ui, sans-serif;">
  ${wallpaper()}
  <div style="position: absolute; inset: 0; background: rgba(20, 18, 32, 0.72);"></div>
  ${statusBar("#ffffff", "19.00")}
  <div style="position: relative; padding: 44px 12px 0;">
    <p style="padding: 0 10px; font-size: 30px; font-weight: 400; color: #ffffff;">19.00</p>
    <p style="padding: 0 10px; font-size: 14px; font-weight: 500; color: #e6e0f0;">Minggu, 20 September</p>
    <div style="margin-top: 16px; display: flex; flex-direction: column; gap: 6px;">
      ${notifCard({
        time: "sekarang",
        title: "Makanan sudah 80% dari batas",
        body: "Sisa 100 rb untuk 10 hari lagi. Pelan-pelan jajannya, ya.",
        mood: "wow",
        actions: ["Lihat laporan"]
      })}
      ${notifCard({
        time: "12.40",
        title: "Batas Belanja sudah habis",
        body: "Bulan ini 512 rb dari batas 500 rb.",
        mood: "worried",
        actions: ["Lihat laporan"]
      })}
      ${notifCard({
        time: "09.00",
        title: "Besok: Bayar kos 750 rb",
        body: "Dari transaksi berulang. Besok Sakuin mencatatnya otomatis.",
        mood: "happy",
        actions: ["Lihat"]
      })}
      ${notifCard({
        time: "19.00",
        title: "Minggu ini keluar 820 rb",
        body: "Paling banyak buat Makanan: 310 rb. Ketuk untuk lihat laporan.",
        mood: "happy"
      })}
    </div>
  </div>
</div>`;
}

// ---------- write ----------

const boards = [];
function add(file, title, w, h, html, extra = {}) {
  writeFileSync(join(OUT, file), html);
  boards.push({ file, title, w, h, ...extra });
}

add("Main.dc.html", "1a · Ikon: pilih warna", 640, 300, doc("Pilihan ikon Sakuin", ikonPilihan(), { props: withPreview(640, 300) }));
add("IkonLayarUtama.dc.html", "1b · Ikon di layar HP", 390, 844, doc("Ikon Sakuin di layar utama", ikonLayarUtama(), { props: withPreview(390, 844) }));
add("LayarPembuka.dc.html", "1c · Saat aplikasi dibuka", 390, 844, doc("Layar pembuka", layarPembuka(), { props: withPreview(390, 844) }));
add("Memuat.dc.html", "1d · Lalu memuat", 390, 844, doc("Memuat Sakuin", memuat(), { props: withPreview(390, 844) }));

add("WidgetLayarUtama.dc.html", "2a · Widget sedang + besar", 390, 844, doc("Widget Sakuin", widgetLayarUtama(), { props: withPreview(390, 844) }));
add("WidgetKeadaan.dc.html", "2b · Widget: keadaan lain", 390, 700, doc("Keadaan widget", widgetKeadaan(), { props: withPreview(390, 700) }));
add("CatatCepatMengetik.dc.html", "2c · + Catat: mengetik", 390, 844, doc("Catat cepat, mengetik", catatCepatMengetik(), { props: withPreview(390, 844) }));
add("CatatCepatTersimpan.dc.html", "2d · + Catat: tersimpan", 390, 844, doc("Catat cepat, tersimpan", catatCepatTersimpan(), { props: withPreview(390, 844) }));
const coba = catatCepatCoba();
add("CatatCepatCoba.dc.html", "2e · Coba sendiri (bisa diketik)", 390, 844, doc("Coba catat cepat", coba.body, { script: coba.script, props: withPreview(390, 844) }), { is_interactive: true });

add("Notifikasi.dc.html", "3a · Contoh notifikasi", 390, 844, doc("Contoh notifikasi Sakuin", notifikasi(), { props: withPreview(390, 844) }));
add("PengingatBaru.dc.html", "3b · Pengingat (layar sama + 3 saklar)", 390, 900, doc("Pengingat", pengingat(), { props: withPreview(390, 900) }));

// Layout: three rows, one per part.
const rows = [
  ["Main.dc.html", "IkonLayarUtama.dc.html", "LayarPembuka.dc.html", "Memuat.dc.html"],
  ["WidgetLayarUtama.dc.html", "WidgetKeadaan.dc.html", "CatatCepatMengetik.dc.html", "CatatCepatTersimpan.dc.html", "CatatCepatCoba.dc.html"],
  ["Notifikasi.dc.html", "PengingatBaru.dc.html"]
];
const rowTitles = ["1 · Ikon & layar pembuka", "2 · Widget & catat cepat", "3 · Notifikasi baru"];
const index = { v: 3, createdOnFiles: { v: 1, at: new Date().toISOString().replace(/\.\d+Z$/, "Z") }, title: "Sakuin APK 2.1", launch: { view: "canvas" }, pages: [], boards: {}, order: [], notes: {}, designSystems: [] };
let y = 0;
rows.forEach((row, rowIndex) => {
  let x = 0;
  let rowH = 0;
  for (const file of row) {
    const b = boards.find((item) => item.file === file);
    const entry = { x, y, w: b.w, h: b.h, title: b.title };
    if (b.is_interactive) entry.is_interactive = true;
    index.boards[file] = entry;
    index.order.push(file);
    x += b.w + 80;
    rowH = Math.max(rowH, b.h);
  }
  index.notes[`row${rowIndex + 1}`] = { x: 0, y: y - 240, text: rowTitles[rowIndex], kind: "title1", maxW: x - 80 };
  y += rowH + 120 + 240;
});

writeFileSync(join(OUT, "canvas.json"), JSON.stringify(index, null, 2));
console.log(`wrote ${boards.length} artboards`);
