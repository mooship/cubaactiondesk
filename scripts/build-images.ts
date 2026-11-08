// Renders the social preview images (public/og) and the Instagram card (public/cards) in a real
// browser, so they use the site's own fonts. Outputs are committed; run `npm run build:images`
// after changing the text or design. The card text mirrors src/content/articles/sa-and-cuba-in-60-seconds.md.
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { SITE, siteUrl } from "../src/lib/site.ts";

const root = join(import.meta.dirname, "..");
const font = (file: string) =>
  `data:font/woff2;base64,${readFileSync(join(root, "src", "assets", "fonts", file)).toString("base64")}`;

const FONT_CSS = `
@font-face { font-family: "Source Serif 4"; font-weight: 400 700; src: url(${font("source-serif-4.woff2")}) format("woff2"); }
@font-face { font-family: "Big Shoulders Display"; font-weight: 700 900; src: url(${font("big-shoulders-display.woff2")}) format("woff2"); }`;

// The site palette (src/styles/tokens.css): paper, ink, Cuban flag blue, pressed red and gold.
const PAPER = "#f4efe4";
const INK = "#1b1a17";
const INK_SOFT = "#4f4a40";
const BLUE = "#002a8f";
const RED = "#b3261e";
const GOLD = "#e0a526";

/** The stamp wordmark from the site header: a ruled box with SA in gold. */
const stamp = `<div class="stamp">Cuba Action Desk <span>SA</span></div>`;

const BASE_CSS = `
${FONT_CSS}
* { box-sizing: border-box; margin: 0; }
body { background: ${PAPER}; color: ${INK}; font-family: "Source Serif 4", serif; display: flex; flex-direction: column; }
h1, .stamp { font-family: "Big Shoulders Display", sans-serif; }
h1 { font-weight: 900; line-height: 1; }
.band { background: ${BLUE}; color: ${PAPER}; border-bottom: 8px solid ${GOLD}; }
.stamp { display: inline-block; border: 4px solid currentColor; padding: 6px 16px 4px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; line-height: 1; }
.stamp span { color: ${GOLD}; }
.host { color: ${INK_SOFT}; }`;

function og(title: string, text: string): string {
  return `<style>${BASE_CSS}
body { width: 1200px; height: 630px; }
.band { padding: 36px 72px; }
.stamp { font-size: 40px; }
main { flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 48px 72px 44px; }
h1 { font-size: 104px; max-width: 1040px; }
p { font-size: 38px; line-height: 1.3; max-width: 980px; margin-top: 20px; }
.host { font-size: 30px; border-top: 3px solid ${INK}; padding-top: 12px; }</style>
<body><div class="band">${stamp}</div>
<main><div><h1>${title}</h1><p>${text}</p></div><div class="host">${new URL(siteUrl()).host}</div></main></body>`;
}

/** Instagram portrait card, 1080 x 1350. These sentences are the 60-second article's own. */
function card(): string {
  const lines = [
    "Cuban troops fought in Angola at Cuito Cuanavale in 1987 and 1988.",
    "Since 1996, South Africa has sent medical students to train in Cuba.",
    "On 28 October 2026, 130 countries voted at the UN to call for the US embargo of Cuba to end. 17 voted against and 25 abstained.",
    "South Africa's government wants the embargo to end. The US ambassador told the UN: “There is no blockade.”",
  ];
  return `<style>${BASE_CSS}
body { width: 1080px; height: 1350px; }
.band { padding: 44px 80px; }
.stamp { font-size: 44px; }
main { flex: 1; display: flex; flex-direction: column; justify-content: space-between; padding: 48px 80px 64px; }
h1 { font-size: 120px; margin: 0 0 44px; }
ul { list-style: none; padding: 0; display: grid; gap: 32px; }
li { font-size: 40px; line-height: 1.32; padding-left: 32px; border-left: 8px solid ${RED}; }
.foot { font-size: 32px; display: flex; justify-content: space-between; align-items: end; gap: 24px; border-top: 3px solid ${INK}; padding-top: 16px; }
.host { max-width: 640px; overflow-wrap: anywhere; }</style>
<body><div class="band">${stamp}</div>
<main><div><h1>South Africa and Cuba in 60 seconds</h1>
<ul>${lines.map((l) => `<li>${l}</li>`).join("")}</ul></div>
<div class="foot"><div class="host">${new URL("/learn/sa-and-cuba-in-60-seconds", siteUrl()).href.replace("https://", "")}</div><div>${SITE.instagramHandle}</div></div></main></body>`;
}

const images = [
  {
    file: "og/default.png",
    width: 1200,
    height: 630,
    html: og(
      "Take action on the US blockade of Cuba",
      "Write to a representative from South Africa or help fund aid to Cuba.",
    ),
  },
  {
    file: "og/learn.png",
    width: 1200,
    height: 630,
    html: og("Learn", "Short, sourced explainers on the US blockade of Cuba and South Africa's links to Cuba."),
  },
  {
    file: "og/act.png",
    width: 1200,
    height: 630,
    html: og("Take action", "Write to DIRCO, your MP or a newspaper. Edit a suggested message and send it yourself."),
  },
  {
    file: "og/give.png",
    width: 1200,
    height: 630,
    html: og("Give", "Organisations that deliver aid to Cuba, checked by us. You pay them directly."),
  },
  { file: "cards/sa-and-cuba-in-60-seconds.png", width: 1080, height: 1350, html: card() },
];

const browser = await chromium.launch();
const work = mkdtempSync(join(tmpdir(), "cad-images-"));
for (const image of images) {
  const page = await browser.newPage({ viewport: { width: image.width, height: image.height } });
  const source = join(work, `${image.file.replaceAll(/\W+/g, "-")}.html`);
  writeFileSync(source, `<!doctype html><meta charset="utf-8">${image.html}`);
  await page.goto(pathToFileURL(source).href);
  await page.evaluate(() => document.fonts.ready);
  const target = join(root, "public", image.file);
  mkdirSync(join(target, ".."), { recursive: true });
  await page.screenshot({ path: target });
  await page.close();
  console.log(image.file);
  // Cards are shown on their action page at up to 320 CSS pixels wide, so a 640-pixel WebP is enough there.
  // The full PNG stays as the download.
  if (image.file.startsWith("cards/")) {
    const preview = target.replace(/\.png$/, "-preview.webp");
    await sharp(target).resize(640).webp({ quality: 80 }).toFile(preview);
    console.log(image.file.replace(/\.png$/, "-preview.webp"));
  }
}
await browser.close();
