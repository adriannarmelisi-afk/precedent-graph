export interface Swatch {
  hex: string;
  label: string;
  sourceId: string;
}

export interface Precedent {
  id: string;
  name: string;
  architect: string;
  year: number;
  demonstrates: string;
  tags: string[];
  swatches: Swatch[];
  isInfluence: boolean;
  imageUrl: string;
  // Optional manually-uploaded reference texture per material tag (e.g. a real
  // Architextures.org download), keyed by the Material vocabulary tag.
  materialTextures?: Record<string, string>;
}

export interface Project {
  id: "project";
  title: string;
  summary: string;
  tags: string[];
  influenceIds: string[];
}

export interface AnalyseRecommendation {
  precedentId: string;
  reason: string;
}

export interface AnalyseResult {
  recommendations: AnalyseRecommendation[];
  gaps: string[];
}

export type SidebarMode = "add" | "edit" | "palette" | "export" | "analyse" | null;

export interface UiState {
  selected: string | null;
  sidebarMode: SidebarMode;
  activeTagFilters: string[];
  analyseResult: AnalyseResult | null;
}

export interface AppState {
  precedents: Precedent[];
  project: Project;
  ui: UiState;
  nodePositions: Record<string, { x: number; y: number }>;
}

export interface GraphNode {
  id: string;
  kind: "precedent" | "project";
  label: string;
  isInfluence: boolean;
  isRecommended: boolean;
  tags: string[];
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
}
