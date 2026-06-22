import * as d3 from "d3";
import type { GraphEdge, GraphNode } from "../../types";
import { edgeStrokeWidth } from "../../utils/graphUtils";

export type SimEdge = GraphEdge & {
  source: GraphNode | string;
  target: GraphNode | string;
};

export function renderEdges(g: d3.Selection<SVGGElement, unknown, null, undefined>, edges: SimEdge[]) {
  return g
    .selectAll<SVGLineElement, SimEdge>("line")
    .data(edges, (d) => `${(d.source as GraphNode).id ?? d.source}-${(d.target as GraphNode).id ?? d.target}`)
    .join("line")
    .attr("stroke", "var(--color-hairline-tertiary)")
    .attr("stroke-width", (d) => edgeStrokeWidth(d.weight))
    .attr("stroke-opacity", 0.7);
}
