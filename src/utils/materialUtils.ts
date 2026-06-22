import { TAG_VOCABULARY } from "../data/tagVocabulary";

const MATERIAL_TAGS = new Set(TAG_VOCABULARY["Material"]);

export function getMaterialTags(tags: string[]): string[] {
  return tags.filter((t) => MATERIAL_TAGS.has(t));
}
