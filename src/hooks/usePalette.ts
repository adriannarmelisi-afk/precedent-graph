import { useMemo } from "react";
import { useStore } from "../store/appStore";
import type { Swatch } from "../types";

export interface PaletteEntry extends Swatch {
  sourceName: string;
}

// Palette = every swatch from influence precedents, deduped by hex,
// each colour carrying the name of the building it came from (provenance).
export function usePalette(): PaletteEntry[] {
  const { state } = useStore();

  return useMemo(() => {
    const seen = new Set<string>();
    const entries: PaletteEntry[] = [];

    state.precedents
      .filter((p) => p.isInfluence)
      .forEach((p) => {
        p.swatches.forEach((s) => {
          const key = s.hex.toLowerCase();
          if (seen.has(key)) return;
          seen.add(key);
          entries.push({ ...s, sourceId: p.id, sourceName: p.name });
        });
      });

    return entries;
  }, [state.precedents]);
}
