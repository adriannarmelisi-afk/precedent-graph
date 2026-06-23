import type { AnalyseResult, Precedent, Project } from "../types";
import { suggestTagsFromText } from "./tagUtils";
import { TAG_VOCABULARY } from "../data/tagVocabulary";

function categoryOf(tag: string): string {
  for (const [category, tags] of Object.entries(TAG_VOCABULARY)) {
    if (tags.includes(tag)) return category;
  }
  return "Other";
}

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

  const covered = new Set(precedents.flatMap((p) => p.tags));
  const missing = project.tags.filter((t) => !covered.has(t));

  // Group by vocabulary category so this reads like design critique
  // ("your Atmosphere intent isn't covered yet") rather than a flat tag dump.
  const byCategory = new Map<string, string[]>();
  for (const tag of missing) {
    const category = categoryOf(tag);
    byCategory.set(category, [...(byCategory.get(category) ?? []), tag]);
  }
  const gaps = Array.from(byCategory.entries()).map(
    ([category, tags]) =>
      `No logged precedent yet addresses your ${category.toLowerCase()} intent: ${tags.join(", ")}.`,
  );

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
