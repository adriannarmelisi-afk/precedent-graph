import type { AnalyseResult, Precedent, Project } from "../types";

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
const MODEL = "claude-haiku-4-5-20251001";

export interface AnalyseOutcome {
  result: AnalyseResult;
  source: "claude" | "local";
}

interface AnalyseInput {
  id: string;
  name: string;
  demonstrates: string;
  tags: string[];
}

function buildPrompt(project: Project, precedents: AnalyseInput[]): string {
  return [
    "You are helping an architecture student identify which precedent buildings genuinely",
    "align with their design concept. Respond ONLY with minified JSON matching this shape:",
    '{"recommendations":[{"precedentId":string,"reason":string}],"gaps":[string]}',
    "Each reason is one sentence. gaps lists themes their concept implies but no precedent covers.",
    "",
    `PROJECT CONCEPT: ${project.summary || "(none provided)"}`,
    `PROJECT TAGS: ${project.tags.join(", ") || "(none)"}`,
    "",
    "PRECEDENTS:",
    ...precedents.map(
      (p) => `- id=${p.id} | ${p.name} | ${p.demonstrates} | tags: ${p.tags.join(", ")}`,
    ),
  ].join("\n");
}

// Deterministic fallback — runs with no API key, no network, offline.
// Ranks precedents by tag overlap with the project; flags concept tags no precedent covers.
function localAnalyse(project: Project, precedents: Precedent[]): AnalyseResult {
  const projectTags = new Set(project.tags);

  const recommendations = precedents
    .map((p) => {
      const shared = p.tags.filter((t) => projectTags.has(t));
      return { p, shared };
    })
    .filter((x) => x.shared.length > 0)
    .sort((a, b) => b.shared.length - a.shared.length)
    .map(({ p, shared }) => ({
      precedentId: p.id,
      reason: `Shares ${shared.join(", ")} with your concept — ${p.demonstrates}`,
    }));

  const covered = new Set(precedents.flatMap((p) => p.tags));
  const gaps = project.tags
    .filter((t) => !covered.has(t))
    .map((t) => `No logged precedent yet addresses "${t}".`);

  return { recommendations, gaps };
}

export async function analyseInfluences(
  project: Project,
  precedents: Precedent[],
): Promise<AnalyseOutcome> {
  if (!API_KEY) {
    return { result: localAnalyse(project, precedents), source: "local" };
  }

  try {
    const payload = precedents.map((p) => ({
      id: p.id,
      name: p.name,
      demonstrates: p.demonstrates,
      tags: p.tags,
    }));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        messages: [{ role: "user", content: buildPrompt(project, payload) }],
      }),
    });

    if (!response.ok) throw new Error(`Anthropic API ${response.status}`);
    const data = await response.json();
    const text: string = data.content?.[0]?.text ?? "";
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const parsed = JSON.parse(json) as AnalyseResult;
    return { result: parsed, source: "claude" };
  } catch {
    // Any failure (no network, bad key, malformed JSON) falls back to local logic.
    return { result: localAnalyse(project, precedents), source: "local" };
  }
}
