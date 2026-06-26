// Assigns palette colours across the bundled sample elevation SVG.
// Categories (people, trees, windows, fence, etc.) come straight from a
// hand-coloured reference drawing — see the data-cat attributes baked into
// src/assets/streetscape-elevation.svg — rather than pixel-level guesswork,
// so there's no bleed between e.g. a window and the person standing in
// front of it.
//
// The colour logic deliberately isn't "trees=green, brick=orange": real
// architectural presentation drawings mostly keep the building in one
// cohesive ink tone (the original black-and-white export already shares a
// single grey across every category, varying only line weight) and reserve
// a bold, disproportionate accent for entourage — people, cars, scale
// figures — precisely so they draw the eye against an otherwise quiet
// drawing. This mirrors that: the building reads as one tone, landscape
// gets a second supporting tone, and people get the palette's standout
// colour.

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

const STRUCTURE_CATEGORIES: Category[] = [
  "other",
  "windows",
  "wall",
  "chimney",
  "fence",
  "plinth",
  "gridlines",
  "roof",
];
const LANDSCAPE_CATEGORIES: Category[] = ["trees", "garden", "grass"];
const ACCENT_CATEGORIES: Category[] = ["people"];

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
// image looks at a glance — boosting saturation makes the accent colour
// read as vivid as the palette's hues allow, instead of a washed-out
// swatch that fails to stand out against the structure tone.
function boostSaturation(rgb: [number, number, number], factor: number): [number, number, number] {
  const [h, s, l] = rgbToHsl(rgb);
  return hslToRgb([h, Math.min(1, s * factor), l]);
}

export function assignCategoryColours(
  paletteHexes: string[],
  seed = 0,
): Record<Category, string> {
  const stops = paletteHexes.map(hexToRgb);
  const sortedBySaturation = [...stops].sort((a, b) => rgbToHsl(b)[1] - rgbToHsl(a)[1]);
  const sortedByLuminance = [...stops].sort((a, b) => luminance(a) - luminance(b));

  // The structure tone is a fairly dark, low-key stop — enough to read
  // clearly as linework. "Generate another version" picks among the few
  // darkest stops instead of always the very darkest, for variety.
  const structureTopN = Math.min(sortedByLuminance.length, 3);
  const structureColour = rgbToHex(sortedByLuminance[seed % structureTopN]);

  // The landscape tone is a separate, mid-toned stop — distinct from the
  // structure so trees/garden/grass read as their own layer, but still
  // restrained rather than competing with the accent.
  const remaining = stops.filter((s) => s !== sortedByLuminance[seed % structureTopN]);
  const landscapeSorted = [...remaining].sort((a, b) => luminance(a) - luminance(b));
  const midIdx = Math.floor(landscapeSorted.length / 2);
  const landscapeTopN = Math.min(landscapeSorted.length, 3) || 1;
  const landscapeColour = rgbToHex(
    landscapeSorted[Math.min(landscapeSorted.length - 1, midIdx + (seed % landscapeTopN))] ??
      sortedByLuminance[0],
  );

  // The accent is the palette's most saturated stop, boosted further so
  // people/entourage genuinely pop against the otherwise quiet drawing —
  // the "small disproportionate splash of colour" real elevations use to
  // draw the eye to scale figures.
  const accentTopN = Math.min(sortedBySaturation.length, 3);
  const accentColour = rgbToHex(boostSaturation(sortedBySaturation[seed % accentTopN], 1.8));

  const result = {} as Record<Category, string>;
  STRUCTURE_CATEGORIES.forEach((cat) => { result[cat] = structureColour; });
  LANDSCAPE_CATEGORIES.forEach((cat) => { result[cat] = landscapeColour; });
  ACCENT_CATEGORIES.forEach((cat) => { result[cat] = accentColour; });
  return result;
}
