import { readdirSync } from "node:fs";

/** Every file under the built site, as paths relative to it with forward slashes. */
export function listDist(dist: string): string[] {
  return readdirSync(dist, { recursive: true, encoding: "utf8" }).map((name) => name.replaceAll("\\", "/"));
}
