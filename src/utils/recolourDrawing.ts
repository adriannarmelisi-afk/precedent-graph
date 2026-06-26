// Recolours a line drawing by remapping its greyscale luminance onto a
// gradient built from the project's own palette — duotone for 2 colours,
// smoothly multi-toned for more. Pure client-side canvas work, no network.
//
// This is intentionally scoped to one bundled, known-clean reference drawing
// rather than arbitrary student uploads. Real-world uploads vary wildly in
// contrast, noise and line weight, which made the recolour look muddy and
// unpredictable; a single curated source we can tune for stays reliable.

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
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
// image looks at a glance — k-means clustering averages anti-aliased edges
// and shadow tones into the swatches. Boosting saturation here makes the
// recolour read as vivid as the palette's hues allow, instead of faithfully
// reproducing a muted, washed-out version of an already-soft swatch.
function boostSaturation(rgb: [number, number, number], factor: number): [number, number, number] {
  const [h, s, l] = rgbToHsl(rgb);
  return hslToRgb([h, Math.min(1, s * factor), l]);
}

// Sorts swatches dark-to-light so luminance 0 maps to the darkest colour
// (the linework) and luminance 1 maps to the lightest (the paper).
function sortStops(hexes: string[]): [number, number, number][] {
  return hexes
    .map(hexToRgb)
    .map((rgb) => boostSaturation(rgb, 1.6))
    .sort((a, b) => luminance(a) - luminance(b));
}

// Deterministic, seedable shuffle (mulberry32) of everything *between* the
// darkest and lightest stop, so "generate another version" gives a
// genuinely different look using the same palette, while the darkest line
// colour and the white-paper fade (which depend on the two ends staying put)
// stay consistent and correct.
function shuffleMiddle(stops: [number, number, number][], seed: number): [number, number, number][] {
  if (stops.length <= 2) return stops;
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

function sampleGradient(stops: [number, number, number][], t: number): [number, number, number] {
  if (stops.length === 1) return stops[0];
  const scaled = t * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(scaled));
  const localT = scaled - i;
  const a = stops[i];
  const b = stops[i + 1];
  return [
    a[0] + (b[0] - a[0]) * localT,
    a[1] + (b[1] - a[1]) * localT,
    a[2] + (b[2] - a[2]) * localT,
  ];
}

function mix(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// Linework gets the full palette gradient; paper always fades to true white
// rather than the palette's lightest swatch, so the page background stays
// white no matter what palette is loaded — only the lines pick up colour.
const INK_END = 0.85; // stretched values below this are "ink": full gradient
const PAPER_START = 0.97; // stretched values above this are pure white
const WHITE: [number, number, number] = [255, 255, 255];

function colourForStretched(stops: [number, number, number][], t: number): [number, number, number] {
  if (t <= INK_END) return sampleGradient(stops, t / INK_END);
  if (t >= PAPER_START) return WHITE;
  const lightestStop = stops[stops.length - 1];
  const fade = (t - INK_END) / (PAPER_START - INK_END);
  return mix(lightestStop, WHITE, fade);
}

function colourForCategoryPixel(categoryColour: [number, number, number], t: number): [number, number, number] {
  if (t <= INK_END) return categoryColour;
  if (t >= PAPER_START) return WHITE;
  const fade = (t - INK_END) / (PAPER_START - INK_END);
  return mix(categoryColour, WHITE, fade);
}

// Categories read straight off a hand-coded reference image (see
// STREETSCAPE_MASK_SRC below) rather than guessed rectangles, so figures
// behind a window, fences next to people etc. are pixel-accurate instead of
// bleeding into whatever a loose box happened to cover.
export type MaskCategory = "people" | "openings" | "roofAndTrees" | "fenceAndChimney" | "plinth" | "other";

const MASK_HUE_CENTERS: { category: MaskCategory; hue: number }[] = [
  { category: "people", hue: 20 }, // walker, dogs, cyclist + bike, grass tufts
  { category: "roofAndTrees", hue: 85 }, // roof cladding/hatching, tree canopies, posts
  { category: "openings", hue: 255 }, // ground-floor windows, door, eave/floor band, birds
  { category: "fenceAndChimney", hue: 305 }, // fence pickets, chimney brick
  { category: "plinth", hue: 335 }, // podium/plinth base walls
];

function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

function classifyMaskPixel(r: number, g: number, b: number): MaskCategory {
  const [h, s, l] = rgbToHsl([r, g, b]);
  if (s < 0.08 || l > 0.97) return "other"; // uncoded / near-white in the reference
  let best: MaskCategory = "other";
  let bestDist = Infinity;
  for (const { category, hue } of MASK_HUE_CENTERS) {
    const dist = hueDistance(h, hue);
    if (dist < bestDist) {
      bestDist = dist;
      best = category;
    }
  }
  return best;
}

// Picks one flat colour per element category from the palette, so each
// reads as a single deliberate colour instead of a scattered per-pixel
// gradient. "openings" (the structural windows/doors/floor band) gets the
// darkest stop for the strongest contrast; "roofAndTrees" gets whichever
// stop is closest to green; "people" gets the most saturated stop, so the
// figures read as a deliberate accent; the remaining two categories take
// what's left, ordered by lightness.
function maskCategoryColours(stops: [number, number, number][]): Record<MaskCategory, [number, number, number]> {
  const used = new Set<number>();
  const pick = (predicate: (rgb: [number, number, number]) => number, fallbackT: number) => {
    let bestIdx = -1;
    let bestScore = -Infinity;
    stops.forEach((s, i) => {
      if (used.has(i)) return;
      const score = predicate(s);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    });
    if (bestIdx === -1) bestIdx = Math.min(stops.length - 1, Math.round((stops.length - 1) * fallbackT));
    used.add(bestIdx);
    return stops[bestIdx];
  };

  // "openings" (windows/doors/floor band) always gets the darkest stop, for
  // the strongest structural contrast — everything else is picked by hue
  // closeness or saturation from whatever's left, each with a fixed
  // fallback position so results stay deterministic for a given palette
  // (no randomness — repeat calls with the same palette give the same look).
  used.add(0);
  const openings = stops[0];

  const roofAndTrees = pick((s) => {
    const [h, sat] = rgbToHsl(s);
    return sat < 0.12 ? -Infinity : -hueDistance(h, 120);
  }, 0.7);

  const people = pick((s) => rgbToHsl(s)[1], 0.3);

  const fenceAndChimney = pick((s) => -hueDistance(rgbToHsl(s)[0], 300), 0.5);

  const plinth = pick((s) => -hueDistance(rgbToHsl(s)[0], 335), 0.85);

  return { openings, roofAndTrees, people, fenceAndChimney, plinth, other: openings };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't load the sample drawing"));
    img.src = src;
  });
}

