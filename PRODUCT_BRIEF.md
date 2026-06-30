# Product Brief: Precedent Graph — Architecture Studio Research Tool

**Status:** Synced to implementation
**Date:** 2026-06-30
**Assignment:** 11323 AT2 — Part 2 (Mini Application)
**Stack:** Vite + React + TypeScript · Tailwind CSS · D3.js · LocalStorage · html2canvas

> This brief was rewritten from scratch against the actual codebase rather than patched. Earlier drafts described a dark Linear-style theme with a constellation graph as the centrepiece and a Claude API call as a required step — none of that survived contact with the tutor's "avoid paid APIs, be graphically rigorous" guidance and the student's own visual direction. What's below is what's actually built.

---

## 1. Problem Statement

Studio precedent research is usually a loose folder of saved images with no traceable link to the project's own concept and no mechanism for visual consistency across design panels. Students can't easily see how their precedents relate to each other, to their concept language, or to a usable colour/material palette — research and design output stay disconnected.

---

## 2. Relationship to Part 1 (Conceptassistant Skill)

This app is the downstream tool from the **Conceptassistant Claude Skill** built in Part 1 (assessed separately under "Technical Skills" in the AT2 rubric — out of scope for this brief).

```
Conceptassistant Skill (Part 1)
  → concept directions + precedent suggestions + research insights
      ↓
Precedent Graph App (Part 2)
  → log precedents → tag against a concept → extract palette + materials
  → confirm real influences → see palette on sample drawing → export a style kit
```

---

## 3. Product Overview

A single-page web app, organised into five views reached via horizontal tabs (**Library / Project / Connections / Sample Drawing / Export**), where a student:

1. Maintains a precedent library — 70 real entries sourced from Divisare, each with a real colour palette and (where visually evidenced) material swatches extracted directly from its image
2. Defines their own project as a permanent singleton — title, concept summary, concept tags — and gets deterministic tag suggestions from their own summary text
3. Marks precedents as **influences**, which builds a combined colour palette and material set, and always draws a connection to the project in the constellation graph regardless of shared tags
4. Optionally runs **Analyse** to rank logged precedents against their concept tags and surface concept gaps — offline and free by default, with an optional Claude comparison if the student supplies their own API key
5. Previews their palette applied live to a real architectural streetscape drawing, cycling between four render styles, and downloads any version as a PNG
6. Exports a one-page PNG style kit — palette, materials, concept tags, graphic key, and a source-precedent citation list — previewed live before download

Data lives entirely in the browser (`localStorage`). No login, no database, no required network calls.

---

## 4. Core Data Model

### 4.1 Precedent

```ts
interface Precedent {
  id: string;
  name: string;
  architect: string;
  year: number;
  demonstrates: string;        // factual note (often location/typology); never a fabricated design claim
  tags: string[];               // slugified controlled-vocabulary tags
  swatches: Swatch[];           // up to 10, k-means extracted from the real image
  isInfluence: boolean;
  imageUrl: string;
  materialTextures?: Record<string, string>; // optional real uploaded texture per material tag
}
```

### 4.2 Swatch

```ts
interface Swatch {
  hex: string;      // extracted by canvas k-means, never manually typed
  label: string;     // student labels after extraction; blank is rendered as just the hex, not "Unlabelled"
  sourceId: string;
}
```

### 4.3 Project (singleton)

```ts
interface Project {
  id: "project";
  title: string;
  summary: string;
  tags: string[];
  influenceIds: string[]; // kept in sync with precedents' isInfluence flags
}
```

### 4.4 Tag Vocabulary

Unchanged structure, six categories in `tagVocabulary.ts` (Natural Elements, Material, Spatial Quality, Programme, Concept, Atmosphere). Free-text entry is still permitted as a fallback; everything is slugified on save.

### 4.5 State Shape

```ts
interface AppState {
  precedents: Precedent[];
  project: Project;
  ui: {
    selected: string | null;
    activeTagFilters: string[];
    analyseResult: AnalyseResult | null;
  };
  nodePositions: Record<string, { x: number; y: number }>;
}
```

