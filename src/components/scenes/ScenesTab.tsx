"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Button, EmptyState, ModalChassis, PlusIcon } from "@/components/ui";
import { Scene, useScenes } from "@/hooks/useScenes";
import { useCreateScene } from "@/hooks/useCreateScene";
import { useDeleteScene } from "@/hooks/useDeleteScene";
import { useReorderScenes } from "@/hooks/useReorderScenes";
import { useUpdateScene } from "@/hooks/useUpdateScene";
import { NewSceneModal } from "./NewSceneModal";
import { SceneRow } from "./SceneRow";

/*
  React Flow is dynamically imported so its bundle only loads once the
  Graph toggle is actually used, per the performance configuration.
*/
const GraphView = dynamic(() => import("./graph/GraphView").then((mod) => mod.GraphView), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center text-ui text-text-secondary">Loading graph...</div>
  ),
});

export interface ScenesTabProps {
  campaignId: string;
}

type SceneView = "list" | "graph";

/*
  View toggle state lives in the URL (?view=graph) rather than local
  state: it survives reload and is shareable, and this route already
  reads/writes other state via the router elsewhere in the app.
*/
export function ScenesTab({ campaignId }: ScenesTabProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view: SceneView = searchParams.get("view") === "graph" ? "graph" : "list";

  const { data: scenes, isLoading } = useScenes(campaignId);
  const createScene = useCreateScene(campaignId);
  const updateScene = useUpdateScene(campaignId);
  const deleteScene = useDeleteScene(campaignId);
  const reorderScenes = useReorderScenes(campaignId);

  const [newSceneOpen, setNewSceneOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Scene | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function setView(next: SceneView) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "list") {
      params.delete("view");
    } else {
      params.set("view", next);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !scenes) return;

    const oldIndex = scenes.findIndex((scene) => scene.id === active.id);
    const newIndex = scenes.findIndex((scene) => scene.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(scenes, oldIndex, newIndex);
    reorderScenes.mutate(reordered.map((scene) => scene.id));
  }

  async function handleCreate(name: string) {
    const created = await createScene.mutateAsync({ name });
    setNewSceneOpen(false);
    // List view takes you straight to the new scene; graph view keeps
    // you on the canvas so the new node is visible to connect.
    if (view === "list") {
      router.push(`/campaigns/${campaignId}/scenes/${created.id}`);
    }
  }

  const hasNoScenes = !isLoading && (scenes?.length ?? 0) === 0;

  return (
    // Grid rather than flex-col: a flex-1 (flex-basis:0%) ancestor's
    // computed height is not reliably treated as definite for a
    // percentage-height descendant (React Flow sizes itself via
    // height:100%), which grid tracks do not have this problem with.
    <div className="flex-1 grid grid-rows-[auto_1fr] min-h-0">
      <div className="flex items-center justify-end gap-sm px-xl pt-lg">
        <div className="inline-flex items-center p-[3px] rounded-sm bg-surface-panel gap-[2px]">
          <button
            type="button"
            onClick={() => setView("list")}
            className={`px-[14px] py-[6px] rounded-sm text-ui font-medium cursor-pointer transition-colors duration-150 ${
              view === "list"
                ? "bg-surface-card-solid text-text-primary shadow-card"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            List
          </button>
          <button
            type="button"
            onClick={() => setView("graph")}
            className={`px-[14px] py-[6px] rounded-sm text-ui font-medium cursor-pointer transition-colors duration-150 ${
              view === "graph"
                ? "bg-surface-card-solid text-text-primary shadow-card"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Graph
          </button>
        </div>
        <Button variant="primary" onClick={() => setNewSceneOpen(true)}>
          <PlusIcon />
          New scene
        </Button>
      </div>

      {view === "graph" ? (
        <GraphView campaignId={campaignId} onRequestNewScene={() => setNewSceneOpen(true)} />
      ) : hasNoScenes ? (
        <div className="flex-1 flex items-center justify-center px-lg">
          <EmptyState
            heading="No scenes yet"
            copy="Scenes can be written in any order."
            action={
              <Button variant="primary" onClick={() => setNewSceneOpen(true)}>
                <PlusIcon />
                New scene
              </Button>
            }
          />
        </div>
      ) : (
        <div className="flex flex-col px-xl pt-base pb-[40px]">
          {isLoading ? (
            <p className="text-ui text-text-secondary">Loading scenes...</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext
                items={scenes?.map((scene) => scene.id) ?? []}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col">
                  {scenes?.map((scene) => (
                    <SceneRow
                      key={scene.id}
                      scene={scene}
                      onClick={() => router.push(`/campaigns/${campaignId}/scenes/${scene.id}`)}
                      onChangeStatus={(status) => updateScene.mutate({ id: scene.id, status })}
                      onRequestDelete={() => setPendingDelete(scene)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}

      {newSceneOpen && <NewSceneModal onClose={() => setNewSceneOpen(false)} onCreate={handleCreate} />}

      {pendingDelete && (
        <ModalChassis
          title="Delete scene"
          size="small"
          onClose={() => setPendingDelete(null)}
          footer={
            <div className="flex justify-end gap-sm">
              <Button variant="secondary" onClick={() => setPendingDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  deleteScene.mutate(pendingDelete.id);
                  setPendingDelete(null);
                }}
              >
                Delete scene
              </Button>
            </div>
          }
        >
          <p className="text-ui text-text-secondary leading-[1.5]">
            Delete &ldquo;{pendingDelete.name}&rdquo;? Links to and from this scene are removed too.
            This cannot be undone.
          </p>
        </ModalChassis>
      )}
    </div>
  );
}
