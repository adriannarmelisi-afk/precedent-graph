export interface WikiResult {
  title: string;
  description: string; // short one-line descriptor
  extract: string; // summary paragraph
  imageUrl: string; // thumbnail / original image
  year?: number; // best-effort, parsed from the extract
}

// Free, keyless Wikipedia REST summary API.
// https://en.wikipedia.org/api/rest_v1/page/summary/{title}
export async function fetchWikipediaSummary(query: string): Promise<WikiResult | null> {
  const clean = query.trim().replace(/\s+/g, " ");
  if (!clean) return null;

  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(clean)}`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  if (data.type === "https://mediawiki.org/wiki/HyperSwitch/errors/not_found") return null;

  const extract: string = data.extract ?? "";
  const yearMatch = extract.match(/\b(1[0-9]{3}|20[0-2][0-9])\b/);

  return {
    title: data.title ?? clean,
    description: data.description ?? "",
    extract,
    imageUrl: data.thumbnail?.source ?? data.originalimage?.source ?? "",
    year: yearMatch ? Number(yearMatch[1]) : undefined,
  };
}
