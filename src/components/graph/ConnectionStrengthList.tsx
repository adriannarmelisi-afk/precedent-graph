import { useMemo } from "react";
import type { GraphEdge, GraphNode, Precedent } from "../../types";

interface ConnectionStrengthListProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  precedents: Precedent[];
  activeTagFilters: string[];
  onSelect: (id: string) => void;
  onTagClick: (tag: string) => void;
}

// A small, self-contained glyph per row — a star for the precedent with thin
// lines fanning to a dot per shared tag. Fixed coordinate space, so it never
// overlaps a neighbouring row or shifts between renders. Each dot is its own
// tag — click one to filter the whole list down to precedents sharing it.
// Lit (influence/recommended) stars get a soft glow so they read as the
// brightest points in the row, leaning further into the constellation motif.
function ConstellationGlyph({
  tags,
  lit,
  activeTagFilters,
  onTagClick,
}: {
  tags: string[];
  lit: boolean;
  activeTagFilters: string[];
  onTagClick: (tag: string) => void;
}) {
  const shown = tags.slice(0, 5);
  const lineColour = lit ? "var(--color-primary)" : "var(--color-hairline-strong)";
  const starColour = lit ? "var(--color-primary)" : "var(--color-ink-tertiary)";
  const dots = shown.map((tag, i) => ({
    tag,
    x: 18 + 14 + i * 13,
    y: 16 + (i - (shown.length - 1) / 2) * 7,
  }));

  return (
    <svg width={104} height={32} viewBox="0 0 104 32" className="shrink-0">
      {dots.map((d, i) => (
        <line key={i} x1={18} y1={16} x2={d.x} y2={d.y} stroke={lineColour} strokeWidth={1.2} opacity={0.85} />
      ))}
      {lit && <circle cx={18} cy={16} r={10} fill="var(--color-primary)" opacity={0.18} />}
      <circle cx={18} cy={16} r={lit ? 6 : 4.5} fill={starColour} className={lit ? "star-twinkle" : undefined} />
      {dots.map((d, i) => {
        const active = activeTagFilters.includes(d.tag);
        return (
          <g
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              onTagClick(d.tag);
            }}
            style={{ cursor: "pointer" }}
          >
            <title>{`Filter by "${d.tag}"`}</title>
            {active && <circle cx={d.x} cy={d.y} r={6} fill="none" stroke="var(--color-primary)" strokeWidth={1.5} />}
            <circle cx={d.x} cy={d.y} r={7} fill="transparent" />
            <circle cx={d.x} cy={d.y} r={3} fill={active ? "var(--color-primary)" : lineColour} />
          </g>
        );
      })}
    </svg>
  );
}

// A rigid, grouped-by-category list sorted by connection strength to the
// project — same information the constellation views were after, but laid
// out as straight rows that never jitter, overlap, or reflow unpredictably.
export function ConnectionStrengthList({
  nodes,
  edges,
  precedents,
  activeTagFilters,
  onSelect,
  onTagClick,
}: ConnectionStrengthListProps) {
  const projectNode = nodes.find((n) => n.kind === "project");
  const precedentNodes = useMemo(() => nodes.filter((n) => n.kind === "precedent"), [nodes]);
  const projectTagSet = useMemo(() => new Set(projectNode?.tags ?? []), [projectNode]);
  const imageById = useMemo(() => new Map(precedents.map((p) => [p.id, p.imageUrl])), [precedents]);

  const edgeWeight = (a: string, b: string): number =>
    edges.find((e) => (e.source === a && e.target === b) || (e.source === b && e.target === a))
      ?.weight ?? 0;

  const groups = useMemo(() => {
    const rows = precedentNodes.map((node) => {
      const sharedTags = node.tags.filter((t) => projectTagSet.has(t));
      const strength = projectNode ? edgeWeight(projectNode.id, node.id) : sharedTags.length;
      return { node, sharedTags, strength };
    });

    const map = new Map<string, typeof rows>();
    rows.forEach((r) => {
      map.set(r.node.category, [...(map.get(r.node.category) ?? []), r]);
    });

    return Array.from(map.entries())
      .map(([category, members]) => ({
        category,
        members: members.slice().sort((a, b) => b.strength - a.strength),
      }))
      .sort((a, b) => b.members.length - a.members.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [precedentNodes, projectTagSet, projectNode, edges]);

  const filterMatch = (n: GraphNode): boolean =>
    activeTagFilters.length === 0 || n.tags.some((t) => activeTagFilters.includes(t));

  return (
    <div className="flex h-full flex-col overflow-y-auto p-1">
      <style>{`
        @keyframes star-twinkle {
          0%, 100% { opacity: 1; filter: drop-shadow(0 0 0 var(--color-primary-hover)); }
          50% { opacity: 0.75; filter: drop-shadow(0 0 3px var(--color-primary-hover)); }
        }
        .star-twinkle { animation: star-twinkle 2.4s ease-in-out infinite; transform-origin: center; }
      `}</style>
      <div className="relative flex flex-col gap-6">
        {/* a faint thread connecting each category's star — ties the
            sections into one constellation rather than separate boxes */}
        <div
          aria-hidden="true"
          className="absolute bottom-2 left-[5px] top-2 w-px bg-gradient-to-b from-primary/0 via-primary/25 to-primary/0"
        />
        {groups.map(({ category, members }) => (
          <div key={category} className="relative">
            <h3 className="mb-2 flex items-baseline gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-primary">
              <span aria-hidden="true">✦</span>
              {category}
              <span className="font-normal normal-case text-ink-tertiary">{members.length}</span>
            </h3>
            <div className="flex flex-col divide-y divide-hairline rounded-md border border-hairline bg-surface-1">
            {members.map(({ node, sharedTags, strength }) => {
              const lit = node.isInfluence || node.isRecommended;
              const dimmed = !filterMatch(node);
              const imageUrl = imageById.get(node.id);
              return (
                <div
                  key={node.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(node.id)}
                  onKeyDown={(e) => e.key === "Enter" && onSelect(node.id)}
                  style={{ opacity: dimmed ? 0.4 : 1 }}
                  className="flex cursor-pointer items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-2"
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-md border border-hairline object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-hairline bg-surface-2 text-ink-tertiary">
                      ✦
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-medium text-ink">{node.label}</div>
                    <div className="text-[10px] text-ink-tertiary">
                      {strength} tag{strength === 1 ? "" : "s"} shared
                      {node.isInfluence ? " · influence" : node.isRecommended ? " · recommended" : ""}
                    </div>
                  </div>
                  <ConstellationGlyph
                    tags={sharedTags}
                    lit={lit}
                    activeTagFilters={activeTagFilters}
                    onTagClick={onTagClick}
                  />
                  <div className="hidden w-44 shrink-0 flex-wrap gap-1 lg:flex">
                    {sharedTags.slice(0, 4).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTagClick(t);
                        }}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                          activeTagFilters.includes(t)
                            ? "bg-primary text-on-primary"
                            : "bg-primary-soft text-primary hover:bg-primary hover:text-on-primary"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        ))}
      </div>
    </div>
  );
}
