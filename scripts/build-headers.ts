// Writes public/_headers from src/lib/security.ts. Run `npm run build:headers` after changing the headers.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { headersFile } from "../src/lib/security.ts";

const target = join(import.meta.dirname, "..", "public", "_headers");
writeFileSync(target, headersFile());
console.log(`Wrote ${target}`);
