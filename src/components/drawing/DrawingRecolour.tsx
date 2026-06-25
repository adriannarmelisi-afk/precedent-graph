import { useEffect, useState } from "react";
import type { PaletteEntry } from "../../hooks/usePalette";
import { recolourImage } from "../../utils/recolourDrawing";

interface DrawingRecolourProps {
  palette: PaletteEntry[];
  chosenSwatches: PaletteEntry[];
}

const SAMPLE_SRC = "/samples/reflective-furniture.jpg";

export function DrawingRecolour({ palette, chosenSwatches }: DrawingRecolourProps) {
  const activePalette = chosenSwatches.length > 0 ? chosenSwatches : palette;
  const hexes = activePalette.map((s) => s.hex);

  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hexes.length === 0) {
      setResultUrl(null);
      return;
    }
    let cancelled = false;
    setError(null);
    recolourImage(SAMPLE_SRC, hexes)
      .then((url) => {
        if (!cancelled) setResultUrl(url);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Couldn't recolour the sample drawing");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hexes.join(",")]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <div>
        <h2 className="text-[11px] font-medium uppercase tracking-wide text-ink-tertiary">
          See your palette on linework
          <span className="ml-2 font-normal normal-case text-ink-tertiary">
            {activePalette.length} colour{activePalette.length === 1 ? "" : "s"}
          </span>
        </h2>
        <p className="mt-1 text-[12px] leading-relaxed text-ink-tertiary">
          A real architectural plan, recoloured live from your palette — linework picks up your
          darkest swatch and the paper picks up your lightest, with anything in between blended
          smoothly across the rest of your palette.
        </p>
      </div>

      {activePalette.length === 0 ? (
        <p className="rounded-md border border-hairline bg-surface-2 p-3 text-[12px] text-ink-tertiary">
          No palette yet — mark some precedents as influences in the Library first to build one.
        </p>
      ) : error ? (
        <p className="rounded-md border border-hairline bg-surface-2 p-3 text-[12px] text-primary">{error}</p>
      ) : (
        <div className="rounded-lg border border-hairline bg-surface-1 p-5">
          {resultUrl ? (
            <img src={resultUrl} alt="Sample plan recoloured with your palette" className="w-full rounded-md" />
          ) : (
            <p className="text-[12px] text-ink-tertiary">Recolouring…</p>
          )}
        </div>
      )}
    </div>
  );
}
