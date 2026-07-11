import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

/*
  Query-time embedding, module-scope cached and lazily initialized per
  the performance configuration, reused across warm invocations. Same
  model as the precompute script (scripts/srd/embed.ts) so query vectors
  and stored vectors live in the same space.
*/

const MODEL_ID = "Xenova/all-MiniLM-L6-v2";

let cachedEmbedder: Promise<FeatureExtractionPipeline> | undefined;

function getEmbedder() {
  if (!cachedEmbedder) {
    cachedEmbedder = pipeline("feature-extraction", MODEL_ID);
  }
  return cachedEmbedder;
}

export async function embedQuery(text: string): Promise<number[]> {
  const embedder = await getEmbedder();
  const output = await embedder([text], { pooling: "mean", normalize: true });
  return (output.tolist() as number[][])[0];
}
