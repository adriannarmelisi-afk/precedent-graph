import type { Precedent } from "../../types";
import { getMaterialTags } from "../../utils/materialUtils";
import { MaterialSwatch } from "../materials/MaterialSwatch";

interface PrecedentCardProps {
  precedent: Precedent;
  selected: boolean;
  sharedWithProject: number;
  onSelect: (id: string) => void;
  onToggleInfluence: (id: string, next: boolean) => void;
}

export function PrecedentCard({
  precedent,
  selected,
  sharedWithProject,
  onSelect,
  onToggleInfluence,
}: PrecedentCardProps) {
  const { id, name, architect, year, tags, swatches, imageUrl, isInfluence, materialTextures } =
    precedent;
  const materialTags = getMaterialTags(tags);

  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={`group flex flex-col overflow-hidden rounded-lg border bg-surface-1 text-left transition-colors ${
        selected
          ? "border-primary ring-1 ring-primary"
          : isInfluence
            ? "border-primary"
            : "border-hairline hover:border-hairline-strong"
      }`}
      style={isInfluence && !selected ? { borderWidth: 2 } : undefined}
    >
      <div className="relative flex h-28 items-center justify-center bg-surface-3">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-2xl text-hairline-tertiary">▦</span>
        )}
        {isInfluence && (
          <span className="absolute right-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-on-primary">
            influence
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <div className="text-[13px] font-medium leading-tight text-ink">{name}</div>
        <div className="mt-0.5 text-[11px] text-ink-tertiary">
          {architect} · {year}
        </div>

        {swatches.length > 0 && (
          <div className="mt-2.5 flex gap-1">
            {swatches.map((s, i) => (
              <span
                key={s.hex + s.label + i}
                className="h-5 w-5 rounded border border-hairline"
                style={{ backgroundColor: s.hex }}
                title={`${s.label} — ${s.hex}`}
              />
            ))}
          </div>
        )}

        {materialTags.length > 0 && (
          <div className="mt-2.5 flex gap-1">
            {materialTags.map((tag) => (
              <MaterialSwatch
                key={tag}
                tag={tag}
                size={28}
                imageOverride={materialTextures?.[tag]}
              />
            ))}
          </div>
        )}

        <div className="mt-2.5 flex flex-wrap gap-1">
          {tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-hairline px-2 py-0.5 text-[10px] text-ink-subtle"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-hairline pt-2.5">
          <span className="text-[10px] text-ink-tertiary">
            {sharedWithProject > 0
              ? `${sharedWithProject} shared with project`
              : "no project overlap"}
          </span>
          <span
            role="checkbox"
            aria-checked={isInfluence}
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onToggleInfluence(id, !isInfluence);
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              e.preventDefault();
              e.stopPropagation();
              onToggleInfluence(id, !isInfluence);
            }}
            className={`cursor-pointer rounded px-2 py-0.5 text-[10px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary ${
              isInfluence
                ? "bg-primary text-on-primary"
                : "border border-hairline-strong text-ink-subtle hover:border-primary hover:text-primary"
            }`}
          >
            {isInfluence ? "✓ influence" : "+ influence"}
          </span>
        </div>
      </div>
    </button>
  );
}
