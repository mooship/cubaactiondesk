import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
/** The built static site that the checks read. */
export const DIST = join(ROOT, "dist", "client");

/** Every file under the built site, as paths relative to it with forward slashes. */
export function listDist(dist: string): string[] {
  return readdirSync(dist, { recursive: true, encoding: "utf8" }).map((name) => name.replaceAll("\\", "/"));
}

/** One built asset by site path (such as "/_astro/fonts/x.woff2"), or undefined when it is not in the build. */
export function readDist(path: string): Buffer | undefined {
  const file = join(DIST, path.replace(/^\//, ""));
  return existsSync(file) ? readFileSync(file) : undefined;
}
