import { useState } from "react";
import { useStore } from "../../store/appStore";
import { updateProject } from "../../store/actions";
import { normaliseTags, suggestTagsFromText } from "../../utils/tagUtils";
import { TagInput } from "./TagInput";

export function ProjectPanel({ onAnalyse }: { onAnalyse?: () => void }) {
  const { state, dispatch } = useStore();
  const { project } = state;

  const isEmpty = !project.title && !project.summary && project.tags.length === 0;
  const [editing, setEditing] = useState(isEmpty);
  const [suggested, setSuggested] = useState<string[] | null>(null);

  const runSuggest = () => {
    const hits = suggestTagsFromText(project.summary).filter((t) => !project.tags.includes(t));
    setSuggested(hits);
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
        <button
          type="button"
          onClick={() => setEditing((e) => !e)}
          className="rounded-md border border-hairline-strong px-2.5 py-1 text-[11px] text-ink-subtle transition-colors hover:border-primary hover:text-primary"
        >
          {editing ? "Done" : "Edit"}
        </button>
      </div>

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
