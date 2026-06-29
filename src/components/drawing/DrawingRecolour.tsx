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
const STYLE_LABELS = [
  "Linework",
  "Glazed windows",
  "Shaded windows",
  "Shaded windows + datum band",
] as const;

// The source artwork's "windows" data-cat also covers the door, its
// hardware, and the long datum trim band across the facade — filling the
// whole category tints things that aren't glass. These are the actual
// glass panes only, picked by hand from the artwork's coordinates, so the
// fill lands exactly on the window panes and nowhere else.
const GLASS_PANES = [
  { x: 437.88, y: 581.09, width: 17.32, height: 34.98 },
  { x: 461.81, y: 581.09, width: 17.32, height: 34.98 },
  { x: 576.91, y: 581.15, width: 56.08, height: 34.24 },
  { x: 682.99, y: 581.09, width: 18.83, height: 34.39 },
  { x: 714.4, y: 581.09, width: 18.83, height: 34.39 },
];

// The horizontal datum trim board running the full width of the facade,
// just above the ground floor — its own separate fill, off by default.
const DATUM_BAND = { x: 405.12, y: 559.97, width: 248.13, height: 9.95 };

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

    // Glass-pane fill lives in its own overlay group, drawn fresh each time,
    // so it never touches the original artwork's fill (door, trim band,
    // hardware) — only these exact panes can ever show a tint.
    let overlay = svgEl.querySelector<SVGGElement>('[data-role="glass-overlay"]');
    if (!overlay) {
      overlay = document.createElementNS("http://www.w3.org/2000/svg", "g");
      overlay.setAttribute("data-role", "glass-overlay");
      svgEl.appendChild(overlay);
    }
    overlay.innerHTML = "";
    const addFill = (pane: { x: number; y: number; width: number; height: number }, fill: string, fillOpacity: string) => {
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", String(pane.x));
      rect.setAttribute("y", String(pane.y));
      rect.setAttribute("width", String(pane.width));
      rect.setAttribute("height", String(pane.height));
      rect.setAttribute("fill", fill);
      rect.setAttribute("fill-opacity", fillOpacity);
      overlay!.appendChild(rect);
    };
    if (styleIndex === 1 || styleIndex === 2 || styleIndex === 3) {
      // Glazed windows uses the accent tone; the shaded styles use the
      // structure tone — both kept very light so it reads as a tint, not a
      // block of colour.
      const fill = styleIndex === 1 ? colours.people : colours.wall;
      const fillOpacity = styleIndex === 1 ? "0.12" : "0.15";
      GLASS_PANES.forEach((pane) => addFill(pane, fill, fillOpacity));
    }
    if (styleIndex === 3) {
      addFill(DATUM_BAND, colours.wall, "0.15");
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
