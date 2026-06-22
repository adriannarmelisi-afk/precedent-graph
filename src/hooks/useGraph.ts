import { useMemo } from "react";
import { useStore } from "../store/appStore";
import { buildNodes, computeEdges } from "../utils/graphUtils";

export function useGraph() {
  const { state } = useStore();
  const { precedents, project, ui } = state;

  const nodes = useMemo(
    () => buildNodes(precedents, project, ui.analyseResult),
    [precedents, project, ui.analyseResult],
  );

  const edges = useMemo(() => computeEdges(nodes), [nodes]);

  return { nodes, edges };
}
