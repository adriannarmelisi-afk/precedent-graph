import { createContext, useContext, useEffect, useReducer, type ReactNode } from "react";
import type { AppState } from "../types";
import type { Action } from "./actions";
import { SEED_PRECEDENTS } from "./seedData";

const STORAGE_KEY = "precedent-graph-v1";

function blankProject(): AppState["project"] {
  return {
    id: "project",
    title: "",
    summary: "",
    tags: [],
    influenceIds: [],
    site: { location: "", orientation: "", constraint: "" },
  };
}

function blankUi(): AppState["ui"] {
  return { selected: null, sidebarMode: null, activeTagFilters: [], analyseResult: null };
}

function loadInitialState(): AppState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as AppState;
    } catch {
      // fall through to seed state if stored data is corrupt
    }
  }

  return {
    precedents: SEED_PRECEDENTS,
    project: blankProject(),
    ui: blankUi(),
    nodePositions: {},
  };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "ADD_PRECEDENT":
      return { ...state, precedents: [...state.precedents, action.precedent] };

    case "UPDATE_PRECEDENT":
      return {
        ...state,
        precedents: state.precedents.map((p) =>
          p.id === action.id ? { ...p, ...action.changes } : p,
        ),
      };

    case "DELETE_PRECEDENT":
      return {
        ...state,
        precedents: state.precedents.filter((p) => p.id !== action.id),
        ui: state.ui.selected === action.id ? { ...state.ui, selected: null } : state.ui,
      };

    case "SET_PRECEDENT_SWATCHES":
      return {
        ...state,
        precedents: state.precedents.map((p) =>
          p.id === action.id ? { ...p, swatches: action.swatches } : p,
        ),
      };

    case "TOGGLE_INFLUENCE": {
      const precedents = state.precedents.map((p) =>
        p.id === action.id ? { ...p, isInfluence: action.isInfluence } : p,
      );
      const influenceIds = precedents.filter((p) => p.isInfluence).map((p) => p.id);
      return { ...state, precedents, project: { ...state.project, influenceIds } };
    }

    case "UPDATE_PROJECT":
      return { ...state, project: { ...state.project, ...action.changes } };

    case "SET_SELECTED":
      return { ...state, ui: { ...state.ui, selected: action.id } };

    case "SET_SIDEBAR_MODE":
      return { ...state, ui: { ...state.ui, sidebarMode: action.mode } };

    case "SET_TAG_FILTERS":
      return { ...state, ui: { ...state.ui, activeTagFilters: action.tags } };

    case "TOGGLE_TAG_FILTER": {
      const active = state.ui.activeTagFilters;
      const next = active.includes(action.tag)
        ? active.filter((t) => t !== action.tag)
        : [...active, action.tag];
      return { ...state, ui: { ...state.ui, activeTagFilters: next } };
    }

    case "SET_ANALYSE_RESULT":
      return { ...state, ui: { ...state.ui, analyseResult: action.result } };

    case "SAVE_NODE_POSITION":
      return {
        ...state,
        nodePositions: { ...state.nodePositions, [action.id]: { x: action.x, y: action.y } },
      };

    case "RESET_PROJECT":
      return {
        ...state,
        project: blankProject(),
        precedents: state.precedents.map((p) => ({ ...p, isInfluence: false })),
        ui: { ...state.ui, selected: null, analyseResult: null },
      };

    case "RESET_ALL":
      return {
        precedents: SEED_PRECEDENTS,
        project: blankProject(),
        ui: blankUi(),
        nodePositions: {},
      };

    default:
      return state;
  }
}

interface StoreContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitialState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage quota exceeded (e.g. too many uploaded material textures) —
      // keep running in-memory rather than crashing; nothing else to do here.
    }
  }, [state]);

  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
