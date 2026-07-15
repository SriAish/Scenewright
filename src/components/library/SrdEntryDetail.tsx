"use client";

import { useState } from "react";
import Link from "next/link";
import { BackIcon, Button, EntityIcon, EntityType, MentionChip, entityColorClasses } from "@/components/ui";
import { ItemData, MonsterData } from "@/hooks/useEntities";
import { useSrdAddToLibrary } from "@/hooks/useSrdAddToLibrary";

const TYPE_CHIP_LABEL: Record<Extract<EntityType, "monster" | "item">, string> = {
  monster: "Monster",
  item: "Item",
};

function StaticTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-[4px] bg-surface-card border border-border-soft rounded-sm py-[10px] px-[6px]">
      <span className="text-micro font-semibold uppercase tracking-wider text-text-label">{label}</span>
      <span className="text-[15px] font-semibold text-text-primary text-center">{value || "-"}</span>
    </div>
  );
}

export interface SrdEntryDetailProps {
  srdEntryId: string;
  type: Extract<EntityType, "monster" | "item">;
  name: string;
  data: MonsterData | ItemData;
}

/**
 * Read-only reference view for one srd_entries row: name, key fields,
 * description, Add to library. Deliberately a simpler stat view rather
 * than a read-only mode threaded through the editable EntityDetail
 * component (the smaller diff, per the build instructions), reusing the
 * same field-mapped data the fork service and the finder card use.
 */
export function SrdEntryDetail({ srdEntryId, type, name, data }: SrdEntryDetailProps) {
  const addToLibrary = useSrdAddToLibrary(type);
  const [added, setAdded] = useState(false);

  async function handleAdd() {
    await addToLibrary.mutateAsync({ srdEntryId });
    setAdded(true);
  }

  const monster = type === "monster" ? (data as MonsterData) : null;
  const item = type === "item" ? (data as ItemData) : null;

  return (
    <div className="min-h-screen flex flex-col bg-surface-panel">
      <div className="flex items-center gap-md px-xl py-base border-b border-border-default bg-surface-card-solid sticky top-0 z-20">
        <Link
          href="/library"
          className="inline-flex items-center gap-sm text-ui font-medium text-text-secondary hover:bg-surface-panel rounded-sm px-sm py-[6px]"
        >
          <BackIcon />
          Library
        </Link>
        <div className="flex-1" />
        <MentionChip type={type}>{TYPE_CHIP_LABEL[type]}</MentionChip>
      </div>

      <div className="flex gap-xl px-xl py-xl items-start max-w-[720px]">
        <div className="flex-1 min-w-0 flex flex-col gap-xl">
          <div className="flex gap-base items-start">
            <div
              className={`w-[64px] h-[64px] rounded-md flex items-center justify-center shrink-0 ${entityColorClasses[type].bg}`}
            >
              <EntityIcon type={type} size={24} className={entityColorClasses[type].text} />
            </div>
            <div className="min-w-0 pt-[2px] flex-1">
              <h1 className="font-display italic font-semibold text-[25px] text-text-primary">{name}</h1>
              <p className="text-micro text-text-placeholder mt-[4px]">SRD reference, read-only</p>
            </div>
            <Button variant="primary" onClick={handleAdd} disabled={added || addToLibrary.isPending}>
              {added ? "Added" : addToLibrary.isPending ? "Adding..." : "Add to library"}
            </Button>
          </div>

          {monster && (
            <>
              <div className="flex flex-col gap-sm">
                <span className="block text-label font-semibold uppercase tracking-wider text-text-label">Statblock</span>
                <div className="grid grid-cols-3 gap-sm">
                  <StaticTile label="CR" value={monster.cr ?? ""} />
                  <StaticTile label="Type" value={monster.type ?? ""} />
                  <StaticTile label="Size" value={monster.size ?? ""} />
                  <StaticTile label="AC" value={monster.ac !== undefined ? String(monster.ac) : ""} />
                  <StaticTile label="HP" value={monster.hp !== undefined ? String(monster.hp) : ""} />
                  <StaticTile label="Speed" value={monster.speeds ?? ""} />
                </div>
              </div>

              {monster.abilities && (
                <div className="flex flex-col gap-sm">
                  <span className="block text-label font-semibold uppercase tracking-wider text-text-label">
                    Ability Scores
                  </span>
                  <div className="grid grid-cols-6 gap-sm">
                    <StaticTile label="STR" value={String(monster.abilities.str)} />
                    <StaticTile label="DEX" value={String(monster.abilities.dex)} />
                    <StaticTile label="CON" value={String(monster.abilities.con)} />
                    <StaticTile label="INT" value={String(monster.abilities.int)} />
                    <StaticTile label="WIS" value={String(monster.abilities.wis)} />
                    <StaticTile label="CHA" value={String(monster.abilities.cha)} />
                  </div>
                </div>
              )}

              {monster.actions && monster.actions.length > 0 && (
                <div className="flex flex-col gap-md">
                  <span className="block text-label font-semibold uppercase tracking-wider text-text-label">Actions</span>
                  {monster.actions.map((action, index) => (
                    <div key={index} className="flex flex-col gap-sm border border-border-soft rounded-lg p-md bg-surface-card">
                      <div className="text-content font-semibold text-text-primary">{action.name}</div>
                      <div className="text-ui text-text-primary">{action.description}</div>
                    </div>
                  ))}
                </div>
              )}

              {monster.description && (
                <p className="text-ui text-text-primary leading-[1.5]">{monster.description}</p>
              )}
            </>
          )}

          {item && (
            <>
              <div className="flex gap-md">
                <StaticTile label="Rarity" value={item.rarity ?? ""} />
                <StaticTile label="Category" value={item.category ?? ""} />
                <StaticTile
                  label="Attunement"
                  value={item.attunement === true ? "Required" : item.attunement === false ? "Not required" : ""}
                />
              </div>
              {item.description && <p className="text-ui text-text-primary leading-[1.5]">{item.description}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
