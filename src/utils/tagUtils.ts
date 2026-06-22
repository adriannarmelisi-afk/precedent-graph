import type { Precedent, Project } from "../types";

export function slugify(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normaliseTags(tags: string[]): string[] {
  return Array.from(new Set(tags.map(slugify).filter(Boolean)));
}

export function allTagsInUse(precedents: Precedent[], project: Project): string[] {
  const tags = new Set<string>();
  precedents.forEach((p) => p.tags.forEach((t) => tags.add(t)));
  project.tags.forEach((t) => tags.add(t));
  return Array.from(tags).sort();
}
