import { useState } from "react";
import { TAG_VOCABULARY } from "../../data/tagVocabulary";
import { slugify } from "../../utils/tagUtils";

interface TagInputProps {
  selected: string[];
  onChange: (tags: string[]) => void;
}

// Grouped controlled-vocabulary pill picker with a free-text fallback.
// All tags are slugified on add so graph edges stay consistent.
export function TagInput({ selected, onChange }: TagInputProps) {
  const [draft, setDraft] = useState("");

  const toggle = (tag: string) => {
    onChange(selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag]);
  };

  const addFreeText = () => {
    const slug = slugify(draft);
    if (slug && !selected.includes(slug)) onChange([...selected, slug]);
    setDraft("");
  };

  return (
    <div className="flex flex-col gap-3">
      {Object.entries(TAG_VOCABULARY).map(([group, tags]) => (
        <div key={group}>
          <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-ink-tertiary">
            {group}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => {
              const isOn = selected.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggle(tag)}
                  className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${
                    isOn
                      ? "bg-primary text-on-primary"
                      : "border border-hairline-strong text-ink-subtle hover:border-primary hover:text-primary"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {selected.some((t) => !Object.values(TAG_VOCABULARY).flat().includes(t)) && (
        <div>
          <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-ink-tertiary">
            Custom
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selected
              .filter((t) => !Object.values(TAG_VOCABULARY).flat().includes(t))
              .map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggle(tag)}
                  className="rounded-full bg-primary px-2.5 py-1 text-[11px] text-on-primary"
                >
                  {tag} ✕
                </button>
              ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addFreeText();
            }
          }}
          placeholder="Add your own concept word…"
          className="flex-1 rounded-md border border-hairline bg-surface-1 px-2.5 py-1.5 text-[12px] text-ink outline-none placeholder:text-ink-tertiary focus:border-primary"
        />
        <button
          type="button"
          onClick={addFreeText}
          className="rounded-md border border-hairline-strong px-3 text-[12px] text-ink-subtle transition-colors hover:border-primary hover:text-primary"
        >
          Add
        </button>
      </div>
    </div>
  );
}
