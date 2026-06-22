import * as d3 from "d3";
import { useEffect, useRef } from "react";
import type { GraphEdge, GraphNode } from "../../types";
import { renderEdges, type SimEdge } from "./EdgeLayer";
import { renderNodes } from "./NodeLayer";

interface GraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  activeTagFilters: string[];
  nodePositions: Record<string, { x: number; y: number }>;
  onNodeClick: (id: string) => void;
  onNodeDragEnd: (id: string, x: number, y: number) => void;
}

export function Graph({
  nodes,
  edges,
  activeTagFilters,
  nodePositions,
  onNodeClick,
  onNodeDragEnd,
}: GraphProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, SimEdge> | null>(null);
  const onNodeClickRef = useRef(onNodeClick);
  const onNodeDragEndRef = useRef(onNodeDragEnd);
  onNodeClickRef.current = onNodeClick;
  onNodeDragEndRef.current = onNodeDragEnd;

  // Rebuild simulation when the underlying graph (nodes/edges) changes.
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select<SVGSVGElement, unknown>(svgRef.current);
    const width = svgRef.current.clientWidth || 800;
    const height = svgRef.current.clientHeight || 600;

    svg.selectAll("*").remove();

    const root = svg.append("g").attr("class", "zoom-root");
    const edgeLayer = root.append("g").attr("class", "edges");
    const nodeLayer = root.append("g").attr("class", "nodes");

    svg.call(
      d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 3])
        .on("zoom", (event) => root.attr("transform", event.transform)),
    );

    const simNodes: GraphNode[] = nodes.map((n) => {
      const saved = nodePositions[n.id];
      return { ...n, x: saved?.x, y: saved?.y };
    });
    const simEdges: SimEdge[] = edges.map((e) => ({ ...e }));

    const simulation = d3
      .forceSimulation<GraphNode>(simNodes)
      .force(
        "link",
        d3
          .forceLink<GraphNode, SimEdge>(simEdges)
          .id((d) => d.id)
          .distance(110)
          .strength(0.3),
      )
      .force("charge", d3.forceManyBody().strength(-220))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide(34));

    simulationRef.current = simulation;

    const drag = d3
      .drag<SVGGElement, GraphNode>()
      .on("start", (event) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
        if (typeof d.x === "number" && typeof d.y === "number") {
          onNodeDragEndRef.current(d.id, d.x, d.y);
        }
      });

    const nodeSelection = renderNodes(nodeLayer, simNodes, {
      onClick: (id) => onNodeClickRef.current(id),
      drag,
    });
    const edgeSelection = renderEdges(edgeLayer, simEdges);

    simulation.on("tick", () => {
      edgeSelection
        .attr("x1", (d) => (d.source as GraphNode).x ?? 0)
        .attr("y1", (d) => (d.source as GraphNode).y ?? 0)
        .attr("x2", (d) => (d.target as GraphNode).x ?? 0)
        .attr("y2", (d) => (d.target as GraphNode).y ?? 0);

      nodeSelection.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => {
      simulation.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  // Tag filter changes only touch opacity — no re-simulation.
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const hasFilters = activeTagFilters.length > 0;

    svg.selectAll<SVGGElement, GraphNode>("g.node").style("opacity", (d) => {
      if (!hasFilters) return 1;
      const matches = d.tags.some((t) => activeTagFilters.includes(t));
      return matches ? 1 : 0.15;
    });
  }, [activeTagFilters]);

  return (
    <svg ref={svgRef} className="h-full w-full" style={{ background: "var(--color-canvas)" }}>
      <style>{`
        .node-pulse {
          animation: node-pulse 1.6s ease-in-out infinite;
        }
        @keyframes node-pulse {
          0%, 100% { filter: drop-shadow(0 0 0 var(--color-primary-hover)); }
          50% { filter: drop-shadow(0 0 6px var(--color-primary-hover)); }
        }
      `}</style>
    </svg>
  );
}
