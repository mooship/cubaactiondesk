// Installs the separate lint package (tools/lint) the first time it is needed, so the pre-commit hook
// works on a fresh clone. It has its own node_modules because typescript-eslint needs TypeScript 6.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const lint = join(import.meta.dirname, "..", "tools", "lint");

if (!existsSync(join(lint, "node_modules", ".bin"))) {
  console.log("Installing the lint tools (first run only)...");
  const result = spawnSync("npm", ["ci", "--prefix", lint], { stdio: "inherit", shell: true });
  process.exit(result.status ?? 1);
}
