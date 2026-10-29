import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./schema.ts";

export type Db = DrizzleD1Database<typeof schema>;

export function getDb(d1: D1Database): Db {
  return drizzle(d1, { schema });
}
