import "dotenv/config";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";

export const db: NodePgDatabase & { $client: Pool } = drizzle(process.env.DATABASE_URL!);