Persisted to `localStorage` under `"precedent-graph-v1"`. The write is wrapped in a try/catch — if the quota is exceeded (e.g. several uploaded material textures), the app keeps running in-memory rather than crashing. On first load, any seed precedents not yet in the stored library are merged in automatically, so returning visitors always see the full library after updates.

---

## 5. Features

### 5.1 Wikipedia Auto-Fill (deterministic, not AI)

Typing a building name and clicking "Look up" fetches `https://en.wikipedia.org/api/rest_v1/page/summary/{title}` (free, keyless) and auto-fills architect/year/description/thumbnail. For buildings not on Wikipedia, a student pastes any image URL instead.

### 5.2 Colour Extraction — with selectable count and two real-world fallbacks

```
Image URL → try direct canvas read
  → blocked by CORS (common on Dezeen/Divisare)? retry via images.weserv.nl (free, keyless proxy)
    → still fails? student uploads the file directly (FileReader, never cross-origin, always works)
  → k-means cluster (k = student's choice: 3 / 5 / 7 / 10) → hex swatches, unlabelled until named
```

The colour count is selectable via pill buttons (3 / 5 / 7 / 10) directly on the Add Precedent form, defaulting to 7. Pure client-side. The proxy fallback was verified against a real Divisare image during development; the same image that fails direct canvas access succeeds through the proxy.

### 5.3 Suggest Tags From Concept (deterministic, not AI)

Scans the project's free-text concept summary against a synonym/trigger map (`TAG_TRIGGERS` in `tagUtils.ts`) and proposes matching controlled-vocabulary tags for one-tap add. No network call.

### 5.4 Material Palette (two-tier)

1. **Automatic** — every Material-vocabulary tag (concrete, timber, steel, brick, glass, stone, rammed-earth, ceramic, copper, textile) a precedent carries renders as a procedurally generated SVG texture pattern (`MaterialSwatch.tsx`) — pure vector, no images, no network, renders identically in the app and in the html2canvas export.
2. **Manual override** — a student can upload a real texture (e.g. a download from architextures.org, which has no API and must be sourced by hand) per material tag on a precedent; the upload replaces the generated pattern wherever that swatch appears.

### 5.5 Analyse — offline-first, Claude optional

Per the tutor's explicit guidance to avoid paid APIs and not spend more than necessary, this is dual-mode and **offline by default**:

```ts
if (!API_KEY) return localAnalyse(project, precedents);  // always available, free, instant
// only if the student supplies their own VITE_ANTHROPIC_API_KEY:
try { return await claudeAnalyse(...) } catch { return localAnalyse(...) } // any failure falls back silently
```

`localAnalyse` ranks precedents by shared-tag count with the project and lists project tags no logged precedent covers ("gaps"). The optional Claude path (`claude-haiku-4-5-20251001`, called directly from the browser with `anthropic-dangerous-direct-browser-access`) returns the same shape with richer natural-language reasoning. The result panel always shows which source ("claude" or "offline") produced the recommendation — this is also explained to the student directly in the Settings panel, since it's a real position on AI's role, not just an implementation detail.

### 5.6 Sample Drawing — live palette on real linework

A hand-categorised architectural streetscape SVG (people, trees, roof, wall, fence, windows, ground) is recoloured live from the student's influence palette. Four render styles cycle on "Generate another version":

| Style | What fills |
|---|---|
| Linework | No fills — pure palette-coloured strokes only |
| Glazed windows | Glass panes tinted with a palette colour at low opacity |
| Shaded windows | Glass panes tinted, darker palette mapping |
| Windows + gutter | Glass panes + datum gutter band both filled |

Each category of element is assigned one palette colour deterministically (with a random shuffle on each "generate"). People figures receive a white fill in fill styles so window/gutter tints don't show through their transparent interiors; a cloned stroke-only group is appended at the top of the SVG render order so the original linework detail is always preserved on top.

The student can download any version as a PNG (via html2canvas, scale 2×) directly from the Sample Drawing tab, without going to the Export view.

