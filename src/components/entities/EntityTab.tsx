"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, EmptyState, EntityCard, EntityType, PlusIcon } from "@/components/ui";
import { useCreateEntity } from "@/hooks/useCreateEntity";
import { useEntities } from "@/hooks/useEntities";
import { FinderModal } from "./finder/FinderModal";
import { NpcGenerationModal } from "./generation/NpcGenerationModal";
import { NewEntityModal } from "./NewEntityModal";

const TAB_META: Record<EntityType, { searchPlaceholder: string; singular: string; emptyHeading: string }> = {
  npc: { searchPlaceholder: "Search characters...", singular: "character", emptyHeading: "No characters yet" },
  monster: { searchPlaceholder: "Search monsters...", singular: "monster", emptyHeading: "No monsters yet" },
  item: { searchPlaceholder: "Search items...", singular: "item", emptyHeading: "No items yet" },
};

export interface EntityTabProps {
  campaignId: string;
  type: EntityType;
}

/**
 * Entity tab, screen 8: shared layout for Characters, Monsters, and
 * Items. Search filters client-side over the already-fetched list, by
 * name and summary. Import stays a disabled placeholder (step 14).
 * Generate applies only to NPCs (per features-and-decisions.md,
 * monsters/items are retrieved, never generated); Monsters and Items
 * show "Find" in that same toolbar slot instead, opening the SRD finder.
 */
export function EntityTab({ campaignId, type }: EntityTabProps) {
  const router = useRouter();
  const meta = TAB_META[type];
  const { data: entities, isLoading } = useEntities(campaignId, type);
  const createEntity = useCreateEntity(campaignId, type);
  const isSrdType = type === "monster" || type === "item";

  const [search, setSearch] = useState("");
  const [newEntityOpen, setNewEntityOpen] = useState(false);
  const [finderOpen, setFinderOpen] = useState(false);
  const [generationOpen, setGenerationOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!entities) return [];
    const query = search.trim().toLowerCase();
    if (!query) return entities;
    return entities.filter(
      (entity) => entity.name.toLowerCase().includes(query) || entity.summary.toLowerCase().includes(query),
    );
  }, [entities, search]);

  async function handleCreate(name: string) {
    const created = await createEntity.mutateAsync({ name });
    setNewEntityOpen(false);
    router.push(`/campaigns/${campaignId}/entities/${created.id}`);
  }

  const hasNoEntities = !isLoading && (entities?.length ?? 0) === 0;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-sm px-xl pt-lg pb-lg">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={meta.searchPlaceholder}
          className="flex-1 max-w-[320px] text-content text-text-primary bg-surface-card border border-border-soft rounded-sm px-[14px] py-[9px] outline-none placeholder:text-text-placeholder"
        />
        <div className="flex-1" />
        <Button variant="secondary" disabled title="Coming soon">
          Import
        </Button>
        {isSrdType ? (
          <Button variant="secondary" onClick={() => setFinderOpen(true)}>
            Find
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => setGenerationOpen(true)}>
            Generate
          </Button>
        )}
        <Button variant="primary" onClick={() => setNewEntityOpen(true)}>
          <PlusIcon />
          New {meta.singular}
        </Button>
      </div>

      {hasNoEntities ? (
        <div className="flex-1 flex items-center justify-center px-lg">
          <EmptyState
            heading={meta.emptyHeading}
            copy="Or type @ in any scene to create one mid-sentence."
            action={
              <div className="flex gap-sm">
                <Button variant="primary" onClick={() => setNewEntityOpen(true)}>
                  <PlusIcon />
                  New {meta.singular}
                </Button>
                {isSrdType ? (
                  <Button variant="secondary" onClick={() => setFinderOpen(true)}>
                    Find
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={() => setGenerationOpen(true)}>
                    Generate
                  </Button>
                )}
              </div>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-lg px-xl pb-[40px]">
          {isLoading ? (
            <p className="text-ui text-text-secondary">Loading...</p>
          ) : (
            filtered.map((entity) => (
              <EntityCard
                key={entity.id}
                type={entity.type}
                name={entity.name}
                summary={entity.summary}
                appearsInSlot={`Appears in ${entity.sceneCount} scene${entity.sceneCount === 1 ? "" : "s"}`}
                onClick={() => router.push(`/campaigns/${campaignId}/entities/${entity.id}`)}
              />
            ))
          )}
        </div>
      )}

      {newEntityOpen && <NewEntityModal type={type} onClose={() => setNewEntityOpen(false)} onCreate={handleCreate} />}
      {finderOpen && (type === "monster" || type === "item") && (
        <FinderModal campaignId={campaignId} type={type} onClose={() => setFinderOpen(false)} />
      )}
      {generationOpen && type === "npc" && (
        <NpcGenerationModal campaignId={campaignId} onClose={() => setGenerationOpen(false)} />
      )}
    </div>
  );
}
