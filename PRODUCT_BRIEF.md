# Product Brief: Precedent Graph — Architecture Studio Research Tool

**Status:** Final  
**Date:** 2026-06-21  
**Assignment:** 11323 AT2 — Part 2 (Mini Application)  
**Stack:** Vite + React · Tailwind · D3.js · LocalStorage · Vercel · Anthropic API

---

## 1. Problem Statement

Studio research is a loose folder of images with no traceable link to the final project and no mechanism for visual consistency across design panels. Students cannot see how their precedent research relates to each other or to their own project, and palette choices are ad hoc rather than grounded in source material.

---

## 2. Relationship to Part 1 (Conceptassistant Skill)

This app is the direct downstream tool from the **Conceptassistant Claude Skill** built in Part 1.

The Conceptassistant Skill handles the AI reasoning — synthesising a project brief into concept directions and initial precedent suggestions. The Precedent Graph app picks up from there, giving those suggestions a visual structure and turning them into a traceable, exportable reference.

**The handoff:**

```
Conceptassistant Skill (Part 1)
  → concept directions + precedent suggestions + research insights
      ↓
Precedent Graph App (Part 2)
  → log precedents → visualise connections → generate palette → export style kit
```

Neither is complete without the other. Together they form a full AI-assisted design research workflow.

---

## 3. Product Overview

A single-page web application hosted on Vercel where architecture students:

1. Log precedent buildings — auto-populated from Wikipedia, palette extracted from photography automatically
2. See those precedents as an interactive node graph, auto-connected by shared concept tags
3. Use a Claude-powered Analyse feature to identify which logged precedents are real influences on their project
4. Generate a traceable material palette — every colour tied back to its source building
5. Export a style kit (palette + graphic language) as a reference image for building design panels

Each student's data lives in their own browser (localStorage). No login, no database, no account — open the URL and start.

---

## 4. Core Data Model

### 4.1 Precedent

```ts
interface Precedent {
  id: string;           // uuid
  name: string;         // building name
  architect: string;
  year: number;
  demonstrates: string; // one specific note, e.g. "Concrete as thermal mass — weight anchors the courtyard"
  tags: string[];       // slugified vocabulary tags, e.g. ["concrete", "threshold", "civic"]
  swatches: Swatch[];   // auto-extracted from image, up to 5
  isInfluence: boolean; // true = included in palette and Analyse output
  imageUrl: string;     // auto-populated from Wikipedia or student upload
}
```

### 4.2 Swatch

```ts
interface Swatch {
  hex: string;      // e.g. "#C4B49A" — extracted by canvas, not manually entered
  label: string;    // e.g. "Weathered concrete" — student labels after extraction
  sourceId: string; // precedent id — every colour traces back to a building
}
```

### 4.3 Project

```ts
interface Project {
  id: "project";        // singleton
  title: string;
  summary: string;
  tags: string[];       // concept tags — drives connections to precedents in graph
  influenceIds: string[]; // confirmed by student after Analyse
}
```

### 4.4 Tag Vocabulary

Tags are drawn from a pre-embedded controlled vocabulary in `tagVocabulary.ts`. This ensures consistency — "garden" and "gardens" cannot diverge, so graph edges are always meaningful.

```ts
export const TAG_VOCABULARY: Record<string, string[]> = {
  "Natural Elements": [
    "water", "garden", "landscape", "light", "shadow",
    "topography", "vegetation", "earth", "sky", "coast"
  ],
  "Material": [
    "concrete", "timber", "steel", "brick", "glass",
    "stone", "rammed-earth", "ceramic", "copper", "textile"
  ],
  "Spatial Quality": [
    "threshold", "compression", "procession", "void",
    "enclosure", "transparency", "datum", "sequence",
    "refuge", "prospect"
  ],
  "Programme": [
    "civic", "domestic", "sacred", "institutional",
    "public-ground", "memorial", "cultural", "educational"
  ],
  "Concept": [
    "materiality", "tectonic", "adaptive-reuse", "hybrid",
    "boundary", "dialogue", "fragment", "ruin", "palimpsest",
    "in-between"
  ],
  "Atmosphere": [
    "warmth", "austerity", "stillness", "movement",
    "rawness", "refinement", "heaviness", "lightness"
  ],
}
```

