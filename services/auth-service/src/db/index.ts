import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { env } from "../config/env.js";

export const db: NodePgDatabase & { $client: Pool } = drizzle(env.DATABASE_URL);
