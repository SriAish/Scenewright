/*
  SRD embedding precompute script. Embeds srd_entries.search_text with
  all-MiniLM-L6-v2 (384 dimensions, matching the embedding column) via
  transformers.js.

  Default: embeds only rows where embedding is null (incremental; also
  covers future hand-added entries). Pass --all to recompute every row.

  Run with: npx tsx scripts/srd/embed.ts [--all]
*/

import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";
import { eq, isNull, sql } from "drizzle-orm";
import { getDb } from "../../src/db";
import { srdEntries } from "../../src/db/schema";

process.loadEnvFile(".env.local");

const MODEL_ID = "Xenova/all-MiniLM-L6-v2";
const EXPECTED_DIMENSIONS = 384;
const BATCH_SIZE = 32;

let cachedEmbedder: Promise<FeatureExtractionPipeline> | undefined;

function getEmbedder() {
  if (!cachedEmbedder) {
    cachedEmbedder = pipeline("feature-extraction", MODEL_ID);
  }
  return cachedEmbedder;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const embedder = await getEmbedder();
  const output = await embedder(texts, { pooling: "mean", normalize: true });
  return output.tolist() as number[][];
}

async function main() {
  const recomputeAll = process.argv.includes("--all");
  const db = getDb();

  const rows = await db
    .select({ id: srdEntries.id, name: srdEntries.name, searchText: srdEntries.searchText })
    .from(srdEntries)
    .where(recomputeAll ? undefined : isNull(srdEntries.embedding));

  const [{ count: totalRows }] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(srdEntries);
  const skipped = totalRows - rows.length;

  console.log(`Mode: ${recomputeAll ? "--all (recompute every row)" : "incremental (embedding is null)"}`);
  console.log(`Rows to embed: ${rows.length}`);
  console.log(`Rows skipped (already embedded): ${skipped}`);

  let embedded = 0;
  let dimensionMismatches = 0;

  for (const batch of chunk(rows, BATCH_SIZE)) {
    const texts = batch.map((r) => r.searchText);
    const vectors = await embedBatch(texts);

    await Promise.all(
      batch.map(async (row, i) => {
        const vector = vectors[i];
        if (vector.length !== EXPECTED_DIMENSIONS) {
          dimensionMismatches++;
          console.error(`Dimension mismatch for "${row.name}": got ${vector.length}, expected ${EXPECTED_DIMENSIONS}`);
          return;
        }
        await db.update(srdEntries).set({ embedding: vector }).where(eq(srdEntries.id, row.id));
        embedded++;
      }),
    );

    console.log(`Embedded ${embedded}/${rows.length}...`);
  }

  console.log("\nRun summary");
  console.log("-----------");
  console.log(`Rows embedded: ${embedded}`);
  console.log(`Rows skipped: ${skipped}`);
  console.log(`Dimension check: ${dimensionMismatches === 0 ? `OK, all vectors are ${EXPECTED_DIMENSIONS} dimensions` : `${dimensionMismatches} MISMATCHES`}`);

  process.exit(dimensionMismatches === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