Free-text entry is permitted as fallback. All tags stored as slugs — normalised to lowercase, hyphenated on save.

### 4.5 State Shape

```ts
interface AppState {
  precedents: Precedent[];
  project: Project;
  ui: {
    selected: string | null;
    sidebarMode: "add" | "edit" | "palette" | "export" | "analyse" | null;
    activeTagFilters: string[];   // tags currently filtering the graph
    analyseResult: AnalyseResult | null; // Claude's last response
  };
}

interface AnalyseResult {
  recommendations: {
    precedentId: string;
    reason: string; // one sentence from Claude
  }[];
  gaps: string[]; // themes Claude noticed are missing
}
```

Persisted to `localStorage` under key `"precedent-graph-v1"`. On first load, seed data (15–20 precedents) is written if the key is absent.

---

## 5. AI Features

### 5.1 Wikipedia Auto-Fill (automated, not AI)

When a student types a building name in the Add Precedent form:

```
Student types name → fetch Wikipedia summary API (free, no key)
  → auto-fill: architect, year, description snippet, thumbnail image URL
  → canvas extracts palette from thumbnail automatically
  → student writes "demonstrates" note + confirms/edits tags
  → save
```

Endpoint: `https://en.wikipedia.org/api/rest_v1/page/summary/{title}`  
Returns: `thumbnail.source`, `description`, `extract` — all used directly.

For buildings not on Wikipedia: student uploads or pastes any image URL → canvas extraction still runs.

### 5.2 Canvas Colour Extraction (automated, not AI)

When an image is available (from Wikipedia or student upload):

```
Image → draw to offscreen <canvas> → sample pixel grid
  → cluster by HSL distance (k-means, k=5) → return top 5 hex values
  → displayed as swatch chips for student to label
```

Pure client-side JavaScript. No network call. Works offline. Student never manually picks a hex code — they only label the colours that are extracted ("board-form concrete", "oxidised copper").

### 5.3 Claude Analyse Button (AI)

This is the AI feature. After logging precedents from the Conceptassistant Skill's suggestions, the student clicks **Analyse** to find which ones genuinely align with their concept.

**What is sent to Claude:**
```ts
{
  projectConcept: project.summary,        // student's concept statement
  projectTags: project.tags,             // their concept tags
  precedents: precedents.map(p => ({
    id: p.id,
    name: p.name,
    demonstrates: p.demonstrates,
    tags: p.tags
  }))
}
```

**What Claude returns:**
```ts
{
  recommendations: [
    { precedentId: "abc", reason: "Direct material parallel — both use concrete to anchor..." },
    ...
  ],
  gaps: ["Nothing in your library addresses threshold or transition"]
}
```

**What the app does with it:**
- Recommended nodes pulse/highlight in the graph
- Reasons appear in a panel beside each node
- Student clicks to confirm or dismiss each recommendation
- Confirmed precedents set `isInfluence: true` → palette generates from those

**API call pattern:**
```ts
// utils/analyseInfluences.ts
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    model: 'claude-haiku-4-5-20251001', // fast + cheap for this use case
    max_tokens: 1024,
    messages: [{ role: 'user', content: buildPrompt(project, precedents) }]
  })
});
```

API key stored in `.env` (local) and Vercel environment variables (deployed). Never committed to Git.

---

## 6. Graph Model

### 6.1 Edge Calculation

Edges derived from shared tags only — never stored, never manually drawn.

```ts
function computeEdges(nodes: (Precedent | Project)[]): Edge[] {
  // For each pair (i, j), count shared tags
  // Edge exists if sharedTagCount >= 1
  // weight = sharedTagCount (drives line weight)
}
```

Stroke width: `clamp(weight * 1.5, 1, 6)` px.

### 6.2 Node Types

