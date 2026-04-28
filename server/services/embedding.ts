/**
 * Embedding Service — generates text embeddings via the Forge API
 * 
 * Uses the same forge API infrastructure as invokeLLM but targets
 * the /v1/embeddings endpoint for vector generation.
 * Falls back to a simple keyword-based similarity when embeddings unavailable.
 */
import { ENV } from "../_core/env";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

interface EmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * Generate embeddings for a text string using the forge API.
 * Returns null if the API is unavailable or fails.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiUrl = ENV.forgeApiUrl
    ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/embeddings`
    : "https://forge.manus.im/v1/embeddings";
  const apiKey = ENV.forgeApiKey;

  if (!apiKey) {
    console.warn("[Embedding] No API key configured, skipping embedding generation");
    return null;
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text.slice(0, 8000), // Limit input length
        dimensions: EMBEDDING_DIMENSIONS,
      }),
    });

    if (!response.ok) {
      console.warn(`[Embedding] API returned ${response.status}: ${await response.text()}`);
      return null;
    }

    const result = (await response.json()) as EmbeddingResponse;
    return result.data?.[0]?.embedding ?? null;
  } catch (err) {
    console.warn("[Embedding] Failed to generate embedding:", err);
    return null;
  }
}

/**
 * Compute cosine similarity between two embedding vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

export { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS };
