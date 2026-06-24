import { useMemo, useRef, useState } from "react";
import { Graph } from "./components/graph/Graph";
import { PrecedentCard } from "./components/precedent/PrecedentCard";
import { PrecedentForm } from "./components/precedent/PrecedentForm";
import { ProjectPanel } from "./components/sidebar/ProjectPanel";
import { AnalysePanel } from "./components/analyse/AnalysePanel";
import { StyleKitExport } from "./components/export/StyleKitExport";
import { TagFilterPanel } from "./components/tags/TagFilterPanel";
import { SwatchChip } from "./components/palette/SwatchChip";
import { MaterialSwatch } from "./components/materials/MaterialSwatch";
import { SettingsPanel } from "./components/settings/SettingsPanel";
import { NavSidebar, type AppView } from "./components/nav/NavSidebar";
import { getMaterialTags } from "./utils/materialUtils";
import {
  deletePrecedent,
  saveNodePosition,
  setAnalyseResult,
  setSelected,
  setTagFilters,
  toggleInfluence,
  toggleTagFilter,
  updateProject,
} from "./store/actions";
import { StoreProvider, useStore } from "./store/appStore";
import { useGraph } from "./hooks/useGraph";
import { usePalette } from "./hooks/usePalette";
import { useMaterialPalette } from "./hooks/useMaterialPalette";
import { allTagsInUse } from "./utils/tagUtils";
import { analyseInfluences } from "./utils/analyseInfluences";

