import { useState } from "react";
import { useStore } from "../../store/appStore";
import { updateProject } from "../../store/actions";
import { normaliseTags, suggestTagsFromText } from "../../utils/tagUtils";
import { TagInput } from "./TagInput";
import { ImportConceptPanel } from "./ImportConceptPanel";
import { fetchClimateForLocation } from "../../utils/climateUtils";

type ClimateStatus = { kind: "idle" | "loading" | "ok" | "error"; message?: string };

export function ProjectPanel({ onAnalyse }: { onAnalyse?: () => void }) {
  const { state, dispatch } = useStore();
  const { project } = state;

  const isEmpty = !project.title && !project.summary && project.tags.length === 0;
  const [editing, setEditing] = useState(isEmpty);
  const [suggested, setSuggested] = useState<string[] | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [climateStatus, setClimateStatus] = useState<ClimateStatus>({ kind: "idle" });

  const site = project.site ?? { location: "", orientation: "", constraint: "" };
  const updateSite = (changes: Partial<typeof site>) =>
    dispatch(updateProject({ site: { ...site, ...changes } }));

  const runClimateLookup = async () => {
    if (!site.location.trim()) return;
    setClimateStatus({ kind: "loading" });
    try {
      const result = await fetchClimateForLocation(site.location);
      if (!result) {
        setClimateStatus({ kind: "error", message: "Couldn't find that location — try a nearby city or suburb." });
        return;
      }
      updateSite({ climateSummary: result.summary, climateTags: result.tags });
      setClimateStatus({ kind: "ok" });
    } catch {
      setClimateStatus({ kind: "error", message: "Lookup failed — check your connection." });
    }
  };

  const runSuggest = () => {
    const combinedText = [project.summary, site.location, site.orientation, site.constraint].join(
      " ",
    );
    const hits = suggestTagsFromText(combinedText)
      .concat(site.climateTags ?? [])
      .filter((t) => !project.tags.includes(t));
    setSuggested(Array.from(new Set(hits)));
  };

  const acceptTag = (tag: string) => {
    dispatch(updateProject({ tags: normaliseTags([...project.tags, tag]) }));
    setSuggested((prev) => (prev ? prev.filter((t) => t !== tag) : prev));
  };

  const acceptAll = () => {
    if (!suggested) return;
    dispatch(updateProject({ tags: normaliseTags([...project.tags, ...suggested]) }));
    setSuggested([]);
  };

  return (
    <section className="rounded-lg border-2 border-primary bg-surface-1 p-5">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-primary" aria-hidden="true">
            ◆
          </span>
          <div>
            <h2 className="text-[13px] font-semibold tracking-tight text-ink">
              {project.title || "Your project"}
            </h2>
            <p className="text-[10px] uppercase tracking-wide text-ink-tertiary">
              from your Conceptassistant brief
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="rounded-md border border-hairline-strong px-2.5 py-1 text-[11px] text-ink-subtle transition-colors hover:border-primary hover:text-primary"
          >
            Import
          </button>
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            className="rounded-md border border-hairline-strong px-2.5 py-1 text-[11px] text-ink-subtle transition-colors hover:border-primary hover:text-primary"
          >
            {editing ? "Done" : "Edit"}
          </button>
        </div>
      </div>

      {importOpen && <ImportConceptPanel onClose={() => setImportOpen(false)} />}

      {editing ? (
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-tertiary">
              Title
            </label>
            <input
              value={project.title}
              onChange={(e) => dispatch(updateProject({ title: e.target.value }))}
              placeholder="e.g. Threshold House"
              className="w-full rounded-md border border-hairline bg-surface-1 px-2.5 py-1.5 text-[13px] text-ink outline-none placeholder:text-ink-tertiary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-tertiary">
              Concept summary
            </label>
            <textarea
              value={project.summary}
              onChange={(e) => dispatch(updateProject({ summary: e.target.value }))}
              rows={3}
              placeholder="What is your project about? Paste or refine the concept statement from your Conceptassistant brief…"
              className="w-full resize-y rounded-md border border-hairline bg-surface-1 px-2.5 py-2 text-[13px] leading-relaxed text-ink outline-none placeholder:text-ink-tertiary focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-tertiary">
              Site
              <span className="ml-1.5 font-normal normal-case">
                — optional, but sharpens tag suggestions and Analyse (e.g. a coastal site surfaces
                coastal precedents)
              </span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex gap-1.5">
                <input
                  value={site.location}
                  onChange={(e) => updateSite({ location: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && runClimateLookup()}
                  onBlur={runClimateLookup}
                  placeholder="Location, e.g. Bondi, coastal"
                  className="w-full rounded-md border border-hairline bg-surface-1 px-2.5 py-1.5 text-[12px] text-ink outline-none placeholder:text-ink-tertiary focus:border-primary"
                />
                <button
                  type="button"
                  onClick={runClimateLookup}
                  disabled={climateStatus.kind === "loading" || !site.location.trim()}
                  title="Looks up real climate data for this location (Open-Meteo) — runs automatically on Enter too, but click to retry after an error."
                  className="shrink-0 whitespace-nowrap rounded-md border border-hairline-strong px-2.5 text-[11px] text-ink-subtle transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
                >
                  {climateStatus.kind === "loading"
                    ? "Looking up…"
                    : climateStatus.kind === "ok"
                      ? "✓ Look up climate"
                      : "☀ Look up climate"}
                </button>
              </div>
              <input
                value={site.orientation}
                onChange={(e) => updateSite({ orientation: e.target.value })}
                placeholder="Which way it faces, e.g. north-facing"
                title="The compass direction your site faces or opens towards — check your site plan, a compass app, or Google Maps' north arrow"
                className="w-full rounded-md border border-hairline bg-surface-1 px-2.5 py-1.5 text-[12px] text-ink outline-none placeholder:text-ink-tertiary focus:border-primary"
              />
            </div>
            <input
              value={site.constraint}
              onChange={(e) => updateSite({ constraint: e.target.value })}
              placeholder="Key constraint, e.g. heritage facade, steep topography"
              className="mt-2 w-full rounded-md border border-hairline bg-surface-1 px-2.5 py-1.5 text-[12px] text-ink outline-none placeholder:text-ink-tertiary focus:border-primary"
            />
            {climateStatus.kind === "error" && (
              <p className="mt-1 text-[11px] text-primary">{climateStatus.message}</p>
            )}
            {site.climateSummary && (
              <div className="mt-2 rounded-md border border-hairline bg-surface-2 p-2">
                <p className="text-[11px] text-ink-subtle">{site.climateSummary}</p>
                {(site.climateTags?.length ?? 0) > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {site.climateTags!.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-medium text-primary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-[10px] font-medium uppercase tracking-wide text-ink-tertiary">
                Concept tags
                <span className="ml-1.5 font-normal normal-case text-ink-tertiary">
                  — these link your project to precedents
                </span>
              </label>
              <button
                type="button"
                onClick={runSuggest}
                disabled={!project.summary.trim()}
                title={
                  project.summary.trim()
                    ? "Scan your concept summary for matching concept words"
                    : "Write a concept summary first"
                }
                className="shrink-0 rounded-md border border-hairline-strong px-2.5 py-1 text-[10px] font-medium text-ink-subtle transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
              >
                ✦ Suggest from concept
              </button>
            </div>

            {suggested !== null && (
              <div className="mb-3 rounded-md border border-hairline bg-surface-2 p-2.5">
                {suggested.length === 0 ? (
                  <p className="text-[11px] text-ink-tertiary">
                    No new concept words found in your summary — try adding more detail, or pick tags
                    below.
                  </p>
                ) : (
                  <>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-[10px] font-medium uppercase tracking-wide text-ink-tertiary">
                        Found in your summary — tap to add
                      </span>
                      <button
                        type="button"
                        onClick={acceptAll}
                        className="text-[10px] font-medium text-primary hover:underline"
                      >
                        add all
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {suggested.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => acceptTag(tag)}
                          className="rounded-full border border-primary bg-primary-soft px-2.5 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary hover:text-on-primary"
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            <TagInput
              selected={project.tags}
              onChange={(tags) => dispatch(updateProject({ tags: normaliseTags(tags) }))}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {project.summary ? (
            <p className="text-[13px] leading-relaxed text-ink-muted">{project.summary}</p>
          ) : (
            <p className="text-[13px] italic text-ink-tertiary">
              No concept summary yet — click Edit to add yours.
            </p>
          )}
          {(site.location || site.orientation || site.constraint) && (
            <p className="text-[12px] text-ink-tertiary">
              {[site.location, site.orientation, site.constraint].filter(Boolean).join(" · ")}
            </p>
          )}
          {project.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-primary-soft px-2.5 py-0.5 text-[11px] font-medium text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {onAnalyse && (
        <div className="mt-4 flex items-center justify-between border-t border-hairline pt-4">
          <span className="text-[11px] text-ink-tertiary">
            Find which logged precedents truly align with your concept
          </span>
          <button
            type="button"
            onClick={onAnalyse}
            disabled={project.tags.length === 0 && !project.summary}
            className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-[12px] font-medium text-on-primary transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            Analyse influences
          </button>
        </div>
      )}
    </section>
  );
}
