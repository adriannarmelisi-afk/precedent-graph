export const TAG_VOCABULARY: Record<string, string[]> = {
  "Natural Elements": [
    "water", "garden", "landscape", "light", "shadow",
    "topography", "vegetation", "earth", "sky", "coast",
    "wind", "rain", "horizon", "canopy", "microclimate", "seasonality",
  ],
  "Material": [
    "concrete", "timber", "steel", "brick", "glass",
    "stone", "rammed-earth", "ceramic", "copper", "textile",
    "render", "terracotta", "marble", "aluminium", "fabric", "bamboo",
  ],
  "Spatial Quality": [
    "threshold", "compression", "procession", "void",
    "enclosure", "transparency", "datum", "sequence",
    "refuge", "prospect",
    "scale", "proportion", "permeability", "porosity", "circulation", "axis",
  ],
  "Programme": [
    "civic", "domestic", "sacred", "institutional",
    "public-ground", "memorial", "cultural", "educational",
    "commercial", "recreational", "agricultural", "industrial", "hospitality", "workspace",
  ],
  "Concept": [
    "materiality", "tectonic", "adaptive-reuse", "hybrid",
    "boundary", "dialogue", "fragment", "ruin", "palimpsest",
    "in-between",
    "identity", "memory", "narrative", "vernacular", "ecology", "density",
  ],
  "Atmosphere": [
    "warmth", "austerity", "stillness", "movement",
    "rawness", "refinement", "heaviness", "lightness",
    "intimacy", "monumentality", "playfulness", "solemnity", "tension", "drama",
  ],
};

export const ALL_VOCABULARY_TAGS: string[] = Object.values(TAG_VOCABULARY).flat();
