"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, EmptyState, EntityCard, EntityType, PlusIcon } from "@/components/ui";
import { TopBar } from "@/components/dashboard/TopBar";
import { Entity, MonsterData, ItemData, libraryScope, useEntities } from "@/hooks/useEntities";
import { useCreateEntity } from "@/hooks/useCreateEntity";
import { NewLibraryEntryModal } from "./NewLibraryEntryModal";

export interface LibraryShellProps {
  userEmail: string;
  signOutAction: () => Promise<void>;
}

type TypeFilter = "all" | EntityType;

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "npc", label: "NPCs" },
  { value: "monster", label: "Monsters" },
  { value: "item", label: "Items" },
];

function footerMetadata(entity: Entity): string | null {
  if (entity.type === "monster") {
    const cr = (entity.data as MonsterData).cr;
    return cr ? `CR ${cr}` : null;
  }
  if (entity.type === "item") {
    return (entity.data as ItemData).rarity ?? null;
  }
  return entity.copiedFrom ? `Saved from ${entity.copiedFrom}` : null;
}

/** Library, screen 13: app-level chassis, mixed-type card grid, New entry. Replaces the /library placeholder. */
export function LibraryShell({ userEmail, signOutAction }: LibraryShellProps) {
  const router = useRouter();
  const { data: npcs, isLoading: npcsLoading } = useEntities(libraryScope, "npc");
  const { data: monsters, isLoading: monstersLoading } = useEntities(libraryScope, "monster");
  const { data: items, isLoading: itemsLoading } = useEntities(libraryScope, "item");
  const createNpc = useCreateEntity(libraryScope, "npc");
  const createMonster = useCreateEntity(libraryScope, "monster");
  const createItem = useCreateEntity(libraryScope, "item");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [newEntryOpen, setNewEntryOpen] = useState(false);

  const isLoading = npcsLoading || monstersLoading || itemsLoading;
  const all = useMemo(() => [...(npcs ?? []), ...(monsters ?? []), ...(items ?? [])], [npcs, monsters, items]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return all
      .filter((entity) => typeFilter === "all" || entity.type === typeFilter)
      .filter(
        (entity) => !query || entity.name.toLowerCase().includes(query) || entity.summary.toLowerCase().includes(query),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [all, search, typeFilter]);

  async function handleCreate(type: EntityType, name: string) {
    const createByType = { npc: createNpc, monster: createMonster, item: createItem }[type];
    const created = await createByType.mutateAsync({ name });
    setNewEntryOpen(false);
    router.push(`/library/entities/${created.id}`);
  }

  const hasNoEntries = !isLoading && all.length === 0;

  return (
    <div className="min-h-screen flex flex-col bg-surface-canvas">
      <TopBar userEmail={userEmail} signOutAction={signOutAction} libraryActive />

      <div className="px-xl pt-xl pb-[4px]">
        <h1 className="font-display italic font-semibold text-[22px] text-text-primary">Library</h1>
        <p className="text-ui text-text-secondary mt-[2px]">Reusable homebrew, independent of any campaign.</p>
      </div>

      {hasNoEntries ? (
        <div className="flex-1 flex items-center justify-center px-lg">
          <EmptyState heading="No entries yet" copy="Save an entity from a campaign, or create one from scratch." />
        </div>
      ) : (
        <div className="flex-1">
          <div className="flex items-center gap-sm px-xl pt-lg pb-lg">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search the library..."
              className="flex-1 max-w-[320px] text-content text-text-primary bg-surface-card border border-border-soft rounded-sm px-[14px] py-[9px] outline-none placeholder:text-text-placeholder"
            />
            <div className="inline-flex items-center p-[3px] rounded-sm bg-surface-panel gap-[2px] shrink-0">
              {TYPE_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setTypeFilter(filter.value)}
                  className={`px-[14px] py-[6px] rounded-sm text-ui font-medium cursor-pointer transition-colors duration-150 ${
                    typeFilter === filter.value
                      ? "bg-surface-card-solid text-text-primary shadow-card"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="flex-1" />
            <Button variant="primary" onClick={() => setNewEntryOpen(true)}>
              <PlusIcon />
              New entry
            </Button>
          </div>

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
                  appearsInSlot={footerMetadata(entity)}
                  onClick={() => router.push(`/library/entities/${entity.id}`)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {newEntryOpen && <NewLibraryEntryModal onClose={() => setNewEntryOpen(false)} onCreate={handleCreate} />}
    </div>
  );
}
