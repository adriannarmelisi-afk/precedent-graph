import type { AnalyseResult, GraphEdge, GraphNode, Precedent, Project } from "../types";

export function buildNodes(
  precedents: Precedent[],
  project: Project,
  analyseResult: AnalyseResult | null,
): GraphNode[] {
  const recommendedIds = new Set(analyseResult?.recommendations.map((r) => r.precedentId) ?? []);

  const precedentNodes: GraphNode[] = precedents.map((p) => ({
    id: p.id,
    kind: "precedent",
    label: p.name,
    isInfluence: p.isInfluence,
    isRecommended: recommendedIds.has(p.id),
    tags: p.tags,
  }));

  const projectNode: GraphNode = {
    id: project.id,
    kind: "project",
    label: project.title || "My Project",
    isInfluence: true,
    isRecommended: false,
    tags: project.tags,
  };

  return [projectNode, ...precedentNodes];
}

export function computeEdges(nodes: GraphNode[]): GraphEdge[] {
  const edges: GraphEdge[] = [];

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const shared = a.tags.filter((t) => b.tags.includes(t)).length;
      if (shared >= 1) {
        edges.push({ source: a.id, target: b.id, weight: shared });
      }
    }
  }

  return edges;
}

export function edgeStrokeWidth(weight: number): number {
  return Math.min(Math.max(weight * 1.5, 1), 6);
}
