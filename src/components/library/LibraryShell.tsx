"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, CandidateCardChassis, EmptyState, EntityCard, EntityType, PlusIcon } from "@/components/ui";
import { TopBar } from "@/components/dashboard/TopBar";
import { Entity, MonsterData, ItemData, libraryScope, useEntities } from "@/hooks/useEntities";
import { useCreateEntity } from "@/hooks/useCreateEntity";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useSrdSearch } from "@/hooks/useSrdSearch";
import { useSrdAddToLibrary } from "@/hooks/useSrdAddToLibrary";
import { itemKeyStats, monsterKeyStats, srdCardDescription } from "@/lib/srd/mapping";
import { NewLibraryEntryModal } from "./NewLibraryEntryModal";

export interface LibraryShellProps {
  userEmail: string;
  signOutAction: () => Promise<void>;
}

type Source = "mine" | "srd";
type TypeFilter = "all" | EntityType;
type SrdType = "monster" | "item";

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "npc", label: "NPCs" },
  { value: "monster", label: "Monsters" },
  { value: "item", label: "Items" },
];

// SRD source only ever has monsters and items (NPCs are generated, never
// retrieved, per features-and-decisions.md), and the SRD browse query
// operates on one type at a time (same as the finder); "All" would mean
// merging two separately paginated queries with no specified ordering
// across types, which nothing in the docs defines. Both are disabled
// here rather than invented, following the existing Toggle component's
// disabled convention (dimmed, non-interactive) since no segmented
// control in this codebase had a disabled state to follow yet.
const SRD_DISABLED_FILTERS = new Set<TypeFilter>(["all", "npc"]);

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
  const [source, setSource] = useState<Source>("mine");

  const { data: npcs, isLoading: npcsLoading } = useEntities(libraryScope, "npc");
  const { data: monsters, isLoading: monstersLoading } = useEntities(libraryScope, "monster");
  const { data: items, isLoading: itemsLoading } = useEntities(libraryScope, "item");
  const createNpc = useCreateEntity(libraryScope, "npc");
  const createMonster = useCreateEntity(libraryScope, "monster");
  const createItem = useCreateEntity(libraryScope, "item");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [srdTypeFilter, setSrdTypeFilter] = useState<SrdType>("monster");
  const [srdPage, setSrdPage] = useState(1);
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

  const debouncedSearch = useDebouncedValue(search, 300);
  const srdAdd = useSrdAddToLibrary(srdTypeFilter);
  const [addedSrdIds, setAddedSrdIds] = useState<Set<string>>(new Set());
  const [addingSrdId, setAddingSrdId] = useState<string | null>(null);

  const { data: srdData, isFetching: srdFetching } = useSrdSearch({
    type: srdTypeFilter,
    filters: {},
    prose: "",
    browse: true,
    page: srdPage,
    name: debouncedSearch,
    enabled: source === "srd",
  });

  async function handleCreate(type: EntityType, name: string) {
    const createByType = { npc: createNpc, monster: createMonster, item: createItem }[type];
    const created = await createByType.mutateAsync({ name });
    setNewEntryOpen(false);
    router.push(`/library/entities/${created.id}`);
  }

  async function handleAddSrd(srdEntryId: string) {
    setAddingSrdId(srdEntryId);
    try {
      await srdAdd.mutateAsync({ srdEntryId });
      setAddedSrdIds((prev) => new Set(prev).add(srdEntryId));
    } finally {
      setAddingSrdId(null);
    }
  }

  function handleSourceChange(next: Source) {
    setSource(next);
    setSearch("");
  }

  function handleTypeFilterClick(value: TypeFilter) {
    if (source === "srd") {
      if (SRD_DISABLED_FILTERS.has(value)) return;
      setSrdTypeFilter(value as SrdType);
      setSrdPage(1);
      return;
    }
    setTypeFilter(value);
  }

  const activeTypeFilter = source === "srd" ? srdTypeFilter : typeFilter;
  const hasNoEntries = !isLoading && all.length === 0;

  return (
    <div className="min-h-screen flex flex-col bg-surface-canvas">
      <TopBar userEmail={userEmail} signOutAction={signOutAction} libraryActive />

      <div className="px-xl pt-xl pb-[4px]">
        <h1 className="font-display italic font-semibold text-[22px] text-text-primary">Library</h1>
        <p className="text-ui text-text-secondary mt-[2px]">Reusable homebrew, independent of any campaign.</p>
      </div>

      <div className="px-xl pt-lg">
        <div className="inline-flex items-center p-[3px] rounded-sm bg-surface-panel gap-[2px]">
          <button
            type="button"
            onClick={() => handleSourceChange("mine")}
            className={`px-[14px] py-[6px] rounded-sm text-ui font-medium cursor-pointer transition-colors duration-150 ${
              source === "mine" ? "bg-surface-card-solid text-text-primary shadow-card" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            My library
          </button>
          <button
            type="button"
            onClick={() => handleSourceChange("srd")}
            className={`px-[14px] py-[6px] rounded-sm text-ui font-medium cursor-pointer transition-colors duration-150 ${
              source === "srd" ? "bg-surface-card-solid text-text-primary shadow-card" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            SRD
          </button>
        </div>
      </div>

      {source === "mine" && hasNoEntries ? (
        <div className="flex-1 flex items-center justify-center px-lg">
          <EmptyState heading="No entries yet" copy="Save an entity from a campaign, or create one from scratch." />
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-sm px-xl pt-lg pb-lg">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={source === "srd" ? "Search the SRD by name..." : "Search the library..."}
              className="flex-1 max-w-[320px] text-content text-text-primary bg-surface-card border border-border-soft rounded-sm px-[14px] py-[9px] outline-none placeholder:text-text-placeholder"
            />
            <div className="inline-flex items-center p-[3px] rounded-sm bg-surface-panel gap-[2px] shrink-0">
              {TYPE_FILTERS.map((filter) => {
                const disabled = source === "srd" && SRD_DISABLED_FILTERS.has(filter.value);
                return (
                  <button
                    key={filter.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleTypeFilterClick(filter.value)}
                    className={`px-[14px] py-[6px] rounded-sm text-ui font-medium transition-colors duration-150 ${
                      disabled
                        ? "cursor-not-allowed opacity-60 text-text-secondary"
                        : "cursor-pointer " +
                          (activeTypeFilter === filter.value
                            ? "bg-surface-card-solid text-text-primary shadow-card"
                            : "text-text-secondary hover:text-text-primary")
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
            <div className="flex-1" />
            {source === "mine" && (
              <Button variant="primary" onClick={() => setNewEntryOpen(true)}>
                <PlusIcon />
                New entry
              </Button>
            )}
          </div>

          {source === "mine" ? (
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
          ) : (
            <div className="flex-1 flex flex-col px-xl pb-[24px]">
              <div className="flex flex-col gap-sm">
                {srdFetching && !srdData ? (
                  <p className="text-ui text-text-secondary text-center py-lg">Searching...</p>
                ) : srdData && srdData.results.length === 0 ? (
                  <p className="text-ui text-text-secondary text-center py-lg">No matches.</p>
                ) : (
                  srdData?.results.map((row) => {
                    const added = addedSrdIds.has(row.id);
                    const adding = addingSrdId === row.id;
                    return (
                      <CandidateCardChassis key={row.id} layout="row">
                        <button
                          type="button"
                          onClick={() => router.push(`/library/srd/${row.id}`)}
                          className="min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <div className="text-content font-semibold text-text-primary">{row.name}</div>
                          <div className="text-micro text-text-secondary mt-[2px]">
                            {srdTypeFilter === "monster" ? monsterKeyStats(row) : itemKeyStats(row)}
                          </div>
                          <div className="text-ui text-text-secondary mt-[4px] line-clamp-2">
                            {srdCardDescription(row.type, row.data)}
                          </div>
                        </button>
                        {added ? (
                          <span className="shrink-0 text-ui font-medium text-accent px-sm">Added</span>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleAddSrd(row.id)}
                            disabled={adding}
                            className="shrink-0"
                          >
                            {adding ? "Adding..." : "Add to library"}
                          </Button>
                        )}
                      </CandidateCardChassis>
                    );
                  })
                )}
              </div>

              {srdData && (srdData.hasMore || srdPage > 1) && (
                <div className="flex items-center justify-center gap-md pt-md">
                  <Button variant="secondary" size="sm" disabled={srdPage <= 1} onClick={() => setSrdPage((p) => p - 1)}>
                    Previous
                  </Button>
                  <span className="text-ui text-text-secondary">Page {srdPage}</span>
                  <Button variant="secondary" size="sm" disabled={!srdData.hasMore} onClick={() => setSrdPage((p) => p + 1)}>
                    Next
                  </Button>
                </div>
              )}

              <div className="flex-1" />
              <div className="pt-lg">
                <a href="/attribution" className="text-[11.5px] text-text-placeholder underline hover:text-text-secondary">
                  SRD 5.1 content, CC-BY
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {newEntryOpen && <NewLibraryEntryModal onClose={() => setNewEntryOpen(false)} onCreate={handleCreate} />}
    </div>
  );
}
