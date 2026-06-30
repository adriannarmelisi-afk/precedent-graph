export type AppView = "library" | "project" | "connections" | "drawing" | "export";

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
  { id: "drawing", label: "Sample Drawing" },
  { id: "export", label: "Export" },
];

export function NavSidebar({ active, onChange, precedentCount, influenceCount }: ViewTabsProps) {
  return (
    <nav className="flex shrink-0 items-center gap-1.5 border-b border-hairline bg-surface-1 px-6 py-2">
      {ITEMS.map((item) => {
        const isActive = active === item.id;
        const count =
          item.id === "library" ? precedentCount : item.id === "project" ? influenceCount : null;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
              isActive
                ? "bg-ink text-surface-1"
                : "text-ink-tertiary hover:bg-surface-3 hover:text-ink-subtle"
            }`}
          >
            {item.label}
            {count !== null && count > 0 && (
              <span
                className={`text-[10px] ${isActive ? "text-surface-3" : "text-ink-tertiary"}`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
