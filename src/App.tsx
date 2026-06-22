import { useMemo } from "react";
import { Graph } from "./components/graph/Graph";
import { PrecedentCard } from "./components/precedent/PrecedentCard";
import { TagFilterPanel } from "./components/tags/TagFilterPanel";
import { SwatchChip } from "./components/palette/SwatchChip";
import {
  saveNodePosition,
  setSelected,
  setTagFilters,
  toggleInfluence,
  toggleTagFilter,
} from "./store/actions";
import { StoreProvider, useStore } from "./store/appStore";
import { useGraph } from "./hooks/useGraph";
import { usePalette } from "./hooks/usePalette";
import { allTagsInUse } from "./utils/tagUtils";

function AppShell() {
  const { state, dispatch } = useStore();
  const { nodes, edges } = useGraph();
  const palette = usePalette();

  const { precedents, project, ui } = state;
  const projectTags = useMemo(() => new Set(project.tags), [project.tags]);
  const allTags = useMemo(() => allTagsInUse(precedents, project), [precedents, project]);

  const visiblePrecedents = useMemo(() => {
    if (ui.activeTagFilters.length === 0) return precedents;
    return precedents.filter((p) => p.tags.some((t) => ui.activeTagFilters.includes(t)));
  }, [precedents, ui.activeTagFilters]);

  const selected = precedents.find((p) => p.id === ui.selected) ?? null;
  const influenceCount = precedents.filter((p) => p.isInfluence).length;

  return (
    <div className="flex h-screen w-screen flex-col bg-canvas text-ink">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-hairline bg-surface-1 px-6">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-[15px] font-semibold tracking-tight text-ink">
            Precedent Graph
          </span>
          <span className="text-xs text-ink-tertiary">
            {precedents.length} precedents · {influenceCount} influences
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="text-ink-subtle transition-colors hover:text-ink"
            title="Settings"
            aria-label="Settings"
          >
            ⚙
          </button>
          <button
            type="button"
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-on-primary transition-colors hover:bg-primary-hover"
          >
            Export style kit
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          <section>
            <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wide text-ink-tertiary">
              Precedents
            </h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
              {visiblePrecedents.map((p) => {
                const shared = p.tags.filter((t) => projectTags.has(t)).length;
                return (
                  <PrecedentCard
                    key={p.id}
                    precedent={p}
                    selected={ui.selected === p.id}
                    sharedWithProject={shared}
                    onSelect={(id) => dispatch(setSelected(id))}
                    onToggleInfluence={(id, next) => dispatch(toggleInfluence(id, next))}
                  />
                );
              })}
            </div>
          </section>

          <section className="mt-8">
            <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wide text-ink-tertiary">
              Connections
              <span className="ml-2 font-normal normal-case text-ink-tertiary">
                shared tags link precedents to your project
              </span>
            </h2>
            <div className="h-[360px] overflow-hidden rounded-lg border border-hairline bg-surface-1">
              <Graph
                nodes={nodes}
                edges={edges}
                activeTagFilters={ui.activeTagFilters}
                nodePositions={state.nodePositions}
                onNodeClick={(id) => dispatch(setSelected(id))}
                onNodeDragEnd={(id, x, y) => dispatch(saveNodePosition(id, x, y))}
              />
            </div>
          </section>
        </main>

        <aside className="flex w-80 shrink-0 flex-col gap-6 overflow-y-auto border-l border-hairline bg-surface-2 p-5">
          <TagFilterPanel
            tags={allTags}
            active={ui.activeTagFilters}
            onToggle={(tag) => dispatch(toggleTagFilter(tag))}
            onClear={() => dispatch(setTagFilters([]))}
          />

          {selected && (
            <div className="rounded-lg border border-hairline bg-surface-1 p-4">
              <h3 className="text-sm font-medium text-ink">{selected.name}</h3>
              <p className="mt-0.5 text-xs text-ink-tertiary">
                {selected.architect} · {selected.year}
              </p>
              <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
                {selected.demonstrates}
              </p>
              {selected.swatches.length > 0 && (
                <div className="mt-3 flex gap-1.5">
                  {selected.swatches.map((s) => (
                    <span
                      key={s.hex + s.label}
                      className="h-6 w-6 rounded border border-hairline"
                      style={{ backgroundColor: s.hex }}
                      title={`${s.label} — ${s.hex}`}
                    />
                  ))}
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-1">
                {selected.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-hairline-strong px-2 py-0.5 text-[10px] text-ink-subtle"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-tertiary">
              Live palette
              <span className="ml-2 font-normal normal-case">{palette.length} colours</span>
            </h3>
            {palette.length === 0 ? (
              <p className="text-[12px] leading-relaxed text-ink-tertiary">
                Mark precedents as influences to build a palette. Every colour traces back to its
                source building.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {palette.map((entry) => (
                  <SwatchChip key={entry.hex} entry={entry} />
                ))}
              </div>
            )}
          </div>
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
