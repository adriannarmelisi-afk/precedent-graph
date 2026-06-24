import { useMemo } from "react";
import { useStore } from "../store/appStore";
import type { Swatch } from "../types";

export interface PaletteEntry extends Swatch {
  sourceName: string;
  // Concept tags shared between the project and this swatch's source precedent —
  // makes the concept → precedent → colour chain visible, not just implied.
  sharedTags: string[];
}

// Palette = every swatch from influence precedents, deduped by hex,
// each colour carrying the name of the building it came from (provenance).
export function usePalette(): PaletteEntry[] {
  const { state } = useStore();

  return useMemo(() => {
    const projectTags = new Set(state.project.tags);
    const seen = new Set<string>();
    const entries: PaletteEntry[] = [];

    state.precedents
      .filter((p) => p.isInfluence)
      .forEach((p) => {
        const sharedTags = p.tags.filter((t) => projectTags.has(t));
        p.swatches.forEach((s) => {
          const key = s.hex.toLowerCase();
          if (seen.has(key)) return;
          seen.add(key);
          entries.push({ ...s, sourceId: p.id, sourceName: p.name, sharedTags });
        });
      });

    return entries;
  }, [state.precedents, state.project.tags]);
}
