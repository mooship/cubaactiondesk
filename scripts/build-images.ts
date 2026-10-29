// Renders the social preview images (public/og) and the Instagram card (public/cards) in a real
// browser, so they use the site's own fonts. Outputs are committed; run `npm run build:images`
// after changing the text or design. The card text mirrors src/content/articles/sa-and-cuba-in-60-seconds.md.
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { SITE, siteUrl } from "../src/lib/site.ts";

const root = join(import.meta.dirname, "..");
const font = (pkg: string, file: string) =>
  `data:font/woff2;base64,${readFileSync(join(root, "node_modules", "@fontsource-variable", pkg, "files", file)).toString("base64")}`;

const FONT_CSS = `
@font-face { font-family: "Public Sans"; font-weight: 100 900; src: url(${font("public-sans", "public-sans-latin-wght-normal.woff2")}) format("woff2"); }
@font-face { font-family: "Oswald"; font-weight: 200 700; src: url(${font("oswald", "oswald-latin-wght-normal.woff2")}) format("woff2"); }`;

/** Five-point star, inner radius 40% of outer, as in the logo. */
function star(cx: number, cy: number, outer: number): string {
  const points = Array.from({ length: 10 }, (_, i) => {
    const angle = ((-90 + i * 36) * Math.PI) / 180;
    const r = i % 2 === 0 ? outer : outer * 0.4;
    return `${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`;
  });
  return points.join(" ");
}

const mark = (size: number) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="50" fill="#C8102E"/><polygon points="${star(50, 50, 28)}" fill="#fff"/></svg>`;

const BASE_CSS = `
${FONT_CSS}
* { box-sizing: border-box; margin: 0; }
body { background: #0B1F4D; color: #fff; font-family: "Public Sans", sans-serif; }
h1, .brand { font-family: "Oswald", sans-serif; font-weight: 600; line-height: 1.1; }
.brand { display: flex; align-items: center; gap: 20px; font-size: 40px; }
.brand span { font-weight: 400; opacity: 0.85; }
.host { color: #c5ccdd; }`;

function og(title: string, text: string): string {
  return `<style>${BASE_CSS}
body { width: 1200px; height: 630px; padding: 64px 72px; display: flex; flex-direction: column; justify-content: space-between; }
h1 { font-size: 96px; max-width: 980px; }
p { font-size: 40px; line-height: 1.35; color: #EEF1F6; max-width: 960px; margin-top: 24px; }
.host { font-size: 30px; }</style>
<body><div class="brand">${mark(64)}Cuba Action Desk<span>SA</span></div>
<div><h1>${title}</h1><p>${text}</p></div><div class="host">${new URL(siteUrl()).host}</div></body>`;
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
body { width: 1080px; height: 1350px; padding: 80px; display: flex; flex-direction: column; justify-content: space-between; }
h1 { font-size: 104px; margin: 48px 0 56px; }
ul { list-style: none; padding: 0; display: grid; gap: 36px; }
li { font-size: 42px; line-height: 1.35; padding-left: 36px; border-left: 8px solid #C8102E; }
.foot { font-size: 32px; display: flex; justify-content: space-between; align-items: end; gap: 24px; }
.host { max-width: 640px; overflow-wrap: anywhere; }</style>
<body><div><div class="brand">${mark(72)}Cuba Action Desk<span>SA</span></div>
<h1>South Africa and Cuba in 60 seconds</h1>
<ul>${lines.map((l) => `<li>${l}</li>`).join("")}</ul></div>
<div class="foot"><div class="host">${new URL("/learn/sa-and-cuba-in-60-seconds", siteUrl()).href.replace("https://", "")}</div><div>${SITE.instagramHandle}</div></div></body>`;
}

const images = [
  {
    file: "og/default.png",
    width: 1200,
    height: 630,
    html: og(
      "Learn about the Cuba blockade and act on it",
      "Ready-to-send messages, sourced explainers, and organisations that deliver aid.",
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
    html: og("Take action", "Ready-to-send emails and messages. A minute or two each."),
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
  const source = join(work, image.file.replaceAll(/\W+/g, "-") + ".html");
  writeFileSync(source, `<!doctype html><meta charset="utf-8">${image.html}`);
  await page.goto(pathToFileURL(source).href);
  await page.evaluate(() => document.fonts.ready);
  const target = join(root, "public", image.file);
  mkdirSync(join(target, ".."), { recursive: true });
  await page.screenshot({ path: target });
  await page.close();
  console.log(image.file);
}
await browser.close();