---

## 6. Graph Model ("Connections" view)

### 6.1 Edges

```ts
// 1. Shared-tag edges between any two nodes (weight = number of shared tags)
// 2. Forced edges: every isInfluence precedent always connects to the project,
//    even with zero shared tags — marking something an influence IS a stated
//    relationship, and the graph should never hide that.
```

Edge stroke opacity scales with weight (`0.15 + weight × 0.18`, capped at 0.75) so single-tag ties fade back and strong multi-tag ties read clearly even with 70+ nodes on screen.

### 6.2 Node Behaviour

- The project node is a red diamond, **permanently pinned** to the centre of the canvas (or wherever the student last dragged it) — it never drifts under the force simulation's repulsion, unlike precedent nodes.
- Labels are hidden by default and reveal on hover, except for the project node and any influence/recommended precedent, which stay labelled — this was a deliberate fix once the library grew to 70 nodes and permanent labels became unreadable clutter.
- Clicking the project node switches the active view to **Project** (not just a same-page scroll-to, since Project now has its own screen).
- When no project tags have been set, the Connections view shows an empty state with a direct "Go to Project →" link rather than an empty graph, guiding the student to define their concept first.

### 6.3 D3 Force Layout

`forceManyBody` (strength −900), `forceLink` (distance 140–320 scaled inversely by tie weight), `forceCollide` (radius 60), `forceCenter`. Drag, zoom, pan enabled; dragged precedent positions persist to `localStorage`.

### 6.4 Tag Filter Mode

Unchanged: non-matching nodes dim to 15% opacity, union logic across multiple active tags, pure UI state — no re-simulation.

---

## 7. Palette Logic

```ts
palette = precedents.filter(p => p.isInfluence).flatMap(p => p.swatches).dedupe(by hex)
materials = precedents.filter(p => p.isInfluence).flatMap(p => materialTagsOf(p.tags)).dedupe(by tag)
```

Both are plain hooks (`usePalette.ts`, `useMaterialPalette.ts`) that recompute via `useMemo` whenever precedents change — no stored derived state.

---

## 8. Style Kit Export ("Export" view)

Previously rendered off-screen and downloaded blind; now shown as a **live, visible preview** in its own view before the student clicks "Download PNG" — a usability fix, since exporting something you can't see first is a bad pattern.

Sections, top to bottom:
1. Title + concept summary
2. Concept tags
3. Palette grid — colour, hex (or material label if the student set one), source building
4. Materials row — texture swatch, material name, source building
5. Graphic key (node/edge legend) + **Source precedents** list (name, architect, year of every influence) — replaced an earlier generic "Aa Bb Cc" typeface specimen, since a citation list is actual evidence for the work, not decoration

Built entirely with inline hex styling (no Tailwind classes, no CSS custom properties) so `html2canvas` never hits an unsupported colour function — verified against the app's real light-theme palette, which is plain hex already, but kept deliberately conservative.

---

## 9. Settings Panel

Opens from the header gear icon. Three sections, each tied to something real rather than a toggle for its own sake:
- **About this tool** — states the actual design problem in one paragraph, and explains the offline-by-default Analyse decision in the student's own words (this doubles as visible evidence for the AT2 critical-reflection criterion, not just something explained verbally).
- **Data** — Reset project (clears title/summary/tags/influences, keeps the library) and Reset everything (full restore to the seed library), both confirm-gated.
- **Tips** — Wikipedia lookup hint, and the image-upload fallback hint.

---

## 10. Navigation & Layout

- **Header**: title, live counts, a collapse toggle (☰) for the right inspector panel, settings gear. Header uses an animated gradient that shifts subtly between warm off-whites and a red tint, matching the app's editorial palette.
- **View tabs** (horizontal, underline-active style): Library / Project / Connections / Sample Drawing / Export — replaced an earlier single long scrolling page once the precedent count grew and a left-sidebar nav variant, both of which were tried and rejected as visually worse than a clean horizontal tab strip.
- **Right inspector panel** (Library & Connections views only): tag filter chips, selected-precedent detail (swatches, materials, tags, edit/delete), live palette. Collapsible via the header toggle so the Library grid can use the full width when filters aren't needed.
- **Project**, **Sample Drawing**, and **Export** views intentionally have no right panel — it isn't relevant there.

