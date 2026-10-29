import { eq } from "drizzle-orm";
import type { Db } from "../db/client.ts";
import { linkChecks } from "../db/schema.ts";
import { nextCheckState, statusFromRow, type LinkStatus } from "./linkstate.ts";

export interface LinkRow {
  url: string;
  lastStatus: number | null;
  consecutiveFail: number;
  checkedAt: string;
}

/** Latest check result for every donation URL, keyed by URL. */
export async function getLinkRows(db: Db): Promise<Map<string, LinkRow>> {
  const rows = await db.select().from(linkChecks);
  return new Map(rows.map((r) => [r.url, r]));
}

export interface RecordedCheck {
  lastStatus: number | null;
  consecutiveFail: number;
  status: LinkStatus;
}

/** Stores one check result and returns the new state. `httpStatus` is null for a network error. */
export async function recordCheck(
  db: Db,
  url: string,
  httpStatus: number | null,
  now: Date = new Date(),
): Promise<RecordedCheck> {
  const [previous] = await db.select().from(linkChecks).where(eq(linkChecks.url, url));
  const state = nextCheckState(previous?.consecutiveFail ?? 0, httpStatus);
  const checkedAt = now.toISOString();
  await db
    .insert(linkChecks)
    .values({ url, ...state, checkedAt })
    .onConflictDoUpdate({ target: linkChecks.url, set: { ...state, checkedAt } });
  return { ...state, status: statusFromRow(state) };
}
