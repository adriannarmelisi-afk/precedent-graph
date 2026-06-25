// Recolours a line drawing by remapping its greyscale luminance onto a
// gradient built from the project's own palette — duotone for 2 colours,
// smoothly multi-toned for more. Pure client-side canvas work, no network.
//
// This is intentionally scoped to one bundled, known-clean reference drawing
// (a CAD plan export — thin uniform grey lines on white) rather than
// arbitrary student uploads. Real-world uploads vary wildly in contrast,
// noise and line weight, which made the recolour look muddy and
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

// Sorts swatches dark-to-light so luminance 0 maps to the darkest colour
// (the linework) and luminance 1 maps to the lightest (the paper).
function sortStops(hexes: string[]): [number, number, number][] {
  return hexes.map(hexToRgb).sort((a, b) => luminance(a) - luminance(b));
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

const MAX_DIMENSION = 1600;

export async function recolourImage(src: string, paletteHexes: string[]): Promise<string> {
  if (paletteHexes.length === 0) throw new Error("Pick at least one palette colour first");
  const stops = sortStops(paletteHexes);

  const img = await loadImage(src);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas isn't supported in this browser");

  ctx.drawImage(img, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  const { data } = imageData;

  const { lo, hi } = computeContrastRange(data);
  const range = Math.max(0.001, hi - lo);

  for (let i = 0; i < data.length; i += 4) {
    const l = luminance([data[i], data[i + 1], data[i + 2]]);
    const stretched = Math.min(1, Math.max(0, (l - lo) / range));
    const [r, g, b] = sampleGradient(stops, stretched);
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}
