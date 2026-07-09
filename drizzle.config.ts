import { defineConfig } from "drizzle-kit";

process.loadEnvFile(".env.local");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

/*
  out points at supabase/migrations so drizzle-kit's generated DDL and
  the hand-written migrations both live in the one migration directory
  Supabase CLI applies. drizzle-kit never talks to the live database
  directly here (no migrate/push): supabase db push is the only thing
  that applies these files.
*/
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./supabase/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
