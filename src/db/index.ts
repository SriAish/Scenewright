import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/*
  Module-scope cached client, lazily initialized, reused across warm
  invocations. Uses Supabase's pooled (transaction-mode) connection
  string; prepare: false is required for transaction-mode pooling,
  per docs/architecture.md's performance configuration.
*/

let client: postgres.Sql | undefined;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | undefined;

function getClient() {
  if (!client) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    client = postgres(connectionString, { prepare: false });
  }
  return client;
}

export function getDb() {
  if (!dbInstance) {
    dbInstance = drizzle(getClient(), { schema });
  }
  return dbInstance;
}
