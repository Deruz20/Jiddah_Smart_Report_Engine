/**
 * Generates every favicon / app icon with the authentic school crest
 * scaled tightly to 89% of canvas height inside a crisp rounded square (22% radius)
 * on a solid high-contrast #FFFFFF background with a distinct 2px
 * Jiddah Forest Green (#0D5C3A) & Warm Gold (#D97706) border ring.
 *
 *   node scripts/generate-icons.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pub = path.join(root, "public");
const src = fs.readFileSync(path.join(root, "src/components/brand/JiddahLogo.tsx"), "utf8");
const WHITE = src.match(/const WHITE_PATH = "([^"]+)"/)[1];
const GREEN_P = src.match(/const GREEN_PATH = "([^"]+)"/)[1];
const VB_W = 528.11;
const VB_H = 618.5;

const FOREST_GREEN = "#0D5C3A";
const WARM_GOLD = "#D97706";

function buildSvg(badgeH = 456, weight = 2, isMaskable = false) {
  const w = (badgeH * VB_W) / VB_H;
  const x = (256 - w / 2).toFixed(2);
  const y = (256 - badgeH / 2).toFixed(2);

  if (isMaskable) {
    const maskableH = 340;
    const mw = (maskableH * VB_W) / VB_H;
    const mx = (256 - mw / 2).toFixed(2);
    const my = (256 - maskableH / 2).toFixed(2);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#FFFFFF" />
  <circle cx="256" cy="256" r="236" fill="none" stroke="${FOREST_GREEN}" stroke-width="16" />
  <circle cx="256" cy="256" r="222" fill="none" stroke="${WARM_GOLD}" stroke-width="10" />
  <svg x="${mx}" y="${my}" width="${mw.toFixed(2)}" height="${maskableH}" viewBox="0 0 ${VB_W} ${VB_H}">
    <path fill="#FFFFFF" stroke="#FFFFFF" stroke-width="1" stroke-linejoin="round" d="${WHITE}"/>
    <path fill="${FOREST_GREEN}" fill-rule="evenodd" stroke="${FOREST_GREEN}" stroke-width="${weight}" stroke-linejoin="round" d="${GREEN_P}"/>
  </svg>
</svg>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <clipPath id="squircle-clip">
      <rect x="0" y="0" width="512" height="512" rx="112.64" />
    </clipPath>
  </defs>
  <!-- Crisp high-contrast solid white squircle (22% radius) -->
  <rect x="0" y="0" width="512" height="512" rx="112.64" fill="#FFFFFF" />

  <!-- School Crest tightly scaled to ~89% of canvas height -->
  <g clip-path="url(#squircle-clip)">
    <svg x="${x}" y="${y}" width="${w.toFixed(2)}" height="${badgeH}" viewBox="0 0 ${VB_W} ${VB_H}">
      <path fill="#FFFFFF" stroke="#FFFFFF" stroke-width="1" stroke-linejoin="round" d="${WHITE}"/>
      <path fill="${FOREST_GREEN}" fill-rule="evenodd" stroke="${FOREST_GREEN}" stroke-width="${weight}" stroke-linejoin="round" d="${GREEN_P}"/>
    </svg>
  </g>

  <!-- Distinct 2px Jiddah Forest Green & Warm Gold border ring -->
  <!-- Outer Forest Green Ring -->
  <rect x="8" y="8" width="496" height="496" rx="104.64" fill="none" stroke="${FOREST_GREEN}" stroke-width="16" />
  <!-- Inner Warm Gold Ring -->
  <rect x="21" y="21" width="470" height="470" rx="91.64" fill="none" stroke="${WARM_GOLD}" stroke-width="10" />
</svg>`;
}

const svgs = {
  vector: buildSvg(456, 2),
  full: buildSvg(456, 2),
  medium: buildSvg(456, 4),
  small32: buildSvg(456, 7),
  small16: buildSvg(456, 14),
  maskable: buildSvg(456, 2, true),
};

// Write primary SVGs
fs.writeFileSync(path.join(pub, "favicon.svg"), svgs.vector + "\n");
fs.writeFileSync(path.join(root, "src/app/icon.svg"), svgs.vector + "\n");
console.log("Wrote public/favicon.svg and src/app/icon.svg");

const jobs = [
  ["full", 512, "icon-512.png", true],
  ["medium", 192, "icon-192.png", true],
  ["maskable", 512, "icon-maskable-512.png", false],
  ["medium", 180, "apple-touch-icon.png", true],
  ["small32", 32, "favicon-32x32.png", true],
  ["small16", 16, "favicon-16x16.png", true],
  ["medium", 48, "_ico-48.png", true],
];

function shot(svg, size, out, transparent) {
  const html = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`;
  const tmp = path.join(pub, `_icon-${size}-${Math.random().toString(36).slice(2)}.html`);
  fs.writeFileSync(tmp, html);
  return new Promise((resolve, reject) => {
    const p = spawn(
      "google-chrome",
      [
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        "--hide-scrollbars",
        "--force-device-scale-factor=1",
        `--window-size=${size},${size}`,
        ...(transparent ? ["--default-background-color=00000000"] : []),
        `--screenshot=${path.join(pub, out)}`,
        `file://${tmp}`,
      ],
      { stdio: "ignore" },
    );
    p.on("close", (code) => {
      fs.rmSync(tmp, { force: true });
      code === 0 ? resolve() : reject(new Error(`chrome ${code} for ${out}`));
    });
  });
}

for (const [key, size, out, transparent] of jobs) {
  await shot(svgs[key], size, out, transparent);
  console.log("wrote", out);
}

// Multi-resolution ICO with PNG payloads (16 / 32 / 48), each rendered natively.
const sizes = [
  [16, "favicon-16x16.png"],
  [32, "favicon-32x32.png"],
  [48, "_ico-48.png"],
];
const pngs = sizes.map(([, f]) => fs.readFileSync(path.join(pub, f)));
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const entries = sizes.map(([s], i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(s, 0);
  e.writeUInt8(s, 1);
  e.writeUInt16LE(1, 4);
  e.writeUInt16LE(32, 6);
  e.writeUInt32LE(pngs[i].length, 8);
  e.writeUInt32LE(offset, 12);
  offset += pngs[i].length;
  return e;
});
const ico = Buffer.concat([header, ...entries, ...pngs]);
fs.writeFileSync(path.join(pub, "favicon.ico"), ico);
fs.writeFileSync(path.join(root, "src/app/favicon.ico"), ico);
fs.rmSync(path.join(pub, "_ico-48.png"), { force: true });
console.log("wrote favicon.ico (16/32/48) to public/ and src/app/");
