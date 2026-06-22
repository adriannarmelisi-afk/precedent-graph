// Pure client-side colour extraction. No network, no AI — draws the image to an
// offscreen canvas, samples pixels, and k-means clusters them into a small palette.

function rgbToHex([r, g, b]: number[]): string {
  return (
    "#" +
    [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase()
  );
}

function dist2(a: number[], b: number[]): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

function kmeans(points: number[][], k: number, iters: number): number[][] {
  let centroids: number[][] = [];
  for (let i = 0; i < k; i++) {
    centroids.push(points[Math.floor(((i + 0.5) / k) * points.length)].slice());
  }

  const assignment = new Array(points.length).fill(0);

  for (let it = 0; it < iters; it++) {
    for (let p = 0; p < points.length; p++) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < centroids.length; c++) {
        const d = dist2(points[p], centroids[c]);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      assignment[p] = best;
    }

    const sums = centroids.map(() => [0, 0, 0, 0]);
    for (let p = 0; p < points.length; p++) {
      const c = assignment[p];
      sums[c][0] += points[p][0];
      sums[c][1] += points[p][1];
      sums[c][2] += points[p][2];
      sums[c][3] += 1;
    }
    centroids = sums.map((s, idx) =>
      s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] : centroids[idx],
    );
  }

  const counts = centroids.map(() => 0);
  for (const a of assignment) counts[a] += 1;

  return centroids
    .map((c, i) => ({ c, n: counts[i] }))
    .sort((a, b) => b.n - a.n)
    .map((x) => x.c);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // needed to read pixels from cross-origin images
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image failed to load"));
    img.src = src;
  });
}

export async function extractPalette(src: string, k = 5): Promise<string[]> {
  const img = await loadImage(src);

  const w = 100;
  const h = Math.max(1, Math.round((img.height / img.width) * w));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];

  ctx.drawImage(img, 0, 0, w, h);
  // Throws a SecurityError if the image is cross-origin without CORS headers.
  const { data } = ctx.getImageData(0, 0, w, h);

  const points: number[][] = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 125) continue; // skip transparent pixels
    points.push([data[i], data[i + 1], data[i + 2]]);
  }
  if (points.length === 0) return [];

  const centroids = kmeans(points, Math.min(k, points.length), 10);
  return centroids.map(rgbToHex);
}
