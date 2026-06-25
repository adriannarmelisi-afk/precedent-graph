import type { AnalyseResult, Precedent, Project } from "../types";
import { computeGaps } from "./analyseGaps";

// A real AI model — not a fallback, not a rule-of-thumb — but one that runs
// entirely inside the browser: no API key, no account, no per-request cost,
// nothing ever sent to a server except the one-time, public, free download of
// the model weights themselves (cached after the first run). This is what
// "Analyse influences" uses by default.
const MODEL_ID = "Xenova/all-MiniLM-L6-v2";

type FeatureExtractionPipeline = (
  text: string,
  options: { pooling: "mean"; normalize: true },
) => Promise<{ data: Float32Array }>;

let pipelinePromise: Promise<FeatureExtractionPipeline> | null = null;

function loadPipeline(): Promise<FeatureExtractionPipeline> {
  if (!pipelinePromise) {
    pipelinePromise = import("@huggingface/transformers").then(({ pipeline }) =>
      pipeline("feature-extraction", MODEL_ID, { dtype: "q8" }) as Promise<FeatureExtractionPipeline>,
    );
  }
  return pipelinePromise;
}

// Precedent embeddings are the expensive part — computing a vector for all
// 61 (and growing) precedents takes far longer than downloading the model
// itself. Their text barely ever changes, so caching them keyed by id+text
// means a click only ever has to embed the *project* text fresh — cutting
// "Analyse" from ~15-30s down to roughly one inference call.
const embeddingCache = new Map<string, Float32Array>();

async function embed(
  extract: FeatureExtractionPipeline,
  cacheKey: string | null,
  text: string,
): Promise<Float32Array> {
  if (cacheKey) {
    const cached = embeddingCache.get(cacheKey);
    if (cached) return cached;
  }
  const result = (await extract(text, { pooling: "mean", normalize: true })).data;
  if (cacheKey) embeddingCache.set(cacheKey, result);
  return result;
}

// Starts the model download/init as early as possible (e.g. on app load)
// instead of waiting for the user to click "Analyse" — and pre-computes
// every precedent's embedding in the background too, so by the time
// "Analyse" is actually clicked there's only one new embedding left to do
// (the project's own text). Errors are swallowed here; analyseInfluences()
// surfaces and handles them properly when it actually tries to use the model.
export function warmUpSemanticModel(precedents: Precedent[] = []): void {
  loadPipeline()
    .then(async (extract) => {
      for (const p of precedents) {
        await embed(extract, `${p.id}::${precedentText(p)}`, precedentText(p));
      }
    })
    .catch(() => {
      // Silent — this is just a head start, not the real attempt.
    });
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  // Both vectors are already L2-normalised by the pipeline, so the dot
  // product alone equals cosine similarity — but dividing through anyway
  // keeps this correct even if that ever changes.
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1);
}

function projectText(project: Project): string {
  const site = project.site;
  return [
    project.title,
    project.summary,
    project.tags.join(", "),
    site?.location,
    site?.orientation,
    site?.constraint,
  ]
    .filter(Boolean)
    .join(". ");
}

function precedentText(p: Precedent): string {
  return [p.name, p.demonstrates, p.tags.join(", ")].filter(Boolean).join(". ");
}

const MAX_RECOMMENDATIONS = 15;

// Ranks precedents by semantic similarity (meaning, not just shared tag
// strings) between the project's concept and each precedent's description —
// using a small sentence-embedding model that runs locally in the browser.
export async function semanticAnalyse(
  project: Project,
  precedents: Precedent[],
): Promise<AnalyseResult> {
  const extract = await loadPipeline();

  // Project text changes every time the concept is edited, so it's never
  // cached — but it's only one call either way.
  const projectEmbedding = await embed(extract, null, projectText(project));

  const scored = await Promise.all(
    precedents.map(async (p) => {
      const text = precedentText(p);
      const embedding = await embed(extract, `${p.id}::${text}`, text);
      const score = cosineSimilarity(projectEmbedding, embedding);
      return { p, score };
    }),
  );

  const recommendations = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RECOMMENDATIONS)
    .map(({ p, score }) => ({
      precedentId: p.id,
      reason: `${Math.round(score * 100)}% conceptual match — ${p.demonstrates}`,
    }));

  return { recommendations, gaps: computeGaps(project, precedents) };
}
