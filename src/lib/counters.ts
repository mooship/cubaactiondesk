import { eq, sql } from "drizzle-orm";
import type { Db } from "../db/client.ts";
import { actionCounts } from "../db/schema.ts";

/**
 * Adds one to an action's anonymous counter and returns the new total. A
 * single upsert, so concurrent requests cannot lose counts.
 */
export async function incrementAction(db: Db, slug: string, now: Date = new Date()): Promise<number> {
  const updatedAt = now.toISOString();
  const [row] = await db
    .insert(actionCounts)
    .values({ slug, count: 1, updatedAt })
    .onConflictDoUpdate({
      target: actionCounts.slug,
      set: { count: sql`${actionCounts.count} + 1`, updatedAt },
    })
    .returning({ count: actionCounts.count });
  if (!row) throw new Error(`Counter upsert for "${slug}" returned no row`);
  return row.count;
}

/** One action's counter; 0 when nobody has done it yet. */
export async function getActionCount(db: Db, slug: string): Promise<number> {
  const [row] = await db.select({ count: actionCounts.count }).from(actionCounts).where(eq(actionCounts.slug, slug));
  return row?.count ?? 0;
}

/** All counters as `{ slug: count }`. */
export async function getActionCounts(db: Db): Promise<Record<string, number>> {
  const rows = await db.select({ slug: actionCounts.slug, count: actionCounts.count }).from(actionCounts);
  return Object.fromEntries(rows.map((r) => [r.slug, r.count]));
}