// A scanned/exported line drawing rarely uses the full 0..1 luminance range —
// "black" linework often sits around 0.5-0.7 and "white" paper around
// 0.92-0.99 once anti-aliasing and JPEG compression have softened thin
// lines. Stretching the image's own actual dark/light range out to 0..1
// first means the linework reliably lands on the gradient's darkest stop
// and the paper on the lightest, instead of both landing in the same
// washed-out band.
function computeContrastRange(data: Uint8ClampedArray): { lo: number; hi: number } {
  const histogram = new Array(256).fill(0);
  let counted = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 10) continue;
    const l = luminance([data[i], data[i + 1], data[i + 2]]);
    histogram[Math.min(255, Math.round(l * 255))]++;
    counted++;
  }
  if (counted === 0) return { lo: 0, hi: 1 };

  const clip = counted * 0.01;
  let lo = 0;
  let seen = 0;
  for (; lo < 255; lo++) {
    seen += histogram[lo];
    if (seen > clip) break;
  }
  let hi = 255;
  seen = 0;
  for (; hi > 0; hi--) {
    seen += histogram[hi];
    if (seen > clip) break;
  }
  if (hi <= lo) return { lo: 0, hi: 1 };
  return { lo: lo / 255, hi: hi / 255 };
}

// Both the bundled drawing and its colour-coded mask are well under this —
// so in practice neither is ever downscaled and every recolour reads pixels
// 1:1 from the original files. Recolouring always starts fresh from those
// pristine sources (never from a previous recoloured result), so running it
// again with a different palette can't compound any loss — each run is the
// same quality as the first.
const MAX_DIMENSION = 3000;

export async function recolourImage(
  src: string,
  paletteHexes: string[],
  seed = 0,
  maskSrc?: string,
): Promise<string> {
  if (paletteHexes.length === 0) throw new Error("Pick at least one palette colour first");
  const stops = shuffleMiddle(sortStops(paletteHexes), seed);

  const img = await loadImage(src);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas isn't supported in this browser");
  if (scale === 1) ctx.imageSmoothingEnabled = false; // no resize needed — keep lines pixel-crisp

  ctx.drawImage(img, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  const { data } = imageData;

  let maskData: Uint8ClampedArray | null = null;
  let catColours: Record<MaskCategory, [number, number, number]> | null = null;
  if (maskSrc) {
    const maskImg = await loadImage(maskSrc);
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = w;
    maskCanvas.height = h;
    const maskCtx = maskCanvas.getContext("2d");
    if (!maskCtx) throw new Error("Canvas isn't supported in this browser");
    maskCtx.drawImage(maskImg, 0, 0, w, h);
    maskData = maskCtx.getImageData(0, 0, w, h).data;
    catColours = maskCategoryColours(stops);
  }

  const { lo, hi } = computeContrastRange(data);
  const range = Math.max(0.001, hi - lo);

  for (let i = 0; i < data.length; i += 4) {
    const l = luminance([data[i], data[i + 1], data[i + 2]]);
    const stretched = Math.min(1, Math.max(0, (l - lo) / range));

    let r: number, g: number, b: number;
    if (maskData && catColours) {
      const category = classifyMaskPixel(maskData[i], maskData[i + 1], maskData[i + 2]);
      [r, g, b] = colourForCategoryPixel(catColours[category], stretched);
    } else {
      [r, g, b] = colourForStretched(stops, stretched);
    }
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

// A hand-coloured copy of streetscape-elevation.jpg, pixel-aligned, where
// people/dogs/bicycle are orange, roof cladding + trees + posts are green,
// windows/doors/the eave band + birds are blue, fence + chimney are purple,
// and the plinth/podium walls are pink. Used purely to classify each pixel
// of the real drawing by category — never shown to the user directly.
export const STREETSCAPE_MASK_SRC = "/samples/streetscape-elevation-mask.png";
