// Generates the favicon / app icon set from one design: a red disc with a white star.
// Run `npm run build:icons` after changing the design; the outputs in public/ are committed,
// so a normal build does not need sharp.
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const NAVY = "#0B1F4D";
const RED = "#C8102E";
const WHITE = "#FFFFFF";
const PUBLIC = join(import.meta.dirname, "..", "public");

/** Five-point star path centred on (cx, cy). Inner radius is 40% of the outer radius, as in the logo. */
function starPath(cx, cy, outer) {
  const inner = outer * 0.4;
  const points = Array.from({ length: 10 }, (_, i) => {
    const angle = ((-90 + i * 36) * Math.PI) / 180;
    const r = i % 2 === 0 ? outer : inner;
    return `${(cx + r * Math.cos(angle)).toFixed(3)} ${(cy + r * Math.sin(angle)).toFixed(3)}`;
  });
  return `M${points.join("L")}Z`;
}

const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`;

/** The logo: red disc, white star, transparent corners. Matches public/favicon.svg. */
const disc = svg(`<circle cx="50" cy="50" r="50" fill="${RED}"/><path fill="${WHITE}" d="${starPath(50, 50, 28)}"/>`);

/** Navy tile with the disc inset. For apple-touch-icon (iOS fills transparency with black) and Windows tiles. */
const tile = svg(
  `<rect width="100" height="100" fill="${NAVY}"/><circle cx="50" cy="50" r="38" fill="${RED}"/><path fill="${WHITE}" d="${starPath(50, 50, 25)}"/>`,
);

/** Full-bleed red with the star inside the maskable safe zone (centre 80%), so any OS mask keeps it. */
const maskable = svg(
  `<rect width="100" height="100" fill="${RED}"/><path fill="${WHITE}" d="${starPath(50, 50, 30)}"/>`,
);

const png = (source, size) =>
  sharp(Buffer.from(source), { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();

/** Packs PNG images into an .ico container (supported by every current browser and Windows). */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + images.length * 16;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

const manifest = {
  id: "/",
  name: "Cuba Action Desk SA",
  short_name: "Action Desk",
  description: "Understand the US blockade of Cuba, and do something about it from South Africa.",
  lang: "en-ZA",
  start_url: "/",
  scope: "/",
  display: "standalone",
  background_color: NAVY,
  theme_color: NAVY,
  icons: [
    { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
};

const browserconfig = `<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
  <msapplication>
    <tile>
      <square150x150logo src="/mstile-150x150.png"/>
      <TileColor>${NAVY}</TileColor>
    </tile>
  </msapplication>
</browserconfig>
`;

await mkdir(PUBLIC, { recursive: true });

const files = {
  "favicon.svg": Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="${RED}"/><path fill="${WHITE}" d="${starPath(16, 16, 9)}"/></svg>\n`,
  ),
  "favicon.ico": ico(await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png(disc, size) })))),
  "apple-touch-icon.png": await png(tile, 180),
  "icon-192.png": await png(disc, 192),
  "icon-512.png": await png(disc, 512),
  "icon-maskable-512.png": await png(maskable, 512),
  "mstile-150x150.png": await png(tile, 150),
  "site.webmanifest": Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`),
  "browserconfig.xml": Buffer.from(browserconfig),
};

for (const [name, data] of Object.entries(files)) {
  await writeFile(join(PUBLIC, name), data);
  console.log(`${name.padEnd(24)} ${String(data.length).padStart(6)} bytes`);
}
