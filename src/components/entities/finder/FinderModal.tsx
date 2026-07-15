"use client";

import { FormEvent, useState } from "react";
import { Button, ChevronDownIcon, EntityType, FinderResultCard, ModalChassis } from "@/components/ui";
import { itemKeyStats, monsterKeyStats, srdCardDescription } from "@/lib/srd/mapping";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useSrdFilterOptions } from "@/hooks/useSrdFilterOptions";
import { useSrdAdd } from "@/hooks/useSrdAdd";
import { ItemFilterState, MonsterFilterState, SrdFilterState, SrdSearchRow, useSrdSearch } from "@/hooks/useSrdSearch";
import { ItemFilterFields } from "./ItemFilterFields";
import { MonsterFilterFields } from "./MonsterFilterFields";

export interface FinderModalProps {
  campaignId: string;
  type: Extract<EntityType, "monster" | "item">;
  onClose: () => void;
}

const TITLE: Record<"monster" | "item", string> = { monster: "Find a monster", item: "Find an item" };
const PROSE_PLACEHOLDER: Record<"monster" | "item", string> = {
  monster: "Describe it: something stealthy that ambushes from water...",
  item: "Describe it: a blade that hungers, a cursed lantern...",
};
const TOP_LIMIT_STEP = 3;

/**
 * Monster/item finder, screen 11. Prose search fires on submit (the
 * frame shows an explicit search button next to the input); structured
 * filters re-search automatically, debounced, since the frame has no
 * "apply filters" action for them.
 */
