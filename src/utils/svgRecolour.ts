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

// Dark to light, ranked by the luminance of each category's original
// reference colour — keeps the drawing's own light/dark hierarchy (e.g.
// "trees" reads darker than "roof") even once every category is remapped
// onto a different palette.
export const CATEGORY_ORDER: Category[] = [
  "other",
  "trees",
  "windows",
  "wall",
  "chimney",
  "people",
  "fence",
  "plinth",
  "garden",
  "gridlines",
  "roof",
  "grass",
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

function luminance([r, g, b]: number[]): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
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

function sortByLuminance(stops: [number, number, number][]): [number, number, number][] {
  return [...stops].sort((a, b) => luminance(a) - luminance(b));
}

// Deterministic, seedable shuffle (mulberry32) of everything *between* the
// darkest and lightest stop, so "generate another version" gives a
// genuinely different look using the same palette, while the overall
// dark-to-light hierarchy (darkest category still darkest, lightest still
// lightest) stays intact and the result stays reproducible for a given seed.
function shuffleMiddle(stops: [number, number, number][], seed: number): [number, number, number][] {
  // seed 0 (the initial/default state) stays unshuffled, so the first load
  // shows the palette's own natural dark-to-light order; only "generate
  // another version" (seed >= 1) reshuffles the middle for variety.
  if (stops.length <= 2 || seed === 0) return stops;
  const first = stops[0];
  const last = stops[stops.length - 1];
  const middle = stops.slice(1, -1);

  let s = seed >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = middle.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [middle[i], middle[j]] = [middle[j], middle[i]];
  }
  return [first, ...middle, last];
}

export function assignCategoryColours(
  paletteHexes: string[],
  seed = 0,
): Record<Category, string> {
  const stops = shuffleMiddle(
    sortByLuminance(paletteHexes.map((h) => boostSaturation(hexToRgb(h), 1.6))),
    seed,
  );

  const result = {} as Record<Category, string>;
  CATEGORY_ORDER.forEach((cat, i) => {
    const p = CATEGORY_ORDER.length === 1 ? 0 : i / (CATEGORY_ORDER.length - 1);
    const idx = Math.round(p * (stops.length - 1));
    result[cat] = rgbToHex(stops[idx]);
  });
  return result;
}
