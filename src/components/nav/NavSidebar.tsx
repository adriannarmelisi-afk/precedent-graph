export type AppView = "library" | "project" | "connections" | "export";

interface ViewTabsProps {
  active: AppView;
  onChange: (view: AppView) => void;
  precedentCount: number;
  influenceCount: number;
}

const ITEMS: { id: AppView; label: string }[] = [
  { id: "project", label: "Project" },
  { id: "library", label: "Library" },
  { id: "connections", label: "Connections" },
  { id: "export", label: "Export" },
];

export function NavSidebar({ active, onChange, precedentCount, influenceCount }: ViewTabsProps) {
  return (
    <nav className="flex shrink-0 items-center gap-1 border-b border-hairline bg-surface-1 px-6">
      {ITEMS.map((item) => {
        const isActive = active === item.id;
        const count =
          item.id === "library" ? precedentCount : item.id === "project" ? influenceCount : null;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={`relative flex items-center gap-1.5 px-3 py-3 text-[13px] font-medium transition-colors ${
              isActive ? "text-ink" : "text-ink-tertiary hover:text-ink-subtle"
            }`}
          >
            {item.label}
            {count !== null && count > 0 && (
              <span className="text-[11px] text-ink-tertiary">{count}</span>
            )}
            {isActive && (
              <span className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-primary" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
