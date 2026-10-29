import { expect, test } from "@playwright/test";
import { checkPage, kindOf, measurePage } from "../../src/lib/budgets.ts";
import { readDist } from "../../scripts/dist.ts";
import { sitePaths } from "./routes.ts";

// `npm run check:budgets` reads the prerendered pages from dist/client. The Action Desk and Give pages are rendered by
// the Worker, so this measures them from a running server: the 8 KB script budget and the "no JavaScript on Give" rule
// would otherwise never be checked in CI.
test("the server-rendered pages stay inside their performance budgets", async ({ request }) => {
  const paths = (await sitePaths(request)).filter((p) => p === "/act" || p === "/give" || p.startsWith("/act/"));
  expect(paths.length, "the sitemap lists /act, /give and the live actions").toBeGreaterThan(2);

  const problems: string[] = [];
  for (const path of paths) {
    const html = await (await request.get(path)).text();
    for (const problem of checkPage(kindOf(path), measurePage(html, readDist))) problems.push(`${path}: ${problem}`);
  }
  expect(problems).toEqual([]);
});