| Type | Shape | Fill |
|---|---|---|
| Precedent (not influence) | Circle | Neutral |
| Precedent (influence) | Circle + ring | Accent |
| Precedent (Claude-recommended) | Circle + pulse animation | Highlight |
| Own project | Diamond | Accent bold |

### 6.3 D3 Force Layout

- `forceSimulation` with `forceManyBody`, `forceLink`, `forceCenter`
- Drag, zoom, pan enabled
- On tag change → edges recompute → simulation restarts at `alpha(0.3)`
- On Analyse result → node appearance updates only, no re-simulation
- Node positions saved to localStorage after drag

### 6.4 Tag Filter Mode

Clicking a tag in the filter panel enters filter mode:
- Non-matching nodes dim to 15% opacity
- Active filter shown as a dismissible chip
- Multiple tags selectable — union logic (any match = visible)
- Pure UI state change — no re-simulation

---

## 7. Palette Logic

```
palette = precedents
  .filter(p => p.isInfluence)
  .flatMap(p => p.swatches.map(s => ({ ...s, sourceId: p.id })))
  .dedupe by hex
```

Each swatch chip shows: colour block · hex value · student's label · source building name.

---

## 8. Style Kit Export

Off-screen `<div>` containing:
1. Colour palette row — swatches with hex + provenance
2. Graphic language key — node shape legend, edge weight scale, font specimen
3. Tag cloud — influence-precedent tags in relative sizes

`html2canvas` → PNG download. No server round-trip.

---

## 9. Architecture Decisions

### ADR-01: State — React Context + useReducer

No async middleware needed. localStorage sync via single `useEffect`. Revisit if undo/redo history is added.

### ADR-02: D3 owns the SVG

D3 mutates SVG DOM directly on tick — React reconciler is bypassed for performance. React owns everything outside `<svg>`.

### ADR-03: Claude Haiku for Analyse

Haiku is fast (~1s), cheap, and sufficient for structured JSON output from a well-formed prompt. Sonnet unnecessary for this task.

### ADR-04: Direct API call from browser

For a student demo, calling the Anthropic API directly from the browser is acceptable. The key is in Vercel env vars, not in the bundle. A Vercel serverless function (`/api/analyse`) is the production-safe upgrade but out of scope here.

### ADR-05: Styling — Tailwind + CSS Custom Properties

Tailwind for layout. CSS custom properties (`--color-accent`, `--color-bg`) bridge into SVG where Tailwind can't reach. Accent colour adjustable in one line once real palette is known.

---

## 10. Component Architecture

```
src/
├── main.tsx
├── App.tsx                          # root layout, context provider
├── store/
│   ├── appStore.tsx                 # Context + useReducer + localStorage sync
│   ├── actions.ts                   # typed action creators
│   └── seedData.ts                  # 15-20 hardcoded precedents
├── data/
│   └── tagVocabulary.ts             # grouped controlled vocabulary
├── components/
│   ├── graph/
│   │   ├── Graph.tsx                # SVG container, D3 simulation lifecycle
│   │   ├── NodeLayer.tsx            # D3-managed nodes
│   │   └── EdgeLayer.tsx            # D3-managed edges
│   ├── sidebar/
│   │   ├── Sidebar.tsx              # shell + mode router
│   │   ├── PrecedentForm.tsx        # add/edit — Wikipedia lookup + canvas extraction
│   │   ├── ProjectForm.tsx          # edit own project
│   │   ├── SwatchEditor.tsx         # shows extracted swatches, student adds labels
│   │   └── TagInput.tsx             # grouped pill picker + free-text fallback
│   ├── tags/
│   │   └── TagFilterPanel.tsx       # clickable tag chips → sets activeTagFilters
│   ├── analyse/
│   │   └── AnalysePanel.tsx         # Analyse button + Claude result display
│   ├── palette/
│   │   ├── PalettePanel.tsx         # full palette view
│   │   └── SwatchChip.tsx           # colour block + hex + label + provenance
│   └── export/
│       └── StyleKitExport.tsx       # off-screen render + download trigger
├── hooks/
│   ├── useGraph.ts                  # derive nodes/edges from state
│   └── usePalette.ts                # derive palette from influence precedents
├── utils/
│   ├── graphUtils.ts                # computeEdges, computeTagWeights
│   ├── tagUtils.ts                  # slugify, normalise, allTagsInUse
│   ├── colourUtils.ts               # canvas extraction, hex validation
│   ├── wikipediaUtils.ts            # fetch + parse Wikipedia summary API
│   ├── analyseInfluences.ts         # Anthropic API call + prompt builder
│   └── exportUtils.ts               # html2canvas wrapper
└── types.ts                         # all interfaces
```

