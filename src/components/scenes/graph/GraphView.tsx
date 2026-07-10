"use client";

import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Background,
  BackgroundVariant,
  Connection,
  MarkerType,
  NodeMouseHandler,
  OnConnect,
  OnNodeDrag,
  Panel,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import { useCreateSceneLink } from "@/hooks/useCreateSceneLink";
import { useSceneLinks } from "@/hooks/useSceneLinks";
import { useScenes } from "@/hooks/useScenes";
import { useUpdateScene } from "@/hooks/useUpdateScene";
import { GraphToolbar } from "./GraphToolbar";
import { layoutWithDagre } from "./layout";
import { SceneEdge, SceneLinkEdge } from "./SceneEdge";
import { SceneFlowNode, SceneNode } from "./SceneNode";

const nodeTypes = { sceneNode: SceneNode };
const edgeTypes = { sceneLink: SceneEdge };

export interface GraphViewProps {
  campaignId: string;
  onRequestNewScene: () => void;
}

/** Campaign graph view, screen 6. Dynamically imported so the list view pays no bundle cost. */
export function GraphView({ campaignId, onRequestNewScene }: GraphViewProps) {
  return (
    <div className="h-full min-h-0 mx-xl mb-xl mt-base rounded-lg border border-border-default overflow-hidden bg-surface-panel">
      <ReactFlowProvider>
        <GraphCanvas campaignId={campaignId} onRequestNewScene={onRequestNewScene} />
      </ReactFlowProvider>
    </div>
  );
}

function GraphCanvas({ campaignId, onRequestNewScene }: GraphViewProps) {
  const router = useRouter();
  const { data: scenes } = useScenes(campaignId);
  const { data: links } = useSceneLinks(campaignId);
  const updateScene = useUpdateScene(campaignId);
  const createLink = useCreateSceneLink(campaignId);

  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [pendingPositions, setPendingPositions] = useState<Record<string, { x: number; y: number }>>({});
  const laidOutIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!connectError) return;
    const timeout = setTimeout(() => setConnectError(null), 4000);
    return () => clearTimeout(timeout);
  }, [connectError]);

  // Nodes with no persisted position yet: lay them out with dagre (placed
  // nodes keep their positions), then persist the computed positions.
  useEffect(() => {
    if (!scenes) return;
    const unplaced = scenes.filter(
      (scene) => (scene.graphX === null || scene.graphY === null) && !laidOutIds.current.has(scene.id),
    );
    if (unplaced.length === 0) return;

    const unplacedIds = new Set(unplaced.map((scene) => scene.id));
    const relevantEdges = (links ?? [])
      .filter((link) => unplacedIds.has(link.fromSceneId) && unplacedIds.has(link.toSceneId))
      .map((link) => ({ source: link.fromSceneId, target: link.toSceneId }));

    const positions = layoutWithDagre(unplaced.map((scene) => scene.id), relevantEdges);

    setPendingPositions((current) => ({ ...current, ...positions }));
    unplaced.forEach((scene) => {
      laidOutIds.current.add(scene.id);
      const position = positions[scene.id];
      if (position) {
        updateScene.mutate({ id: scene.id, graphX: position.x, graphY: position.y });
      }
    });
    // updateScene's mutate identity is stable across renders (react-query);
    // re-running this effect is guarded by laidOutIds regardless.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenes, links]);

  const nodes: SceneFlowNode[] = useMemo(() => {
    if (!scenes) return [];
    return scenes.map((scene) => ({
      id: scene.id,
      type: "sceneNode",
      position: pendingPositions[scene.id] ?? { x: scene.graphX ?? 0, y: scene.graphY ?? 0 },
      data: { scene },
    }));
  }, [scenes, pendingPositions]);

  const edges: SceneLinkEdge[] = useMemo(() => {
    if (!links) return [];
    return links.map((link) => ({
      id: link.id,
      type: "sceneLink",
      source: link.fromSceneId,
      target: link.toSceneId,
      selected: link.id === selectedEdgeId,
      markerEnd: { type: MarkerType.ArrowClosed, color: "var(--color-graph-edge)", width: 16, height: 16 },
      data: { link, campaignId },
    }));
  }, [links, selectedEdgeId, campaignId]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      router.push(`/campaigns/${campaignId}/scenes/${node.id}`);
    },
    [router, campaignId],
  );

  const onNodeDragStop: OnNodeDrag = useCallback(
    (_event, node) => {
      updateScene.mutate({ id: node.id, graphX: node.position.x, graphY: node.position.y });
    },
    [updateScene],
  );

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (connection.source === connection.target) {
        setConnectError("A scene cannot link to itself");
        return;
      }
      createLink.mutate(
        { fromSceneId: connection.source, toSceneId: connection.target },
        { onError: (error) => setConnectError(error.message) },
      );
    },
    [createLink],
  );

  function handleAutoArrange() {
    if (!scenes) return;
    const positions = layoutWithDagre(
      scenes.map((scene) => scene.id),
      (links ?? []).map((link) => ({ source: link.fromSceneId, target: link.toSceneId })),
    );

    setPendingPositions((current) => ({ ...current, ...positions }));
    scenes.forEach((scene) => {
      laidOutIds.current.add(scene.id);
      const position = positions[scene.id];
      if (position) {
        updateScene.mutate({ id: scene.id, graphX: position.x, graphY: position.y });
      }
    });
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodeClick={onNodeClick}
      onNodeDragStop={onNodeDragStop}
      onConnect={onConnect}
      onEdgeClick={(_event, edge) => setSelectedEdgeId(edge.id)}
      onPaneClick={() => setSelectedEdgeId(null)}
      connectionLineStyle={{ stroke: "var(--color-graph-edge)", strokeWidth: 1.6 }}
      fitView
    >
      <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="var(--color-border-default)" />
      <Panel position="top-left">
        <GraphToolbar onAutoArrange={handleAutoArrange} onNewScene={onRequestNewScene} />
      </Panel>
      {connectError && (
        <Panel position="top-center">
          <div className="text-ui font-medium text-danger-text bg-danger-bg-hover border border-danger-border rounded-sm px-base py-sm shadow-popover">
            {connectError}
          </div>
        </Panel>
      )}
    </ReactFlow>
  );
}