export function FinderModal({ campaignId, type, onClose }: FinderModalProps) {
  const [proseInput, setProseInput] = useState("");
  const [proseSubmitted, setProseSubmitted] = useState("");
  const [filters, setFilters] = useState<SrdFilterState>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [browseMode, setBrowseMode] = useState(false);
  const [limit, setLimit] = useState(TOP_LIMIT_STEP);
  const [browsePage, setBrowsePage] = useState(1);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [addingId, setAddingId] = useState<string | null>(null);

  const debouncedFilters = useDebouncedValue(filters, 300);
  const filtersKey = JSON.stringify(debouncedFilters);

  // Adjusting state during render (not an effect) when the query changes,
  // same pattern as useDraftField's value resync: a new search always
  // starts back at the top of the results.
  const queryKey = `${filtersKey}|${proseSubmitted}|${browseMode}`;
  const [syncedQueryKey, setSyncedQueryKey] = useState(queryKey);
  if (queryKey !== syncedQueryKey) {
    setSyncedQueryKey(queryKey);
    setLimit(TOP_LIMIT_STEP);
    setBrowsePage(1);
  }

  const hasFiltersSet = Object.values(debouncedFilters).some((value) => value !== undefined);
  const hasProse = proseSubmitted.trim().length > 0;
  const searchEnabled = browseMode || hasProse || hasFiltersSet;

  const { data, isFetching } = useSrdSearch({
    type,
    filters: debouncedFilters,
    prose: proseSubmitted,
    browse: browseMode,
    limit,
    page: browsePage,
    enabled: searchEnabled,
  });
  const { data: filterOptions } = useSrdFilterOptions(type);
  const srdAdd = useSrdAdd(campaignId, type);

  function handleProseSubmit(event: FormEvent) {
    event.preventDefault();
    setProseSubmitted(proseInput);
  }

  async function handleAdd(srdEntryId: string) {
    setAddingId(srdEntryId);
    try {
      await srdAdd.mutateAsync({ srdEntryId });
      setAddedIds((prev) => new Set(prev).add(srdEntryId));
    } finally {
      setAddingId(null);
    }
  }

  function keyStats(row: SrdSearchRow): string {
    return type === "monster" ? monsterKeyStats(row) : itemKeyStats(row);
  }

  return (
    <ModalChassis title={TITLE[type]} size="small" onClose={onClose} footer={<FinderFooter browseMode={browseMode} onToggleBrowse={() => setBrowseMode((b) => !b)} />}>
      {!browseMode && (
        <form onSubmit={handleProseSubmit} className="flex gap-sm items-center">
          <input
            value={proseInput}
            onChange={(event) => setProseInput(event.target.value)}
            placeholder={PROSE_PLACEHOLDER[type]}
            className="flex-1 text-content text-text-primary bg-surface-card border border-border-soft rounded-sm px-[14px] py-[11px] outline-none placeholder:text-text-placeholder"
          />
          <button
            type="submit"
            aria-label="Search"
            className="shrink-0 w-[40px] h-[40px] rounded-sm bg-accent hover:bg-accent-hover text-on-accent flex items-center justify-center cursor-pointer transition-colors duration-150"
          >
            <SearchIcon />
          </button>
        </form>
      )}

      <div>
        <button
          type="button"
          onClick={() => setFiltersOpen((open) => !open)}
          className="w-full flex items-center justify-between cursor-pointer"
        >
          <span className="text-label font-semibold uppercase tracking-wider text-text-label">Filters</span>
          <ChevronDownIcon className={`text-text-placeholder transition-transform duration-150 ${filtersOpen ? "rotate-180" : "-rotate-90"}`} />
        </button>
        {filtersOpen && (
          <div className="mt-md">
            {type === "monster" ? (
              <MonsterFilterFields
                filters={filters as MonsterFilterState}
                options={filterOptions}
                onChange={setFilters}
              />
            ) : (
              <ItemFilterFields filters={filters as ItemFilterState} options={filterOptions} onChange={setFilters} />
            )}
          </div>
        )}
      </div>

      {!searchEnabled ? (
        <div className="min-h-[180px] flex items-center justify-center">
          <span className="text-[13.5px] text-text-placeholder text-center">
            Describe what you&apos;re looking for, or browse the full list.
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-sm">
          {isFetching && !data ? (
            <p className="text-ui text-text-secondary text-center py-lg">Searching...</p>
          ) : data && data.results.length === 0 ? (
            <p className="text-ui text-text-secondary text-center py-lg">No matches. Try different filters or browse the full list.</p>
          ) : (
            data?.results.map((row) => (
              <FinderResultCard
                key={row.id}
                name={row.name}
                keyStats={keyStats(row)}
                description={srdCardDescription(row.type, row.data)}
                onAdd={() => handleAdd(row.id)}
                added={addedIds.has(row.id)}
                adding={addingId === row.id}
              />
            ))
          )}

          {browseMode ? (
            data && (data.hasMore || browsePage > 1) && (
              <div className="flex items-center justify-center gap-md pt-sm">
                <Button variant="secondary" size="sm" disabled={browsePage <= 1} onClick={() => setBrowsePage((p) => p - 1)}>
                  Previous
                </Button>
                <span className="text-ui text-text-secondary">Page {browsePage}</span>
                <Button variant="secondary" size="sm" disabled={!data.hasMore} onClick={() => setBrowsePage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            )
          ) : (
            data?.hasMore && (
              <button
                type="button"
                onClick={() => setLimit((l) => l + TOP_LIMIT_STEP)}
                className="text-[13px] text-text-placeholder text-center hover:text-text-secondary cursor-pointer"
              >
                More results
              </button>
            )
          )}
        </div>
      )}
    </ModalChassis>
  );
}

function FinderFooter({ browseMode, onToggleBrowse }: { browseMode: boolean; onToggleBrowse: () => void }) {
  return (
    <div className="flex items-center justify-between w-full">
      <a href="/attribution" className="text-[11.5px] text-text-placeholder underline hover:text-text-secondary">
        SRD 5.1 content, CC-BY
      </a>
      <button type="button" onClick={onToggleBrowse} className="text-[12px] text-accent hover:text-link-hover cursor-pointer">
        {browseMode ? "Back to search" : "Browse full list A–Z instead"}
      </button>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="7" cy="7" r="5" stroke="white" strokeWidth={1.6} />
      <path d="M11 11L15 15" stroke="white" strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  );
}
