import { Graph } from "./components/graph/Graph";
import { setSelected, saveNodePosition } from "./store/actions";
import { StoreProvider, useStore } from "./store/appStore";
import { useGraph } from "./hooks/useGraph";

function AppShell() {
  const { state, dispatch } = useStore();
  const { nodes, edges } = useGraph();

  const selectedPrecedent = state.precedents.find((p) => p.id === state.ui.selected);

  return (
    <div className="flex h-screen w-screen flex-col bg-canvas">
      <header className="flex h-14 shrink-0 items-center border-b border-hairline px-6">
        <span className="font-display text-[15px] font-semibold tracking-tight text-ink">
          Precedent Graph
        </span>
        <span className="ml-3 text-xs text-ink-subtle">
          {state.precedents.length} precedents logged
        </span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="relative flex-1">
          <Graph
            nodes={nodes}
            edges={edges}
            activeTagFilters={state.ui.activeTagFilters}
            nodePositions={state.nodePositions}
            onNodeClick={(id) => dispatch(setSelected(id))}
            onNodeDragEnd={(id, x, y) => dispatch(saveNodePosition(id, x, y))}
          />
        </main>

        <aside className="w-80 shrink-0 overflow-y-auto border-l border-hairline bg-surface-1 p-5">
          {selectedPrecedent ? (
            <div>
              <h2 className="text-base font-medium text-ink">{selectedPrecedent.name}</h2>
              <p className="mt-1 text-xs text-ink-subtle">
                {selectedPrecedent.architect} · {selectedPrecedent.year}
              </p>
              <p className="mt-3 text-sm text-ink-muted">{selectedPrecedent.demonstrates}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {selectedPrecedent.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-hairline-strong px-2 py-0.5 text-[11px] text-ink-subtle"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-ink-subtle">Select a node to see precedent details.</p>
          )}
        </aside>
      </div>
    </div>
  );
}

function App() {
  return (
    <StoreProvider>
      <AppShell />
    </StoreProvider>
  );
}

export default App;
