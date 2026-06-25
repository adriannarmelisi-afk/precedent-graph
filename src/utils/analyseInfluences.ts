import type { AnalyseResult, Precedent, Project } from "../types";
import { suggestTagsFromText } from "./tagUtils";
import { computeGaps } from "./analyseGaps";
import { semanticAnalyse } from "./semanticAnalyse";

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
const MODEL = "claude-haiku-4-5-20251001";

function siteText(project: Project): string {
  const site = project.site;
  if (!site) return "";
  return [site.location, site.orientation, site.constraint].filter(Boolean).join(" ");
}

// Site fields (location/orientation/constraint) contribute tags too, but as a
// lighter-weight signal than the student's own explicit concept tags. Climate
// tags (from the optional free climate lookup) are folded in the same way —
// real data, same secondary weight as the keyword-derived site tags.
function siteDerivedTags(project: Project): string[] {
  const text = siteText(project);
  const keywordTags = text.trim() ? suggestTagsFromText(text) : [];
  const climateTags = project.site?.climateTags ?? [];
  return Array.from(new Set([...keywordTags, ...climateTags])).filter(
    (t) => !project.tags.includes(t),
  );
}

export interface AnalyseOutcome {
  result: AnalyseResult;
  source: "semantic" | "claude" | "local";
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
    "Each reason is one sentence. gaps lists themes their concept implies but no precedent covers —",
    "phrase each gap as design critique grouped by theme (e.g. material, atmosphere, programme),",
    "not a flat tag dump.",
    "",
    `PROJECT CONCEPT: ${project.summary || "(none provided)"}`,
    `PROJECT TAGS: ${project.tags.join(", ") || "(none)"}`,
    `SITE CONTEXT: ${siteText(project) || "(none provided)"}`,
    `SITE CLIMATE: ${project.site?.climateSummary || "(not looked up)"}`,
    "",
    "PRECEDENTS:",
    ...precedents.map(
      (p) => `- id=${p.id} | ${p.name} | ${p.demonstrates} | tags: ${p.tags.join(", ")}`,
    ),
  ].join("\n");
}

// Deterministic fallback — runs with no API key, no network, offline.
// Ranks precedents by tag overlap with the project; concept tags count double
// weight versus site-derived tags, so an explicit concept always leads, with
// site context (location/orientation/constraint) as a secondary nudge.
function localAnalyse(project: Project, precedents: Precedent[]): AnalyseResult {
  const projectTags = new Set(project.tags);
  const siteTags = new Set(siteDerivedTags(project));

  const recommendations = precedents
    .map((p) => {
      const conceptShared = p.tags.filter((t) => projectTags.has(t));
      const siteShared = p.tags.filter((t) => siteTags.has(t));
      const score = conceptShared.length * 2 + siteShared.length;
      return { p, conceptShared, siteShared, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ p, conceptShared, siteShared }) => {
      const parts: string[] = [];
      if (conceptShared.length > 0) parts.push(`shares ${conceptShared.join(", ")} with your concept`);
      if (siteShared.length > 0) parts.push(`matches your site (${siteShared.join(", ")})`);
      return {
        precedentId: p.id,
        reason: `${parts.join(" and ")} — ${p.demonstrates}`,
      };
    });

  return { recommendations, gaps: computeGaps(project, precedents) };
}

async function claudeAnalyse(project: Project, precedents: Precedent[]): Promise<AnalyseResult> {
  const payload: AnalyseInput[] = precedents.map((p) => ({
    id: p.id,
    name: p.name,
    demonstrates: p.demonstrates,
    tags: p.tags,
  }));

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": API_KEY ?? "",
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
  return JSON.parse(json) as AnalyseResult;
}

// Default path is the free, on-device semantic model — no key, no account,
// no per-request cost. Claude is only used if a key has been explicitly
// configured (kept for flexibility, never required). Local tag-overlap is
// the last-resort fallback if the in-browser model can't load at all (e.g.
// no network for the one-time download, or an unsupported browser).
const SEMANTIC_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

export async function analyseInfluences(
  project: Project,
  precedents: Precedent[],
): Promise<AnalyseOutcome> {
  try {
    const result = await withTimeout(
      semanticAnalyse(project, precedents),
      SEMANTIC_TIMEOUT_MS,
      "On-device AI model",
    );
    return { result, source: "semantic" };
  } catch (err) {
    // Model failed to load (no network for the one-time download, the host
    // blocking huggingface.co, an unsupported browser, etc). Logged so the
    // real cause is visible in devtools instead of silently vanishing —
    // falls through to Claude (if configured) or local either way.
    console.warn("On-device AI model failed to load, falling back:", err);
  }

  if (API_KEY) {
    try {
      const result = await claudeAnalyse(project, precedents);
      return { result, source: "claude" };
    } catch (err) {
      console.warn("Claude analysis failed, falling back to local:", err);
    }
  }

  return { result: localAnalyse(project, precedents), source: "local" };
}
