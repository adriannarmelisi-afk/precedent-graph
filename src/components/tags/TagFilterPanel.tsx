interface TagFilterPanelProps {
  tags: string[];
  active: string[];
  onToggle: (tag: string) => void;
  onClear: () => void;
}

export function TagFilterPanel({ tags, active, onToggle, onClear }: TagFilterPanelProps) {
  if (tags.length === 0) return null;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-ink-tertiary">
          Filter by tag
        </span>
        {active.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-[10px] text-primary hover:underline"
          >
            clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => {
          const isActive = active.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onToggle(tag)}
              className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${
                isActive
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
  );
}
