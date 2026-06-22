import { useMemo } from "react";
import { useStore } from "../store/appStore";
import { getMaterialTags } from "../utils/materialUtils";

export interface MaterialEntry {
  tag: string;
  sourceName: string;
  imageOverride?: string;
}

// Materials = one entry per distinct Material-vocabulary tag found across
// influence precedents, deduped by tag, each carrying the name of the first
// building it came from (and a real texture image if one was uploaded).
export function useMaterialPalette(): MaterialEntry[] {
  const { state } = useStore();

  return useMemo(() => {
    const seen = new Set<string>();
    const entries: MaterialEntry[] = [];

    state.precedents
      .filter((p) => p.isInfluence)
      .forEach((p) => {
        getMaterialTags(p.tags).forEach((tag) => {
          if (seen.has(tag)) return;
          seen.add(tag);
          entries.push({ tag, sourceName: p.name, imageOverride: p.materialTextures?.[tag] });
        });
      });

    return entries;
  }, [state.precedents]);
}
