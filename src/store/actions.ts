import type { AnalyseResult, Precedent, Project, ProjectSnapshot, SidebarMode, Swatch } from "../types";

export type Action =
  | { type: "ADD_PRECEDENT"; precedent: Precedent }
  | { type: "UPDATE_PRECEDENT"; id: string; changes: Partial<Precedent> }
  | { type: "DELETE_PRECEDENT"; id: string }
  | { type: "SET_PRECEDENT_SWATCHES"; id: string; swatches: Swatch[] }
  | { type: "TOGGLE_INFLUENCE"; id: string; isInfluence: boolean }
  | { type: "UPDATE_PROJECT"; changes: Partial<Project> }
  | { type: "SET_SELECTED"; id: string | null }
  | { type: "SET_SIDEBAR_MODE"; mode: SidebarMode }
  | { type: "SET_TAG_FILTERS"; tags: string[] }
  | { type: "TOGGLE_TAG_FILTER"; tag: string }
  | { type: "SET_ANALYSE_RESULT"; result: AnalyseResult | null }
  | { type: "SAVE_NODE_POSITION"; id: string; x: number; y: number }
  | { type: "SAVE_PROJECT_SNAPSHOT"; snapshot: ProjectSnapshot }
  | { type: "DELETE_PROJECT_SNAPSHOT"; id: string }
  | { type: "RESET_PROJECT" }
  | { type: "RESET_ALL" };

export const addPrecedent = (precedent: Precedent): Action => ({ type: "ADD_PRECEDENT", precedent });
export const updatePrecedent = (id: string, changes: Partial<Precedent>): Action => ({
  type: "UPDATE_PRECEDENT",
  id,
  changes,
});
export const deletePrecedent = (id: string): Action => ({ type: "DELETE_PRECEDENT", id });
export const setPrecedentSwatches = (id: string, swatches: Swatch[]): Action => ({
  type: "SET_PRECEDENT_SWATCHES",
  id,
  swatches,
});
export const toggleInfluence = (id: string, isInfluence: boolean): Action => ({
  type: "TOGGLE_INFLUENCE",
  id,
  isInfluence,
});
export const updateProject = (changes: Partial<Project>): Action => ({ type: "UPDATE_PROJECT", changes });
export const setSelected = (id: string | null): Action => ({ type: "SET_SELECTED", id });
export const setSidebarMode = (mode: SidebarMode): Action => ({ type: "SET_SIDEBAR_MODE", mode });
export const setTagFilters = (tags: string[]): Action => ({ type: "SET_TAG_FILTERS", tags });
export const toggleTagFilter = (tag: string): Action => ({ type: "TOGGLE_TAG_FILTER", tag });
export const setAnalyseResult = (result: AnalyseResult | null): Action => ({
  type: "SET_ANALYSE_RESULT",
  result,
});
export const saveNodePosition = (id: string, x: number, y: number): Action => ({
  type: "SAVE_NODE_POSITION",
  id,
  x,
  y,
});
export const saveProjectSnapshot = (snapshot: ProjectSnapshot): Action => ({
  type: "SAVE_PROJECT_SNAPSHOT",
  snapshot,
});
export const deleteProjectSnapshot = (id: string): Action => ({
  type: "DELETE_PROJECT_SNAPSHOT",
  id,
});
export const resetProject = (): Action => ({ type: "RESET_PROJECT" });
export const resetAll = (): Action => ({ type: "RESET_ALL" });
