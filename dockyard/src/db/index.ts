import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ??
  "postgres://dockyard:dockyard@localhost:5432/dockyard";

const globalForDb = globalThis as unknown as {
  dockyardPool?: Pool;
};

const pool =
  globalForDb.dockyardPool ??
  new Pool({
    connectionString,
    max: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.dockyardPool = pool;
}

export const db = drizzle(pool, { schema });
