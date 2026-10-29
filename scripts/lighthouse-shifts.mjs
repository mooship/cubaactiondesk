// Prints the layout shifts behind each Lighthouse run in .lighthouseci, so a failed CLS gate says which element moved.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = ".lighthouseci";

function* reports(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* reports(path);
    else if (/^lhr-.*\.json$/.test(entry.name)) yield path;
  }
}

for (const file of reports(root)) {
  const report = JSON.parse(readFileSync(file, "utf8"));
  const cls = report.audits["cumulative-layout-shift"]?.numericValue ?? 0;
  if (cls <= 0.02) continue;
  console.log(`${report.finalUrl}  CLS ${cls.toFixed(4)}  (${report.configSettings.formFactor})`);
  for (const item of report.audits["layout-shifts"]?.details?.items ?? []) {
    console.log(`  score ${item.score?.toFixed(4)}  ${item.node?.snippet ?? item.node?.selector ?? "(no node)"}`);
  }
}
