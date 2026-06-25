import type { Precedent, Project } from "../types";
import { ALL_VOCABULARY_TAGS } from "../data/tagVocabulary";

export function slugify(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normaliseTags(tags: string[]): string[] {
  return Array.from(new Set(tags.map(slugify).filter(Boolean)));
}

// Synonyms / morphological variants that should trigger a vocabulary tag.
// Tags not listed here are matched by their own word (e.g. "concrete" -> concrete).
// Kept high-precision on purpose — a tutor should be able to defend each match.
const TAG_TRIGGERS: Record<string, string[]> = {
  light: ["light", "daylight", "sunlight", "luminous"],
  shadow: ["shadow", "shade", "shadows"],
  topography: ["topography", "terrain", "slope", "sloping", "contour", "landform"],
  vegetation: ["vegetation", "planting", "plants", "greenery", "foliage"],
  earth: ["earth", "soil", "ground", "rammed"],
  coast: ["coast", "coastal", "shore", "sea", "ocean"],
  timber: ["timber", "wood", "wooden"],
  stone: ["stone", "masonry"],
  "rammed-earth": ["rammed earth", "rammed-earth"],
  threshold: ["threshold", "thresholds", "entry", "entrance", "gateway", "doorway"],
  compression: ["compression", "compressed", "compress", "narrow", "narrowing"],
  procession: ["procession", "processional", "processing"],
  void: ["void", "voids", "empty", "hollow"],
  enclosure: ["enclosure", "enclosed", "enclose", "enclosing"],
  transparency: ["transparency", "transparent"],
  sequence: ["sequence", "sequential", "sequenced"],
  refuge: ["refuge", "shelter", "sheltered"],
  prospect: ["prospect", "outlook", "vista"],
  civic: ["civic", "town", "municipal"],
  domestic: ["domestic", "house", "home", "dwelling", "residential"],
  sacred: ["sacred", "church", "chapel", "temple", "spiritual", "worship"],
  "public-ground": ["public ground", "public-ground", "public"],
  memorial: ["memorial", "remembrance", "commemorate", "commemoration"],
  educational: ["educational", "school", "university", "learning"],
  materiality: ["materiality", "material", "materials"],
  tectonic: ["tectonic", "tectonics", "construction", "joinery"],
  "adaptive-reuse": ["adaptive reuse", "adaptive-reuse", "reuse", "retrofit", "renovation"],
  boundary: ["boundary", "boundaries", "edge", "edges"],
  dialogue: ["dialogue", "conversation", "exchange"],
  fragment: ["fragment", "fragments", "fragmented", "fragmentary"],
  ruin: ["ruin", "ruins", "ruined"],
  palimpsest: ["palimpsest", "layered", "layering", "layers"],
  "in-between": ["in between", "in-between", "interstitial", "liminal"],
  warmth: ["warmth", "warm"],
  austerity: ["austerity", "austere", "spare", "ascetic"],
  stillness: ["stillness", "still", "quiet", "calm", "silence", "silent"],
  movement: ["movement", "moving", "flow", "dynamic"],
  rawness: ["rawness", "raw", "rough"],
  refinement: ["refinement", "refined", "delicate", "precise"],
  heaviness: ["heaviness", "heavy", "mass", "massive", "weight"],
  lightness: ["lightness", "weightless", "floating", "airy"],
  wind: ["wind", "breeze", "ventilation", "windy"],
  rain: ["rain", "rainfall", "rainwater"],
  horizon: ["horizon", "horizontal", "skyline"],
  canopy: ["canopy", "canopies", "overhang"],
  microclimate: ["microclimate"],
  seasonality: ["seasonality", "seasonal", "seasons"],
  render: ["render", "rendered", "plaster"],
  terracotta: ["terracotta"],
  marble: ["marble"],
  aluminium: ["aluminium", "aluminum"],
  fabric: ["fabric", "cloth", "upholstery"],
  bamboo: ["bamboo"],
  scale: ["scale", "scalar"],
  proportion: ["proportion", "proportional", "proportions"],
  permeability: ["permeability", "permeable"],
  porosity: ["porosity", "porous"],
  circulation: ["circulation", "wayfinding"],
  axis: ["axis", "axial"],
  commercial: ["commercial", "retail", "shop", "shopfront"],
  recreational: ["recreational", "recreation", "leisure"],
  agricultural: ["agricultural", "agriculture", "farm", "farming"],
  industrial: ["industrial", "industry", "factory", "warehouse"],
  hospitality: ["hospitality", "hotel", "hospitality venue"],
  workspace: ["workspace", "office", "coworking"],
  identity: ["identity"],
  memory: ["memory", "remembering", "nostalgia"],
  narrative: ["narrative", "story", "storytelling"],
  vernacular: ["vernacular"],
  ecology: ["ecology", "ecological", "biodiversity"],
  density: ["density", "dense", "compact"],
  intimacy: ["intimacy", "intimate"],
  monumentality: ["monumentality", "monumental", "monument"],
  playfulness: ["playfulness", "playful", "whimsical"],
  solemnity: ["solemnity", "solemn"],
  tension: ["tension", "tense"],
  drama: ["drama", "dramatic", "theatrical"],
};

// Reads free-text concept summary and returns matching vocabulary tags.
// Deterministic, offline — scans tokens (and a few phrases) against the vocabulary.
export function suggestTagsFromText(text: string): string[] {
  const lower = text.toLowerCase();
  const tokens = new Set(lower.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean));

  const found: string[] = [];
  for (const tag of ALL_VOCABULARY_TAGS) {
    const triggers = TAG_TRIGGERS[tag] ?? [tag.replace(/-/g, " ")];
    const hit = triggers.some((t) => (t.includes(" ") ? lower.includes(t) : tokens.has(t)));
    if (hit) found.push(tag);
  }
  return found;
}

// Deterministic accent colour per tag — same tag always gets the same hue, so
// a concept tag's colour stays consistent everywhere it's shown in the Library.
export function tagAccentColour(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) % 360;
  return `hsl(${hash}, 55%, 45%)`;
}

export function allTagsInUse(precedents: Precedent[], project: Project): string[] {
  const tags = new Set<string>();
  precedents.forEach((p) => p.tags.forEach((t) => tags.add(t)));
  project.tags.forEach((t) => tags.add(t));
  return Array.from(tags).sort();
}