---

## 11. Architecture Decisions

### ADR-01: State — React Context + `useReducer`
Unchanged from the original plan. No async middleware needed.

### ADR-02: D3 owns the SVG
D3 mutates the SVG DOM directly on tick; React owns everything outside `<svg>`.

### ADR-03: Analyse is offline-first, not Claude-first
Reversed from the original brief. The tutor's announcement explicitly asked students to avoid paid APIs and not spend more than necessary — a deterministic tag-overlap ranking satisfies the same product need (which precedents genuinely relate to the concept) without any cost or network dependency. Claude remains available as an enhancement, never a requirement.

### ADR-04: CORS proxy → file upload, not "give up"
Pasting a Dezeen/Divisare image URL frequently fails direct canvas reads due to missing CORS headers. Rather than declare those sites unsupported, the app retries through a free public proxy, then falls back to local file upload (which is never cross-origin). This was tested against a real failing case before being trusted.

### ADR-05: Procedural SVG materials, not scraped textures
architextures.org has no API and is licensed for manual, one-at-a-time downloads — not automated scraping. Building a deterministic, offline SVG pattern per material tag gets full automatic coverage for free; a manual upload path covers the cases where a student wants a specific real texture.

### ADR-06: Visual material tagging, not guessed tagging
Material tags were added by downloading and visually inspecting all precedent images, not by inferring from project titles. Images that were illustrations, diagrams, or physical-model photos where no material was visually legible were deliberately left untagged rather than guessed.

### ADR-07: Styling — Tailwind + CSS custom properties (light/red theme)
The original dark Linear-style theme was replaced with a light "paper" theme (greyscale + red accent) per the student's own direction and the tutor's "graphically rigorous, not AI slop" guidance. All theme tokens are plain hex values in `index.css`, which also made the html2canvas export safe without extra conversion work.

### ADR-08: Sample Drawing — SVG overlay, not canvas redraw
The streetscape SVG is hand-categorised with `data-cat` attributes per element group. Fills are applied via a separately inserted `<g data-role="glass-overlay">` as the first SVG child (so it renders behind all linework), while people elements receive a white fill with a cloned stroke-only group appended last (so linework always renders on top). This avoids touching the source artwork's fill attributes and means the drawing degrades cleanly to pure linework (style 0) with no DOM state to undo.

---

## 12. Component Architecture (actual)

```
src/
├── main.tsx
├── App.tsx                          # root layout, view-tab state, all handlers
├── types.ts
├── store/
│   ├── appStore.tsx                 # Context + useReducer + localStorage sync (try/catch)
│   ├── actions.ts                   # typed action creators, incl. resetProject/resetAll
│   └── seedData.ts                  # 70 real precedents sourced from Divisare
├── data/
│   └── tagVocabulary.ts
├── assets/
│   └── streetscape-elevation.svg    # hand-categorised with data-cat attributes
├── components/
│   ├── graph/
│   │   ├── Graph.tsx                # SVG container, D3 simulation lifecycle, project pin
│   │   ├── NodeLayer.tsx            # hover-reveal labels, diamond/circle shapes
│   │   └── EdgeLayer.tsx            # weight-scaled opacity
│   ├── precedent/
│   │   ├── PrecedentCard.tsx
│   │   └── PrecedentForm.tsx        # Wikipedia lookup, colour count selector, colour + material texture upload
│   ├── drawing/
│   │   └── DrawingRecolour.tsx      # live SVG recolouring, 4 fill styles, PNG download
│   ├── sidebar/
│   │   ├── ProjectPanel.tsx         # singleton project editor + Suggest-tags + Analyse trigger
│   │   └── TagInput.tsx
│   ├── tags/TagFilterPanel.tsx
│   ├── analyse/AnalysePanel.tsx     # shows recommendations/gaps + claude-vs-offline badge
│   ├── palette/SwatchChip.tsx
│   ├── materials/MaterialSwatch.tsx # procedural SVG patterns + manual image override
│   ├── export/StyleKitExport.tsx    # inline-hex, html2canvas-safe export sheet
│   ├── settings/SettingsPanel.tsx
│   └── nav/NavSidebar.tsx           # horizontal view-tab strip (despite the filename)
├── hooks/
│   ├── useGraph.ts
│   ├── usePalette.ts
│   └── useMaterialPalette.ts
└── utils/
    ├── graphUtils.ts                # computeEdges incl. forced influence→project edges
    ├── tagUtils.ts                  # slugify, normalise, suggestTagsFromText, TAG_TRIGGERS
    ├── materialUtils.ts             # getMaterialTags
    ├── colourUtils.ts               # canvas extraction, proxy fallback, file fallback
    ├── svgRecolour.ts               # assignCategoryColours for the sample drawing
    ├── wikipediaUtils.ts
    └── analyseInfluences.ts         # offline-first, optional Claude
```

