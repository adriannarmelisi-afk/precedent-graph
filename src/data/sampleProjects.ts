import type { SiteContext } from "../types";

export interface SampleProject {
  title: string;
  summary: string;
  tags: string[];
  site: SiteContext;
  influenceIds: string[];
}

// Worked example concepts for the "generate sample project" button — each
// pulls from a different cluster of the seed precedent library so a tutor
// testing the app cold sees a different, fully-populated demo each click.
export const SAMPLE_PROJECTS: SampleProject[] = [
  {
    title: "Threshold House",
    summary:
      "A coastal home for a family that wants to slow down at the boundary between inside and outside — deep verandahs, timber screens and a sequence of thresholds mediate sun, wind and privacy rather than sealing them out.",
    tags: ["domestic", "coast", "timber", "threshold", "vernacular", "refuge"],
    site: { location: "Sorrento, Mornington Peninsula", orientation: "north-facing", constraint: "exposed coastal wind" },
    influenceIds: ["sorrento-house", "ironbark-house", "entre-deux-ponts"],
  },
  {
    title: "Common Ground Pavilion",
    summary:
      "A civic pavilion that reuses an under-used public threshold, opening a permeable ground floor that lets the street pass through rather than stop at a facade — adaptive reuse as a way of keeping the site in dialogue with its city.",
    tags: ["civic", "public-ground", "adaptive-reuse", "dialogue", "permeability"],
    site: { location: "Inner-city laneway site", orientation: "east-facing", constraint: "heritage facade retention" },
    influenceIds: ["obr-mind-west-gate", "gautier-rey-fundamental", "renaissance-piazza"],
  },
  {
    title: "Palimpsest Museum",
    summary:
      "A cultural institution built into the memory of an existing structure, using rammed-earth and stone additions to stage a dialogue between old and new — the building as a layered record rather than a clean slate.",
    tags: ["cultural", "institutional", "dialogue", "materiality", "identity"],
    site: { location: "Regional civic precinct", orientation: "south-facing", constraint: "adjacent heritage-listed structure" },
    influenceIds: ["museo-nacional-afganistan", "landesmuseum-zurich", "guggenheim-helsinki"],
  },
  {
    title: "Tidal Commons Baths",
    summary:
      "An adaptive reuse of a tired civic swimming pool, wrapping a lightweight timber skin around the existing structure so heritage fabric, water and a renewed public ritual can sit together without one erasing the other.",
    tags: ["civic", "adaptive-reuse", "water", "timber", "lightness"],
    site: { location: "Coastal civic baths", orientation: "north-facing", constraint: "heritage-listed pool structure" },
    influenceIds: ["public-pool-brittany", "gyrasium-sport", "renaissance-piazza"],
  },
];
