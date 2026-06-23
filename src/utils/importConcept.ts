import { suggestTagsFromText } from "./tagUtils";

export interface ImportResult {
  titleSuggestion: string;
  summary: string;
  tags: string[];
  precedentNames: string[];
}

interface Section {
  heading: string;
  body: string;
}

const HEADING_PATTERNS = [
  /^#{1,6}\s*(.+)$/, // markdown heading
  /^\*\*(.+?)\*\*:?$/, // **Bold Heading**
];

function looksLikePlainHeading(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 60) return false;
  if (trimmed.endsWith(".")) return false;
  return /^[A-Z][A-Za-z0-9 ,':\-/]+$/.test(trimmed);
}

function splitSections(text: string): Section[] {
  const lines = text.split(/\r?\n/);
  const sections: { heading: string; body: string[] }[] = [{ heading: "", body: [] }];

  for (const line of lines) {
    let heading: string | null = null;
    for (const pattern of HEADING_PATTERNS) {
      const m = line.match(pattern);
      if (m) {
        heading = m[1].trim();
        break;
      }
    }
    if (!heading && looksLikePlainHeading(line)) {
      heading = line.trim().replace(/:$/, "");
    }

    if (heading) {
      sections.push({ heading, body: [] });
    } else {
      sections[sections.length - 1].body.push(line);
    }
  }

  return sections.map((s) => ({ heading: s.heading, body: s.body.join("\n").trim() }));
}

function firstParagraph(text: string): string {
  const blocks = text.split(/\r?\n\s*\r?\n/).map((b) => b.trim()).filter(Boolean);
  return blocks[0] ?? text.trim();
}

const BULLET_LINE = /^\s*(?:[-*•]|\d+[.)])\s*(.+)$/;

function extractName(line: string): string {
  const cut = line.split(/\s+[—–]\s+|\s+by\s+|\s*\(/)[0];
  return cut.trim().replace(/[.,:;]+$/, "");
}

function extractBulletNames(body: string): string[] {
  const names: string[] = [];
  for (const line of body.split(/\r?\n/)) {
    const m = line.match(BULLET_LINE);
    if (!m) continue;
    const name = extractName(m[1]);
    if (name.length >= 3 && name.length <= 70 && /^[A-Z0-9"']/.test(name)) {
      names.push(name);
    }
  }
  return names;
}

function extractTitleSuggestion(sections: Section[]): string {
  const first = sections.find((s) => s.heading);
  if (!first) return "";
  return first.heading
    .replace(/^concept\s*direction\s*\d*:?\s*/i, "")
    .replace(/^direction\s*\d*:?\s*/i, "")
    .trim();
}

// Deterministic, offline parse of pasted Conceptassistant Skill output into a
// suggested title, project summary, suggested concept tags, and candidate
// precedent names. The title is a suggestion only — a concept-direction
// heading is a theme name, not necessarily what the student would call their
// project — so it's surfaced for review, never applied silently.
export function parseConceptOutput(raw: string): ImportResult {
  const text = raw.trim();
  if (!text) return { titleSuggestion: "", summary: "", tags: [], precedentNames: [] };

  const sections = splitSections(text);

  const titleSuggestion = extractTitleSuggestion(sections);

  const conceptSection = sections.find((s) => /concept/i.test(s.heading) && s.body);
  const summary = (conceptSection?.body || firstParagraph(text)).slice(0, 800).trim();

  const tags = suggestTagsFromText(text);

  const precedentSection = sections.find((s) => /precedent|reference|source/i.test(s.heading));
  const rawNames = precedentSection ? extractBulletNames(precedentSection.body) : extractBulletNames(text);
  const precedentNames = Array.from(new Set(rawNames)).slice(0, 10);

  return { titleSuggestion, summary, tags, precedentNames };
}
