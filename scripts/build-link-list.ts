// Writes workers/link-checker/links.generated.json from the approved fundraisers.
// Run `npm run build:links` after approving or changing a listing. A test fails if the file is stale.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadSiteContent } from "../src/lib/content-files.ts";
import { linkList } from "../src/lib/link-list.ts";

const root = join(import.meta.dirname, "..");
const { set } = loadSiteContent();
const links = linkList(set);
writeFileSync(join(root, "workers", "link-checker", "links.generated.json"), `${JSON.stringify(links, null, 2)}\n`);
console.log(`Wrote ${links.length} link(s) for the weekly checker.`);
