import type { PaletteEntry } from "../../hooks/usePalette";

export function SwatchChip({ entry }: { entry: PaletteEntry }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="h-8 w-8 shrink-0 rounded border border-hairline"
        style={{ backgroundColor: entry.hex }}
      />
      <div className="min-w-0">
        <div className="truncate text-[12px] font-medium text-ink">{entry.label}</div>
        <div className="flex items-center gap-1.5 text-[10px] text-ink-tertiary">
          <span className="font-mono uppercase">{entry.hex}</span>
          <span>·</span>
          <span className="truncate">{entry.sourceName}</span>
        </div>
      </div>
    </div>
  );
}