---

## 13. Precedent Library

70 real precedents (not placeholder seed data), sourced from a student-curated list of Divisare links — name, architect, year, location, and image for each. Colour palettes (up to 7 swatches each) were extracted programmatically from the real images, with an automatic CORS-proxy fallback where the direct read was blocked. Material tags were added by visually inspecting every image; tags were only applied where a material was clearly evidenced in the photo.

The library covers a deliberately broad tag spread across all six vocabulary categories (Natural Elements, Material, Spatial Quality, Programme, Concept, Atmosphere), with particular depth in: domestic, civic, institutional, cultural, memorial, agricultural, hospitality, adaptive-reuse, vernacular, rammed-earth, stone, timber, concrete, terracotta, landscape, water, light, shadow, threshold, procession, stillness, and playfulness.

---

## 14. Constraints

| Constraint | How enforced |
|---|---|
| Avoid paid APIs by default | Analyse runs offline unless the student supplies their own key; Wikipedia and the image proxy are free/keyless |
| No fabricated content | Material tags, "demonstrates" notes, and the optional API key are never invented — left blank where there's no real evidence |
| Every palette colour traces to a source | `Swatch.sourceId` always set; export and live palette always show provenance |
| Tags consistent | Slugified on save; controlled vocabulary by default, free text as fallback |
| Storage failures don't crash the app | `localStorage.setItem` wrapped in try/catch |
| API key never required, never hardcoded | `.env`-only, optional, dual-mode fallback always present |
| Library always up to date | Seed merge on load — new precedents added to `seedData.ts` appear automatically for returning visitors |

---

## 15. Where AI Adds Value vs. Where It Doesn't

| Task | What does it | Why |
|---|---|---|
| Building info lookup | Wikipedia REST fetch | Deterministic, fast, accurate |
| Colour palette | Canvas k-means extraction | Deterministic — guessing colours would be worse than measuring them |
| Material identification | Direct visual inspection (by the developer, once) baked into seed data | Verifiable from the photo; no ongoing inference needed at runtime |
| Tag connections / graph edges | Rule-based shared-tag function | Precision matters; shared tags are facts, not interpretations |
| Concept-tag suggestions | Deterministic keyword/synonym matching | Transparent and free; good enough for a controlled vocabulary |
| Ranking precedents against a concept | Offline tag-overlap by default; optional Claude for richer reasoning | Most of the value is structural (shared tags); language-level nuance is where Claude genuinely adds something a rule can't |
| Sample drawing recolouring | Deterministic palette assignment per SVG category | Measuring real extracted colours and applying them to real linework produces a more honest output than generating or guessing |

This split is the actual evidence for the critical-reflection criterion: AI was deliberately kept optional and was added only where rule-based logic clearly couldn't do the job — not because Claude was available, but because everywhere else, a transparent, free, deterministic approach was the stronger design choice.
