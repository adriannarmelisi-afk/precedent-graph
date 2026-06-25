import type { Precedent, Project } from "../types";
import { TAG_VOCABULARY } from "../data/tagVocabulary";

export function categoryOf(tag: string): string {
  for (const [category, tags] of Object.entries(TAG_VOCABULARY)) {
    if (tags.includes(tag)) return category;
  }
  return "Other";
}

// Concept tags the project states but no logged precedent's tags cover at
// all — grouped by vocabulary category so it reads as design critique
// ("your Atmosphere intent isn't covered yet") rather than a flat tag dump.
// Shared by every analysis method (semantic, local, Claude all use this).
export function computeGaps(project: Project, precedents: Precedent[]): string[] {
  const covered = new Set(precedents.flatMap((p) => p.tags));
  const missing = project.tags.filter((t) => !covered.has(t));

  const byCategory = new Map<string, string[]>();
  for (const tag of missing) {
    const category = categoryOf(tag);
    byCategory.set(category, [...(byCategory.get(category) ?? []), tag]);
  }
  return Array.from(byCategory.entries()).map(
    ([category, tags]) =>
      `No logged precedent yet addresses your ${category.toLowerCase()} intent: ${tags.join(", ")}.`,
  );
}
