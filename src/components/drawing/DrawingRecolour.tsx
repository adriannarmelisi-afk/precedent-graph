import { useEffect, useState } from "react";
import type { PaletteEntry } from "../../hooks/usePalette";
import { recolourImage, STREETSCAPE_MASK_SRC } from "../../utils/recolourDrawing";

interface DrawingRecolourProps {
  palette: PaletteEntry[];
  chosenSwatches: PaletteEntry[];
}

// Stored as PNG (not JPEG) so it's never re-compressed — every recolour
// reads pixels straight from this lossless source, so quality never
// degrades, no matter how many times the palette changes.
const SAMPLE_SRC = "/samples/streetscape-elevation.png";

export function DrawingRecolour({ palette, chosenSwatches }: DrawingRecolourProps) {
  const activePalette = chosenSwatches.length > 0 ? chosenSwatches : palette;
  const hexes = activePalette.map((s) => s.hex);

  const [seed, setSeed] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hexes.length === 0) {
      setResultUrl(null);
      return;
    }
    let cancelled = false;
    setError(null);
    recolourImage(SAMPLE_SRC, hexes, seed, STREETSCAPE_MASK_SRC)
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
  }, [hexes.join(","), seed]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[11px] font-medium uppercase tracking-wide text-ink-tertiary">
            See your palette on linework
            <span className="ml-2 font-normal normal-case text-ink-tertiary">
              {activePalette.length} colour{activePalette.length === 1 ? "" : "s"}
            </span>
          </h2>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-tertiary">
            A real architectural drawing, recoloured live from your palette — people, roof &amp; trees,
            windows &amp; doors, fences &amp; chimney, and the podium walls each pick up one deliberate
            colour, read straight off a hand-coded reference rather than guessed boxes.
          </p>
        </div>
        {activePalette.length > 0 && (
          <button
            type="button"
            onClick={() => setSeed((s) => s + 1)}
            className="shrink-0 rounded-md border border-hairline-strong px-2.5 py-1.5 text-[11px] font-medium text-ink-subtle transition-colors hover:border-primary hover:text-primary"
            title="Reshuffles how your palette's colours are distributed across the drawing, without changing the palette itself"
          >
            ✦ Generate another version
          </button>
        )}
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