---

## 11. Seed Data

15–20 precedents hardcoded in `seedData.ts`, sourced from student-provided URLs. Each entry populated using Wikipedia auto-fill + canvas extraction during authoring — same workflow a student uses in the app. Tags drawn exclusively from `tagVocabulary.ts`. Every tag appears on at least 2 precedents so the graph has meaningful edges on first open.

**Seed data is authored separately** once student provides precedent URLs. See `seedData.ts` task.

---

## 12. Build Sequence

### Sprint 1 — Foundation
- [ ] Scaffold Vite + React + Tailwind + D3
- [ ] `types.ts`, `appStore.tsx`, `actions.ts`
- [ ] `tagVocabulary.ts` + `tagUtils.ts` (slugify, normalise)
- [ ] `seedData.ts` (15–20 precedents — requires URLs first)
- [ ] `computeEdges` in `graphUtils.ts`
- [ ] Basic D3 force graph rendering (circles + lines)
- [ ] Edge weight → stroke width verified

### Sprint 2 — Data entry + tag filter
- [ ] `wikipediaUtils.ts` — fetch + parse summary API
- [ ] `colourUtils.ts` — canvas pixel extraction
- [ ] `PrecedentForm.tsx` — Wikipedia lookup + auto-fill + swatch extraction
- [ ] `SwatchEditor.tsx` — label extracted swatches
- [ ] `TagInput.tsx` — grouped pill picker
- [ ] `ProjectForm.tsx`
- [ ] `TagFilterPanel.tsx` — filter → D3 opacity update
- [ ] Graph re-settles on data change

### Sprint 3 — AI + Palette
- [ ] `analyseInfluences.ts` — Anthropic API call + prompt
- [ ] `AnalysePanel.tsx` — button + result display + confirm/dismiss
- [ ] Node highlight states for Claude recommendations
- [ ] `usePalette.ts` hook
- [ ] `PalettePanel.tsx` + `SwatchChip.tsx` with provenance

### Sprint 4 — Export + Polish
- [ ] `StyleKitExport.tsx` + html2canvas PNG download
- [ ] Node position persistence (save drag positions to localStorage)
- [ ] Node click → sidebar shows precedent detail
- [ ] Vercel deploy + env var setup
- [ ] Offline smoke test (everything except Analyse works without network)

---

## 13. Constraints

| Constraint | How enforced |
|---|---|
| No paid APIs except Anthropic | Wikipedia is free/keyless; canvas extraction is client-side |
| Offline-capable (except Analyse) | No runtime network calls except Wikipedia lookup + Analyse button |
| Edges never manual | `computeEdges` is pure function; no edge CRUD in store |
| Every palette colour traces to a source | `Swatch.sourceId` required; `SwatchChip` always renders provenance |
| Tags consistent | Slugified on save; all from vocabulary by default |
| API key never in bundle | `.env` locally; Vercel env vars in production |

---

## 14. Where AI Adds Value vs. Where It Doesn't

| Task | What does it | Why |
|---|---|---|
| Building info lookup | Wikipedia REST fetch | Deterministic, fast, accurate |
| Colour palette | Canvas pixel extraction | Deterministic — AI guessing colours would be worse |
| Tag connections / graph edges | Rule-based algorithm | Precision matters; shared tags are facts not interpretations |
| Identifying real influences | Claude API | Requires reading intent from language — only AI can do this |
| Gaps in research | Claude API | Requires understanding what's missing, not just what's present |

This split is the core argument for the critical reflection: AI is used precisely where human-like reasoning is needed, and kept out where deterministic accuracy is better.
