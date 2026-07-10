import dagre from "dagre";

export const GRAPH_NODE_WIDTH = 190;
export const GRAPH_NODE_HEIGHT = 64;

export interface LayoutEdge {
  source: string;
  target: string;
}

/*
  Left-to-right auto-layout, matching the graph frame's reading order.
  dagre positions nodes by their center; React Flow positions nodes by
  their top-left corner, so the result is offset by half the node size.
*/
export function layoutWithDagre(
  nodeIds: string[],
  edges: LayoutEdge[],
): Record<string, { x: number; y: number }> {
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({ rankdir: "LR", nodesep: 40, ranksep: 90 });
  graph.setDefaultEdgeLabel(() => ({}));

  for (const id of nodeIds) {
    graph.setNode(id, { width: GRAPH_NODE_WIDTH, height: GRAPH_NODE_HEIGHT });
  }
  const nodeIdSet = new Set(nodeIds);
  for (const edge of edges) {
    if (nodeIdSet.has(edge.source) && nodeIdSet.has(edge.target)) {
      graph.setEdge(edge.source, edge.target);
    }
  }

  dagre.layout(graph);

  const positions: Record<string, { x: number; y: number }> = {};
  for (const id of nodeIds) {
    const node = graph.node(id);
    positions[id] = { x: node.x - GRAPH_NODE_WIDTH / 2, y: node.y - GRAPH_NODE_HEIGHT / 2 };
  }
  return positions;
}
