import type { AnalyseResult, GraphEdge, GraphNode, Precedent, Project } from "../types";
import { TAG_VOCABULARY } from "../data/tagVocabulary";

const PROGRAMME_TAGS = TAG_VOCABULARY["Programme"];

// A precedent can carry several Programme tags (e.g. domestic + civic) — pick
// the first one in vocabulary order so clustering is deterministic.
function categoryFor(tags: string[]): string {
  return PROGRAMME_TAGS.find((t) => tags.includes(t)) ?? "uncategorised";
}

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
    category: categoryFor(p.tags),
  }));

  const projectNode: GraphNode = {
    id: project.id,
    kind: "project",
    label: project.title || "My Project",
    isInfluence: true,
    isRecommended: false,
    tags: project.tags,
    category: categoryFor(project.tags),
  };

  return [projectNode, ...precedentNodes];
}

export function computeEdges(nodes: GraphNode[]): GraphEdge[] {
  const edges: GraphEdge[] = [];
  const projectNode = nodes.find((n) => n.kind === "project");

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

  // Marking a precedent as an influence is itself a stated relationship to the
  // project, so always draw that connection even with zero shared tags.
  if (projectNode) {
    for (const n of nodes) {
      if (n.kind !== "precedent" || !n.isInfluence) continue;
      const alreadyLinked = edges.some(
        (e) =>
          (e.source === projectNode.id && e.target === n.id) ||
          (e.source === n.id && e.target === projectNode.id),
      );
      if (!alreadyLinked) {
        edges.push({ source: projectNode.id, target: n.id, weight: 1 });
      }
    }
  }

  return edges;
}

export function edgeStrokeWidth(weight: number): number {
  return Math.min(Math.max(weight * 1.5, 1), 6);
}
