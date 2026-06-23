// Free, keyless climate lookup: geocode a typed location (OpenStreetMap
// Nominatim), then pull a year of real daily climate data for those
// coordinates (Open-Meteo archive). No API key, no account, no cost —
// both services are public and require neither registration nor a key.

export interface ClimateResult {
  summary: string;
  tags: string[];
}

interface GeocodeHit {
  lat: string;
  lon: string;
  display_name: string;
}

async function geocodeLocation(query: string): Promise<GeocodeHit | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as GeocodeHit[];
  return data[0] ?? null;
}

interface DailyClimate {
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_sum: number[];
}

async function fetchYearClimate(lat: string, lon: string): Promise<DailyClimate | null> {
  // Most recently completed full calendar year — the archive API needs a
  // closed date range, so "now" isn't queryable.
  const year = new Date().getFullYear() - 1;
  const url =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}` +
    `&start_date=${year}-01-01&end_date=${year}-12-31` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data.daily ?? null;
}

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// Deterministic, simplified passive-design heuristic — not a substitute for
// real climate analysis, but a defensible first pass: heat needs shade and
// mass, cold needs enclosure and warmth, a big diurnal swing rewards thermal
// mass, low rainfall implies earth/arid construction, high rainfall implies
// water-conscious, coastal-leaning design.
function climateToTags(avgMax: number, avgMin: number, totalPrecipMm: number): string[] {
  const tags = new Set<string>();
  if (avgMax >= 28) tags.add("shadow").add("heaviness");
  if (avgMax <= 14) tags.add("warmth").add("enclosure");
  if (avgMax - avgMin >= 12) tags.add("stone").add("heaviness");
  if (totalPrecipMm < 300) tags.add("earth").add("austerity");
  if (totalPrecipMm > 1400) tags.add("water").add("coast");
  return Array.from(tags);
}

export async function fetchClimateForLocation(query: string): Promise<ClimateResult | null> {
  const hit = await geocodeLocation(query);
  if (!hit) return null;

  const daily = await fetchYearClimate(hit.lat, hit.lon);
  if (!daily) return null;

  const avgMax = average(daily.temperature_2m_max);
  const avgMin = average(daily.temperature_2m_min);
  const totalPrecip = daily.precipitation_sum.reduce((sum, v) => sum + v, 0);

  const tags = climateToTags(avgMax, avgMin, totalPrecip);
  const summary = `${hit.display_name.split(",").slice(0, 2).join(",")} — avg ${avgMax.toFixed(0)}°/${avgMin.toFixed(0)}° max/min, ${totalPrecip.toFixed(0)}mm rain/yr`;

  return { summary, tags };
}
