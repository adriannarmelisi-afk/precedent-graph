import { useState } from "react";
import { useStore } from "../../store/appStore";
import { addPrecedent, updateProject } from "../../store/actions";
import { parseConceptOutput } from "../../utils/importConcept";
import { normaliseTags } from "../../utils/tagUtils";
import type { Precedent } from "../../types";

export function ImportConceptPanel({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useStore();
  const [raw, setRaw] = useState("");
  const [parsed, setParsed] = useState<ReturnType<typeof parseConceptOutput> | null>(null);
  const [excludedTags, setExcludedTags] = useState<Set<string>>(new Set());
  const [excludedNames, setExcludedNames] = useState<Set<string>>(new Set());
  const [summary, setSummary] = useState("");
  const [title, setTitle] = useState("");

  const runParse = () => {
    const result = parseConceptOutput(raw);
    setParsed(result);
    setSummary(result.summary);
    setTitle(result.titleSuggestion);
    setExcludedTags(new Set());
    setExcludedNames(new Set());
  };

  const toggleTag = (tag: string) =>
    setExcludedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });

  const toggleName = (name: string) =>
    setExcludedNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const apply = () => {
    if (!parsed) return;
    const keptTags = parsed.tags.filter((t) => !excludedTags.has(t));
    dispatch(
      updateProject({
        ...(title.trim() ? { title: title.trim() } : {}),
        summary: summary.trim() || state.project.summary,
        tags: normaliseTags([...state.project.tags, ...keptTags]),
      }),
    );

    const existingNames = new Set(state.precedents.map((p) => p.name.toLowerCase()));
    parsed.precedentNames
      .filter((name) => !excludedNames.has(name))
      .filter((name) => !existingNames.has(name.toLowerCase()))
      .forEach((name) => {
        const stub: Precedent = {
          id: crypto.randomUUID(),
          name,
          architect: "",
          year: 0,
          demonstrates: "",
          tags: [],
          swatches: [],
          isInfluence: false,
          imageUrl: "",
        };
        dispatch(addPrecedent(stub));
      });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-6" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-lg border border-hairline bg-surface-1 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight text-ink">
              Import from Conceptassistant
            </h2>
            <p className="mt-0.5 text-[11px] text-ink-tertiary">
              Paste your Skill output below — parsing is deterministic and offline, nothing is sent
              anywhere.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-ink-subtle hover:text-ink" aria-label="Close">
            ✕
          </button>
        </div>

        {!parsed ? (
          <div className="flex flex-col gap-3">
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              rows={10}
              placeholder="Paste the concept directions, tensions, and precedent suggestions from your Conceptassistant session…"
              className="w-full resize-y rounded-md border border-hairline bg-surface-1 px-2.5 py-2 text-[13px] leading-relaxed text-ink outline-none placeholder:text-ink-tertiary focus:border-primary"
            />
            <button
              type="button"
              onClick={runParse}
              disabled={!raw.trim()}
              className="self-end rounded-md bg-primary px-4 py-1.5 text-[13px] font-medium text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-40"
            >
              Parse
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-tertiary">
                Suggested title — optional, edit or clear to leave your existing title untouched
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="(no title detected — type one or leave blank)"
                className="w-full rounded-md border border-hairline bg-surface-1 px-2.5 py-1.5 text-[13px] text-ink outline-none placeholder:text-ink-tertiary focus:border-primary"
              />
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-tertiary">
                Concept summary — added to your project (editable)
              </label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={4}
                className="w-full resize-y rounded-md border border-hairline bg-surface-1 px-2.5 py-2 text-[13px] leading-relaxed text-ink outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-medium uppercase tracking-wide text-ink-tertiary">
                Concept tags found — tap to exclude
              </label>
              {parsed.tags.length === 0 ? (
                <p className="text-[12px] text-ink-tertiary">No matching vocabulary tags found.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {parsed.tags.map((tag) => {
                    const excluded = excludedTags.has(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                          excluded
                            ? "border border-hairline-strong text-ink-tertiary line-through"
                            : "bg-primary-soft text-primary"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-medium uppercase tracking-wide text-ink-tertiary">
                Precedents suggested — tap to exclude, added as name-only stubs to complete via Look
                up
              </label>
              {parsed.precedentNames.length === 0 ? (
                <p className="text-[12px] text-ink-tertiary">
                  No precedent names detected — list them with a bullet (e.g. "- Therme Vals") and
                  re-paste if you want them imported.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {parsed.precedentNames.map((name) => {
                    const excluded = excludedNames.has(name);
                    return (
                      <label
                        key={name}
                        className="flex items-center gap-2 text-[13px] text-ink-subtle"
                      >
                        <input
                          type="checkbox"
                          checked={!excluded}
                          onChange={() => toggleName(name)}
                          className="accent-primary"
                        />
                        <span className={excluded ? "text-ink-tertiary line-through" : "text-ink"}>
                          {name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-hairline pt-4">
              <button
                type="button"
                onClick={() => setParsed(null)}
                className="rounded-md border border-hairline-strong px-3 py-1.5 text-[13px] text-ink-subtle hover:text-ink"
              >
                Back
              </button>
              <button
                type="button"
                onClick={apply}
                className="rounded-md bg-primary px-4 py-1.5 text-[13px] font-medium text-on-primary transition-colors hover:bg-primary-hover"
              >
                Apply to project
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
