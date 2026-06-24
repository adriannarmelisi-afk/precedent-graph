import { useState } from "react";
import type { PaletteEntry } from "../../hooks/usePalette";

interface SwatchChipProps {
  entry: PaletteEntry;
  chosen?: boolean;
  onToggleChosen?: (hex: string) => void;
}

export function SwatchChip({ entry, chosen, onToggleChosen }: SwatchChipProps) {
  const [copied, setCopied] = useState(false);

  const copyHex = async () => {
    try {
      await navigator.clipboard.writeText(entry.hex);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — fail silently,
      // the hex is still visible to copy manually.
    }
  };

  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={copyHex}
        title="Click to copy hex"
        className="h-8 w-8 shrink-0 rounded border border-hairline transition-transform hover:scale-105"
        style={{ backgroundColor: entry.hex }}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] font-medium text-ink">{entry.label}</div>
        <div className="flex items-center gap-1.5 text-[10px] text-ink-tertiary">
          <button
            type="button"
            onClick={copyHex}
            className="font-mono uppercase hover:text-primary"
            title="Click to copy"
          >
            {copied ? "copied!" : entry.hex}
          </button>
          <span>·</span>
          <span className="truncate">{entry.sourceName}</span>
        </div>
        {entry.sharedTags.length > 0 && (
          <div className="mt-0.5 flex flex-wrap gap-1">
            {entry.sharedTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-primary-soft px-1.5 py-px text-[9px] font-medium text-primary"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      {onToggleChosen && (
        <button
          type="button"
          onClick={() => onToggleChosen(entry.hex)}
          title={chosen ? "Remove from my drawing palette" : "Add to my drawing palette"}
          aria-pressed={chosen}
          className={`shrink-0 text-[15px] transition-colors ${chosen ? "text-primary" : "text-hairline-strong hover:text-ink-subtle"}`}
        >
          {chosen ? "★" : "☆"}
        </button>
      )}
    </div>
  );
}