function AppShell() {
  const { state, dispatch } = useStore();
  const { nodes, edges } = useGraph();
  const palette = usePalette();
  const materials = useMaterialPalette();

  const { precedents, project, ui } = state;
  const projectTags = useMemo(() => new Set(project.tags), [project.tags]);
  const allTags = useMemo(() => allTagsInUse(precedents, project), [precedents, project]);

  const chosenHexSet = useMemo(
    () => new Set((project.chosenSwatchHexes ?? []).map((h) => h.toLowerCase())),
    [project.chosenSwatchHexes],
  );
  const chosenSwatches = useMemo(
    () => palette.filter((entry) => chosenHexSet.has(entry.hex.toLowerCase())),
    [palette, chosenHexSet],
  );
  const toggleChosenSwatch = (hex: string) => {
    const key = hex.toLowerCase();
    const current = project.chosenSwatchHexes ?? [];
    const next = current.some((h) => h.toLowerCase() === key)
      ? current.filter((h) => h.toLowerCase() !== key)
      : [...current, hex];
    dispatch(updateProject({ chosenSwatchHexes: next }));
  };

  const [searchQuery, setSearchQuery] = useState("");

  const visiblePrecedents = useMemo(() => {
    let list = precedents;
    if (ui.activeTagFilters.length > 0) {
      list = list.filter((p) => p.tags.some((t) => ui.activeTagFilters.includes(t)));
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.architect.toLowerCase().includes(q) ||
          p.tags.some((t) => t.includes(q)),
      );
    }
    return list;
  }, [precedents, ui.activeTagFilters, searchQuery]);

  const influences = useMemo(() => precedents.filter((p) => p.isInfluence), [precedents]);

  const selected = precedents.find((p) => p.id === ui.selected) ?? null;
  const influenceCount = precedents.filter((p) => p.isInfluence).length;

  const [analyseSource, setAnalyseSource] = useState<"claude" | "local">("local");
  const [analysing, setAnalysing] = useState(false);
  const [form, setForm] = useState<{ mode: "add" | "edit"; id?: string } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const isProjectEmpty = !project.title && !project.summary && project.tags.length === 0;
  // First-time visitors land on Project (nothing to research without a concept yet);
  // once it's filled in, default to Library on future loads.
  const [activeView, setActiveView] = useState<AppView>(isProjectEmpty ? "project" : "library");
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const inspectorAvailable = activeView === "library" || activeView === "connections";

  const handleNodeClick = (id: string) => {
    dispatch(setSelected(id));
    if (id === "project") setActiveView("project");
  };

  const handleExport = async () => {
    if (!sheetRef.current) return;
    setExporting(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(sheetRef.current, { backgroundColor: "#f4f3f0", scale: 2 });
      const fileName = `${(project.title || "precedent-graph").replace(/\s+/g, "-").toLowerCase()}-style-kit.png`;

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      // Anchor must be in the DOM for the click to trigger a download in all browsers.
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } finally {
      setExporting(false);
    }
  };

  const handleAnalyse = async () => {
    setAnalysing(true);
    try {
      const { result, source } = await analyseInfluences(project, precedents);
      dispatch(setAnalyseResult(result));
      setAnalyseSource(source);
    } finally {
      setAnalysing(false);
    }
  };

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
          {inspectorAvailable && (
            <button
              type="button"
              onClick={() => setInspectorOpen((open) => !open)}
              className="text-ink-subtle transition-colors hover:text-ink"
              title={inspectorOpen ? "Hide filters" : "Show filters"}
              aria-label={inspectorOpen ? "Hide filters" : "Show filters"}
            >
              ☰
            </button>
          )}
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="text-ink-subtle transition-colors hover:text-ink"
            title="Settings"
            aria-label="Settings"
          >
            ⚙
          </button>
        </div>
      </header>

      <NavSidebar
        active={activeView}
        onChange={setActiveView}
        precedentCount={precedents.length}
        influenceCount={influenceCount}
      />

      <div className="flex flex-1 overflow-hidden bg-canvas">
        <main className="flex-1 overflow-y-auto p-6">
          {activeView === "library" && (
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-ink-tertiary">
                  Precedents
                  <span className="ml-1.5 font-normal normal-case text-ink-tertiary">
                    {visiblePrecedents.length} of {precedents.length}
                  </span>
                </h2>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, architect, or tag…"
                  className="w-full max-w-xs rounded-md border border-hairline bg-surface-1 px-2.5 py-1.5 text-[12px] text-ink outline-none placeholder:text-ink-tertiary focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setForm({ mode: "add" })}
                  className="shrink-0 rounded-md border border-hairline-strong px-2.5 py-1 text-[11px] font-medium text-ink-subtle transition-colors hover:border-primary hover:text-primary"
                >
                  + Add precedent
                </button>
              </div>
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
          )}

          {activeView === "project" && (
            <div className="mx-auto flex max-w-2xl flex-col gap-6">
              <ProjectPanel onAnalyse={handleAnalyse} />

              {analysing && <p className="text-[12px] text-ink-tertiary">Analysing your concept…</p>}
              {ui.analyseResult && !analysing && (
                <AnalysePanel result={ui.analyseResult} source={analyseSource} />
              )}

              <div className="rounded-lg border-2 border-primary bg-surface-1 p-5">
                <h3 className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-tertiary">
                  Your drawing palette
                  <span className="ml-1.5 font-normal normal-case">
                    {chosenSwatches.length} colours starred for your own graphics
                  </span>
                </h3>
                {chosenSwatches.length === 0 ? (
                  <p className="text-[12px] leading-relaxed text-ink-tertiary">
                    Star colours below to build the specific set you'll actually use in your drawings —
                    separate from the full extracted palette.
                  </p>
                ) : (
                  <div className="mt-2 flex flex-col gap-3">
                    {chosenSwatches.map((entry, i) => (
                      <SwatchChip
                        key={entry.hex + i}
                        entry={entry}
                        chosen
                        onToggleChosen={toggleChosenSwatch}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-hairline bg-surface-1 p-5">
                <h3 className="mb-3 text-[11px] font-medium uppercase tracking-wide text-ink-tertiary">
                  Combined palette
                  <span className="ml-1.5 font-normal normal-case">
                    {palette.length} colours, all influences — click a swatch or hex to copy, star to
                    add to your drawing palette
                  </span>
                </h3>
                {palette.length === 0 ? (
                  <p className="text-[12px] leading-relaxed text-ink-tertiary">
                    No influences yet — mark precedents as influences in the Library to build your
                    project's palette.
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {palette.map((entry, i) => (
                      <SwatchChip
                        key={entry.hex + i}
                        entry={entry}
                        chosen={chosenHexSet.has(entry.hex.toLowerCase())}
                        onToggleChosen={toggleChosenSwatch}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-hairline bg-surface-1 p-5">
                <h3 className="mb-3 text-[11px] font-medium uppercase tracking-wide text-ink-tertiary">
                  Materials
                  <span className="ml-1.5 font-normal normal-case">drawn from influences</span>
                </h3>
                {materials.length === 0 ? (
                  <p className="text-[12px] leading-relaxed text-ink-tertiary">
                    No influences yet — mark precedents as influences in the Library to build the
                    material set.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {materials.map((m) => (
                      <div key={m.tag} className="flex items-center gap-2">
                        <MaterialSwatch tag={m.tag} size={36} imageOverride={m.imageOverride} />
                        <div>
                          <div className="text-[12px] font-medium capitalize text-ink">
                            {m.tag.replace(/-/g, " ")}
                          </div>
                          <div className="text-[11px] text-ink-tertiary">{m.sourceName}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeView === "connections" && (
            <section className="flex h-full flex-col">
              <h2 className="mb-3 shrink-0 text-[11px] font-medium uppercase tracking-wide text-ink-tertiary">
                Connections
                <span className="ml-2 font-normal normal-case text-ink-tertiary">
                  shared tags + confirmed influences
                </span>
              </h2>
              <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-hairline bg-surface-1">
                <Graph
                  nodes={nodes}
                  edges={edges}
                  activeTagFilters={ui.activeTagFilters}
                  nodePositions={state.nodePositions}
                  onNodeClick={handleNodeClick}
                  onNodeDragEnd={(id, x, y) => dispatch(saveNodePosition(id, x, y))}
                />
              </div>
            </section>
          )}

          {activeView === "export" && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[11px] font-medium uppercase tracking-wide text-ink-tertiary">
                  Export style kit
                  <span className="ml-2 font-normal normal-case text-ink-tertiary">
                    {chosenSwatches.length > 0
                      ? `uses your ${chosenSwatches.length}-colour drawing palette`
                      : "uses the full combined palette — star colours on Project to curate"}
                  </span>
                </h2>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={exporting}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-60"
                >
                  {exporting ? "Exporting…" : "Download PNG"}
                </button>
              </div>
              <div className="overflow-auto rounded-lg border border-hairline bg-surface-3 p-6">
                <StyleKitExport
                  ref={sheetRef}
                  project={project}
                  palette={chosenSwatches.length > 0 ? chosenSwatches : palette}
                  materials={materials}
                  influences={influences}
                />
              </div>
            </div>
          )}
        </main>

        {inspectorAvailable && inspectorOpen && (
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
                  {selected.swatches.map((s, i) => (
                    <span
                      key={s.hex + s.label + i}
                      className="h-6 w-6 rounded border border-hairline"
                      style={{ backgroundColor: s.hex }}
                      title={`${s.label} — ${s.hex}`}
                    />
                  ))}
                </div>
              )}
              {getMaterialTags(selected.tags).length > 0 && (
                <div className="mt-3">
                  <h4 className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-ink-tertiary">
                    Materials
                  </h4>
                  <div className="flex gap-1.5">
                    {getMaterialTags(selected.tags).map((tag) => (
                      <MaterialSwatch
                        key={tag}
                        tag={tag}
                        size={32}
                        imageOverride={selected.materialTextures?.[tag]}
                      />
                    ))}
                  </div>
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
              <div className="mt-4 flex gap-2 border-t border-hairline pt-3">
                <button
                  type="button"
                  onClick={() => setForm({ mode: "edit", id: selected.id })}
                  className="rounded-md border border-hairline-strong px-3 py-1 text-[11px] text-ink-subtle transition-colors hover:border-primary hover:text-primary"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Delete "${selected.name}"?`)) dispatch(deletePrecedent(selected.id));
                  }}
                  className="rounded-md border border-hairline-strong px-3 py-1 text-[11px] text-ink-tertiary transition-colors hover:border-primary hover:text-primary"
                >
                  Delete
                </button>
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
                  {palette.map((entry, i) => (
                    <SwatchChip
                      key={entry.hex + i}
                      entry={entry}
                      chosen={chosenHexSet.has(entry.hex.toLowerCase())}
                      onToggleChosen={toggleChosenSwatch}
                    />
                  ))}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {form && (
        <PrecedentForm
          mode={form.mode}
          precedent={form.id ? precedents.find((p) => p.id === form.id) : undefined}
          onClose={() => setForm(null)}
        />
      )}

      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
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
