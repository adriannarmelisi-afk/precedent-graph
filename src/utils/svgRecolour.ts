// Assigns one palette colour per element category in the bundled sample
// elevation SVG. Categories (people, trees, windows, fence, etc.) come
// straight from a hand-coloured reference drawing — see the data-cat
// attributes baked into src/assets/streetscape-elevation.svg — rather than
// pixel-level guesswork, so there's no bleed between e.g. a window and the
// person standing in front of it.

export type Category =
  | "other"
  | "trees"
  | "windows"
  | "wall"
  | "chimney"
  | "people"
  | "fence"
  | "plinth"
  | "garden"
  | "gridlines"
  | "roof"
  | "grass";

// What each category is "looking for" in a palette colour, so the result
// reads as a deliberate, graphically sensible choice rather than a strict
// dark-to-light ramp: trees/garden/grass want green if the palette has it,
// chimney wants a warm brick-like tone, people get whichever colour is most
// vivid (so the figures pop), and the structural categories (walls,
// windows, outlines) just want enough darkness to stay legible. Listed in
// priority order — earlier categories claim their best match first, so
// "trees" doesn't lose the only green to "garden" before it gets a turn.
interface CategorySpec {
  category: Category;
  hue?: number; // target hue (0-360) to match against, if this category has a "natural" colour
  lightness?: number; // target lightness (0-1) to match against when hue doesn't apply (or as a tiebreaker)
  preferSaturated?: boolean; // pick the most vivid remaining colour, regardless of hue/lightness
}

const CATEGORY_SPECS: CategorySpec[] = [
  { category: "people", preferSaturated: true },
  { category: "trees", hue: 120, lightness: 0.3 },
  { category: "chimney", hue: 20, lightness: 0.4 },
  { category: "garden", hue: 110, lightness: 0.5 },
  { category: "grass", hue: 90, lightness: 0.65 },
  { category: "other", lightness: 0.15 },
  { category: "windows", lightness: 0.25 },
  { category: "wall", lightness: 0.32 },
  { category: "plinth", lightness: 0.42 },
  { category: "fence", lightness: 0.55 },
  { category: "roof", lightness: 0.7 },
  { category: "gridlines", lightness: 0.8 },
];

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function rgbToHex([r, g, b]: number[]): string {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0"))
      .join("")
  );
}

function rgbToHsl([r, g, b]: number[]): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return [h, s, l];
}

function hslToRgb([h, s, l]: [number, number, number]): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

// Extracted palettes are often dustier/lower-saturation than the source
// image looks at a glance — boosting saturation makes the recolour read as
// vivid as the palette's hues allow, instead of faithfully reproducing a
// muted, washed-out swatch.
function boostSaturation(rgb: [number, number, number], factor: number): [number, number, number] {
  const [h, s, l] = rgbToHsl(rgb);
  return hslToRgb([h, Math.min(1, s * factor), l]);
}

function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

export function assignCategoryColours(
  paletteHexes: string[],
  seed = 0,
): Record<Category, string> {
  const stops = paletteHexes.map((h) => boostSaturation(hexToRgb(h), 1.6));
  const used = new Set<number>();

  const pick = (spec: CategorySpec): [number, number, number] => {
    const scored = stops
      .map((s, i) => {
        if (used.has(i) && used.size < stops.length) return { i, score: -Infinity };
        const [h, sat, l] = rgbToHsl(s);
        let score: number;
        if (spec.preferSaturated) {
          score = sat;
        } else if (spec.hue !== undefined) {
          // Hue match dominates; lightness only breaks ties between
          // similarly-good hue matches, and only matters at all if the
          // colour has enough saturation to actually read as that hue.
          const hueScore = sat < 0.1 ? -1 : -hueDistance(h, spec.hue) / 180;
          score = hueScore * 10 - Math.abs(l - (spec.lightness ?? 0.5));
        } else {
          score = -Math.abs(l - (spec.lightness ?? 0.5));
        }
        return { i, score };
      })
      .sort((a, b) => b.score - a.score);

    const topN = Math.min(scored.length, 3);
    const chosen = scored[seed % topN];
    used.add(chosen.i);
    return stops[chosen.i];
  };

  const result = {} as Record<Category, string>;
  CATEGORY_SPECS.forEach((spec) => {
    result[spec.category] = rgbToHex(pick(spec));
  });
  return result;
}
