import { useEffect, useRef, useState } from "react";
import type { PaletteEntry } from "../../hooks/usePalette";
import { assignCategoryColours } from "../../utils/svgRecolour";
import elevationSvg from "../../assets/streetscape-elevation.svg?raw";

interface DrawingRecolourProps {
  palette: PaletteEntry[];
  chosenSwatches: PaletteEntry[];
}

const STYLE_LABELS = ["Linework", "Glazed windows", "Shaded windows", "Windows + gutter"] as const;

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
  { x: 714.4,  y: 581.09, width: 18.83, height: 34.39 },
];

// The datum/gutter band runs across the full facade in three sections.
// Left and middle are <rect> elements; right section is <polyline> elements,
// so a rect query alone misses it. All three are hardcoded here instead.
const GUTTER_BANDS = [
  { x: 405.12, y: 559.97, width: 123.65, height: 9.95 }, // left section
  { x: 529.60, y: 559.97, width: 123.65, height: 9.95 }, // middle section
  { x: 654.12, y: 559.97, width:  66.14, height: 9.95 }, // right section (polylines)
];

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
    // For fill styles, give people a white fill so window/gutter tints don't
    // show through their transparent interior — the palette stroke stays on top.
    // For Linework style, keep them transparent so they read as pure outlines.
    const peopleFill = styleIndex > 0 ? "white" : "none";
    svgEl.querySelectorAll<SVGElement>('[data-cat="people"]').forEach((el) => {
      el.style.fill = peopleFill;
    });

    // Glass-pane fill lives in its own overlay group, drawn fresh each time,
    // so it never touches the original artwork's fill (door, trim band,
    // hardware) — only these exact panes can ever show a tint.
    let overlay = svgEl.querySelector<SVGGElement>('[data-role="glass-overlay"]');
    if (!overlay) {
      overlay = document.createElementNS("http://www.w3.org/2000/svg", "g");
      overlay.setAttribute("data-role", "glass-overlay");
      // Insert as first child so all original linework (people, trees, etc.)
      // paints on top of the fills.
      svgEl.insertBefore(overlay, svgEl.firstChild);
    }
    overlay.innerHTML = "";
    if (styleIndex === 1 || styleIndex === 2 || styleIndex === 3) {
      const fill = styleIndex === 1 ? colours.people : colours.wall;
      const fillOpacity = styleIndex === 1 ? "0.12" : "0.15";
      GLASS_PANES.forEach((pane) => {
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", String(pane.x));
        rect.setAttribute("y", String(pane.y));
        rect.setAttribute("width", String(pane.width));
        rect.setAttribute("height", String(pane.height));
        rect.setAttribute("fill", fill);
        rect.setAttribute("fill-opacity", fillOpacity);
        overlay!.appendChild(rect);
      });
    }

    if (styleIndex === 3) {
      const gutterFill = colours.roof;
      GUTTER_BANDS.forEach((band) => {
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", String(band.x));
        rect.setAttribute("y", String(band.y));
        rect.setAttribute("width", String(band.width));
        rect.setAttribute("height", String(band.height));
        rect.setAttribute("fill", gutterFill);
        rect.setAttribute("fill-opacity", "0.18");
        overlay!.appendChild(rect);
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
