import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/** Anonymous per-action counters. No personal information. */
export const actionCounts = sqliteTable("action_counts", {
  slug: text("slug").primaryKey(),
  count: integer("count").notNull().default(0),
  updatedAt: text("updated_at").notNull(),
});

/** Latest result of the weekly donation-link check. */
export const linkChecks = sqliteTable("link_checks", {
  url: text("url").primaryKey(),
  lastStatus: integer("last_status"),
  consecutiveFail: integer("consecutive_fail").notNull().default(0),
  checkedAt: text("checked_at").notNull(),
});
