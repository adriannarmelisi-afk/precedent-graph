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

// Starts the model download/init as early as possible (e.g. on app load)
// instead of waiting for the user to click "Analyse" — by the time they
// actually click it, the model is likely already warm. Errors are swallowed
// here; analyseInfluences() will surface and handle them properly when it
// actually tries to use the model.
export function warmUpSemanticModel(): void {
  loadPipeline().catch(() => {
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

  const projectEmbedding = (await extract(projectText(project), { pooling: "mean", normalize: true }))
    .data;

  const scored = await Promise.all(
    precedents.map(async (p) => {
      const embedding = (await extract(precedentText(p), { pooling: "mean", normalize: true })).data;
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
