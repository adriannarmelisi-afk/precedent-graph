import { useEffect, useRef, useState } from "react";
import type { PaletteEntry } from "../../hooks/usePalette";
import { assignCategoryColours } from "../../utils/svgRecolour";
import elevationSvg from "../../assets/streetscape-elevation.svg?raw";

interface DrawingRecolourProps {
  palette: PaletteEntry[];
  chosenSwatches: PaletteEntry[];
}

// "Generate another version" cycles through render styles as well as colour
// remixes, so reshuffling doesn't just shuffle the same look — a couple of
// the styles add solid fills (glazed glass, shadowed recesses) rather than
// staying pure outline the whole time.
const STYLE_LABELS = ["Linework", "Glazed windows", "Shaded windows"] as const;

export function DrawingRecolour({ palette, chosenSwatches }: DrawingRecolourProps) {
  const activePalette = chosenSwatches.length > 0 ? chosenSwatches : palette;
  const hexes = activePalette.map((s) => s.hex);

  const [seed, setSeed] = useState(0);
  const styleIndex = seed % STYLE_LABELS.length;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const svgEl = containerRef.current?.querySelector("svg");
    if (!svgEl) return;
    // The artwork's drawn content doesn't fill the original viewBox evenly,
    // which left it visibly off-centre in its box. Re-fit the viewBox to the
    // bounds of the hand-categorised drawing elements (ignoring any
    // decorative border/frame in the source file) so it centres.
    const categorised = svgEl.querySelectorAll<SVGGraphicsElement>("[data-cat]");
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    categorised.forEach((el) => {
      const b = el.getBBox();
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.width);
      maxY = Math.max(maxY, b.y + b.height);
    });
    if (!categorised.length) return;
    const bbox = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    const pad = Math.max(bbox.width, bbox.height) * 0.04;
    svgEl.setAttribute(
      "viewBox",
      `${bbox.x - pad} ${bbox.y - pad} ${bbox.width + pad * 2} ${bbox.height + pad * 2}`,
    );
  }, [activePalette.length > 0]);

  useEffect(() => {
    const svgEl = containerRef.current?.querySelector("svg");
    if (!svgEl || hexes.length === 0) return;
    const colours = assignCategoryColours(hexes, seed);
    (Object.keys(colours) as (keyof typeof colours)[]).forEach((cat) => {
      svgEl.querySelectorAll(`[data-cat="${cat}"]`).forEach((el) => {
        (el as SVGElement).style.stroke = colours[cat];
      });
    });
    // Trees are drawn with much thinner linework than everything else in
    // the source artwork, so even a darker tone reads as faint — nudge the
    // stroke up a little so they hold their own against the building.
    svgEl.querySelectorAll<SVGElement>('[data-cat="trees"]').forEach((el) => {
      el.style.strokeWidth = "0.05px";
    });

    // Reset any fills from a previous style before applying this one — only
    // the closed shapes (rects/polygons) within a category take a fill
    // sensibly; the rest of each category is open linework.
    svgEl.querySelectorAll<SVGElement>("rect[data-cat], polygon[data-cat]").forEach((el) => {
      el.style.fill = "none";
    });
    if (styleIndex === 1) {
      // Glazed windows: a very light tint on the window panes only, like
      // glass catching the palette's brightest note.
      svgEl.querySelectorAll<SVGElement>('rect[data-cat="windows"]').forEach((el) => {
        el.style.fill = colours.people;
        el.style.fillOpacity = "0.12";
      });
    } else if (styleIndex === 2) {
      // Shaded windows: a very light fill on the window panes only, like
      // glass in shadow rather than flat outline.
      svgEl.querySelectorAll<SVGElement>('rect[data-cat="windows"]').forEach((el) => {
        el.style.fill = colours.wall;
        el.style.fillOpacity = "0.15";
      });
    }
  }, [hexes.join(","), seed, styleIndex]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
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
          <div className="flex shrink-0 flex-col items-end gap-1">
            <button
              type="button"
              onClick={() => setSeed((s) => s + 1)}
              className="shrink-0 rounded-md border border-hairline-strong px-2.5 py-1.5 text-[11px] font-medium text-ink-subtle transition-colors hover:border-primary hover:text-primary"
              title="Reshuffles how your palette's colours are distributed across the drawing, and cycles between outline-only and filled render styles"
            >
              ✦ Generate another version
            </button>
            <span className="text-[10px] text-ink-tertiary">Style: {STYLE_LABELS[styleIndex]}</span>
          </div>
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
