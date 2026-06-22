export const TAG_VOCABULARY: Record<string, string[]> = {
  "Natural Elements": [
    "water", "garden", "landscape", "light", "shadow",
    "topography", "vegetation", "earth", "sky", "coast",
  ],
  "Material": [
    "concrete", "timber", "steel", "brick", "glass",
    "stone", "rammed-earth", "ceramic", "copper", "textile",
  ],
  "Spatial Quality": [
    "threshold", "compression", "procession", "void",
    "enclosure", "transparency", "datum", "sequence",
    "refuge", "prospect",
  ],
  "Programme": [
    "civic", "domestic", "sacred", "institutional",
    "public-ground", "memorial", "cultural", "educational",
  ],
  "Concept": [
    "materiality", "tectonic", "adaptive-reuse", "hybrid",
    "boundary", "dialogue", "fragment", "ruin", "palimpsest",
    "in-between",
  ],
  "Atmosphere": [
    "warmth", "austerity", "stillness", "movement",
    "rawness", "refinement", "heaviness", "lightness",
  ],
};

export const ALL_VOCABULARY_TAGS: string[] = Object.values(TAG_VOCABULARY).flat();
