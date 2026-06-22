import * as d3 from "d3";
import type { GraphNode } from "../../types";

interface NodeHandlers {
  onClick: (id: string) => void;
  drag: d3.DragBehavior<SVGGElement, GraphNode, GraphNode | d3.SubjectPosition>;
}

const RADIUS = 14;
const PROJECT_SIZE = 18;

export function renderNodes(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  nodes: GraphNode[],
  { onClick, drag }: NodeHandlers,
) {
  const groups = g
    .selectAll<SVGGElement, GraphNode>("g.node")
    .data(nodes, (d) => d.id)
    .join((enter) => {
      const group = enter.append("g").attr("class", "node").style("cursor", "pointer");
      group.append("path");
      group.append("circle").attr("class", "ring");
      group.append("text");
      return group;
    });

  groups.on("click", (_event, d) => onClick(d.id)).call(drag);

  groups.each(function (d) {
    const group = d3.select(this);
    const isProject = d.kind === "project";

    const fill = d.isRecommended
      ? "var(--color-primary-hover)"
      : d.isInfluence
        ? "var(--color-primary)"
        : "var(--color-hairline-strong)";

    let path = group.select<SVGPathElement>("path");
    if (isProject) {
      const s = PROJECT_SIZE;
      path.attr("d", `M0,${-s} L${s},0 L0,${s} L${-s},0 Z`);
    } else {
      path.attr("d", d3.symbol().type(d3.symbolCircle).size(RADIUS * RADIUS * Math.PI)());
    }
    path
      .attr("fill", fill)
      .attr("stroke", isProject ? "var(--color-primary-focus)" : "var(--color-ink-tertiary)")
      .attr("stroke-width", isProject ? 2 : 1)
      .classed("node-pulse", d.isRecommended);

    group
      .select<SVGCircleElement>("circle.ring")
      .attr("r", RADIUS + 4)
      .attr("fill", "none")
      .attr("stroke", d.isInfluence && !isProject ? "var(--color-primary)" : "none")
      .attr("stroke-width", 1.5);

    group
      .select<SVGTextElement>("text")
      .text(d.label)
      .attr("y", RADIUS + 16)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--color-ink-subtle)")
      .attr("font-size", 11)
      .attr("font-family", "var(--font-text)")
      .style("pointer-events", "none");
  });

  return groups;
}
