import { useEffect, useRef, useState } from "react";
import type { PaletteEntry } from "../../hooks/usePalette";
import { assignCategoryColours } from "../../utils/svgRecolour";
import elevationSvg from "../../assets/streetscape-elevation.svg?raw";

interface DrawingRecolourProps {
  palette: PaletteEntry[];
  chosenSwatches: PaletteEntry[];
}

export function DrawingRecolour({ palette, chosenSwatches }: DrawingRecolourProps) {
  const activePalette = chosenSwatches.length > 0 ? chosenSwatches : palette;
  const hexes = activePalette.map((s) => s.hex);

  const [seed, setSeed] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const svgEl = containerRef.current?.querySelector("svg");
    if (!svgEl || hexes.length === 0) return;
    const colours = assignCategoryColours(hexes, seed);
    (Object.keys(colours) as (keyof typeof colours)[]).forEach((cat) => {
      svgEl.querySelectorAll(`[data-cat="${cat}"]`).forEach((el) => {
        (el as SVGElement).style.stroke = colours[cat];
      });
    });
  }, [hexes.join(","), seed]);

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[11px] font-medium uppercase tracking-wide text-ink-tertiary">
            See your palette on linework
            <span className="ml-2 font-normal normal-case text-ink-tertiary">
              {activePalette.length} colour{activePalette.length === 1 ? "" : "s"}
            </span>
          </h2>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-tertiary">
            A real architectural drawing, recoloured live from your palette — people, trees, roof,
            fence and every other hand-grouped element picks up one deliberate colour from your
            palette. It's vector, so it stays crisp at any size.
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
      ) : (
        <div className="rounded-lg border border-hairline bg-surface-1 p-5">
          <div className="mb-4 flex flex-wrap gap-1.5">
            {activePalette.map((s, i) => (
              <span
                key={s.hex + i}
                className="h-8 w-8 shrink-0 rounded border border-hairline"
                style={{ backgroundColor: s.hex }}
                title={`${s.label || s.hex} — ${s.hex}`}
              />
            ))}
          </div>
          <div
            ref={containerRef}
            className="[&_svg]:block [&_svg]:h-auto [&_svg]:w-full"
            dangerouslySetInnerHTML={{ __html: elevationSvg }}
          />
        </div>
      )}
    </div>
  );
}
