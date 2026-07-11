"use client";

import { useState, ReactNode } from "react";
import {
  Button,
  IconButton,
  StatusPill,
  MentionChip,
  MentionPopover,
  EntityCard,
  FinderResultCard,
  GenerationCandidateCard,
  ModalChassis,
  EmptyState,
  EntityIcon,
  EntityType,
  entityTypeLabel,
  PlusIcon,
  CloseIcon,
} from "@/components/ui";

const entityTypes: EntityType[] = ["npc", "monster", "item"];

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="mb-[48px]">
      <h2 className="font-display italic font-semibold text-display text-text-primary mb-[4px]">{title}</h2>
      {description && <p className="text-ui text-text-secondary mb-lg">{description}</p>}
      <div className="flex flex-col gap-lg">{children}</div>
    </section>
  );
}

function StateRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-micro font-medium uppercase tracking-wider text-text-label mb-sm">{label}</div>
      <div className="flex flex-wrap items-center gap-base">{children}</div>
    </div>
  );
}

export default function DesignPreviewPage() {
  const [smallModalOpen, setSmallModalOpen] = useState(true);
  const [twoPanelModalOpen, setTwoPanelModalOpen] = useState(true);

  const abilityScores = [
    { label: "STR", value: "—" },
    { label: "DEX", value: "—" },
    { label: "CON", value: "—" },
    { label: "INT", value: "—" },
    { label: "WIS", value: "—" },
    { label: "CHA", value: "—" },
  ];

  return (
    <main className="max-w-[960px] mx-auto px-xl py-[48px]">
      <header className="mb-[48px]">
        <h1 className="font-display italic font-semibold text-[28px] text-text-primary mb-sm">
          Scenewright design preview
        </h1>
        <p className="text-ui text-text-secondary">
          Temporary review route for the shared base components. Not part of the app&apos;s
          navigation. Sample content uses neutral placeholder labels only.
        </p>
      </header>

      <Section title="Buttons" description="Primary (filled accent), secondary (outline), destructive (outline), and icon button.">
        <StateRow label="Primary / Secondary / Destructive">
          <Button variant="primary">Primary action</Button>
          <Button variant="secondary">Secondary action</Button>
          <Button variant="destructive">Remove</Button>
        </StateRow>
        <StateRow label="Small size">
          <Button variant="primary" size="sm">Primary</Button>
          <Button variant="secondary" size="sm">Secondary</Button>
        </StateRow>
        <StateRow label="Icon button">
          <IconButton label="Close">
            <CloseIcon />
          </IconButton>
          <IconButton label="Add">
            <PlusIcon />
          </IconButton>
        </StateRow>
      </Section>

      <Section title="Entity type glyphs" description="Icon assets pulled from the design system: npc (source label: Person), monster, item.">
        <StateRow label="Types">
          {entityTypes.map((type) => (
            <div key={type} className="flex items-center gap-[6px] text-ui text-text-secondary">
              <EntityIcon type={type} size={16} className="text-text-primary" />
              {entityTypeLabel[type]}
            </div>
          ))}
        </StateRow>
      </Section>

      <Section title="StatusPill" description="Two families sharing one chassis: campaign status and scene status.">
        <StateRow label="Campaign status">
          <StatusPill family="campaign" status="draft" />
          <StatusPill family="campaign" status="running" />
          <StatusPill family="campaign" status="completed" />
        </StateRow>
        <StateRow label="Scene status">
          <StatusPill family="scene" status="not_run" />
          <StatusPill family="scene" status="running" />
          <StatusPill family="scene" status="completed" />
          <StatusPill family="scene" status="skipped" />
        </StateRow>
      </Section>

      <Section title="MentionChip" description="Inline entity tag with type icon. States: default, soft-deleted, auto-populated vs. manually added.">
        <StateRow label="Default">
          {entityTypes.map((type) => (
            <MentionChip key={type} type={type}>
              {`Example ${entityTypeLabel[type]}`}
            </MentionChip>
          ))}
        </StateRow>
        <StateRow label="Soft-deleted">
          {entityTypes.map((type) => (
            <MentionChip key={type} type={type} deleted>
              {`Example ${entityTypeLabel[type]}`}
            </MentionChip>
          ))}
        </StateRow>
        <StateRow label="Auto-populated from a mention (solid, no border)">
          <MentionChip type="npc">Example NPC</MentionChip>
        </StateRow>
        <StateRow label="Manually added (dashed border)">
          <MentionChip type="npc" manual>
            Example NPC
          </MentionChip>
        </StateRow>
      </Section>

      <Section title="MentionPopover" description="Hover card: name, type, two-line summary. Shown without a thumbnail (no sourced image asset).">
        <StateRow label="By type">
          {entityTypes.map((type) => (
            <MentionPopover
              key={type}
              type={type}
              name={`Example ${entityTypeLabel[type]}`}
              summary="Example two-line summary text, used to preview the truncation and layout of this card."
            />
          ))}
        </StateRow>
      </Section>

      <Section title="EntityCard" description="Grid card for entity tabs and the library.">
        <StateRow label="Type-icon placeholder (no image)">
          {entityTypes.map((type) => (
            <div key={type} className="w-[200px]">
              <EntityCard
                type={type}
                name={`Example ${entityTypeLabel[type]}`}
                summary="Example two-line summary text describing this entity for the picker."
                appearsInSlot="Appears in N scenes"
              />
            </div>
          ))}
        </StateRow>
        <StateRow label="Without the appears-in slot">
          <div className="w-[200px]">
            <EntityCard
              type="npc"
              name="Example NPC"
              summary="Example two-line summary text describing this entity for the picker."
            />
          </div>
        </StateRow>
      </Section>

      <Section title="Result / candidate card family" description="Shared chassis, two variants: finder result row and NPC generation candidate.">
        <StateRow label="Finder result card">
          <div className="w-full">
            <FinderResultCard
              name="Example monster"
              keyStats="Example key stats line"
              description="Example short description of the result, truncated to two lines."
              onAdd={() => {}}
            />
          </div>
        </StateRow>
        <StateRow label="NPC generation candidate card">
          <div className="w-[280px]">
            <GenerationCandidateCard
              name="Example NPC"
              descriptionExcerpt="Example description excerpt for this candidate."
              personalityTraits="Example personality traits"
              abilityScores={abilityScores}
              alignmentTendency="Example alignment tendency"
              onUse={() => {}}
            />
          </div>
        </StateRow>
      </Section>

      <Section title="ModalChassis" description="Header, padding, footer, dimmed backdrop. Small and two-panel size variants, shown inline for review.">
        <StateRow label="Small (e.g. new campaign)">
          <div className="relative w-full h-[360px] rounded-md border border-border-default overflow-hidden bg-surface-canvas">
            {smallModalOpen ? (
              <ModalChassis
                title="Example modal"
                size="small"
                inline
                onClose={() => setSmallModalOpen(false)}
                footer={
                  <div className="flex justify-end gap-sm">
                    <Button variant="secondary" size="sm" onClick={() => setSmallModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => setSmallModalOpen(false)}>
                      Confirm
                    </Button>
                  </div>
                }
              >
                <p className="text-ui text-text-secondary">Example modal body content.</p>
              </ModalChassis>
            ) : (
              <div className="flex items-center justify-center h-full">
                <Button variant="secondary" size="sm" onClick={() => setSmallModalOpen(true)}>
                  Reopen
                </Button>
              </div>
            )}
          </div>
        </StateRow>
        <StateRow label="Two-panel (e.g. finder, NPC generation)">
          <div className="relative w-full h-[420px] rounded-md border border-border-default overflow-hidden bg-surface-canvas">
            {twoPanelModalOpen ? (
              <ModalChassis
                title="Example modal"
                size="two-panel"
                inline
                onClose={() => setTwoPanelModalOpen(false)}
                footer={
                  <div className="flex justify-end gap-sm">
                    <Button variant="secondary" size="sm" onClick={() => setTwoPanelModalOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                }
              >
                <div className="w-[250px] shrink-0">
                  <p className="text-ui text-text-secondary">Example left panel content.</p>
                </div>
                <div className="flex-1">
                  <p className="text-ui text-text-secondary">Example right panel content.</p>
                </div>
              </ModalChassis>
            ) : (
              <div className="flex items-center justify-center h-full">
                <Button variant="secondary" size="sm" onClick={() => setTwoPanelModalOpen(true)}>
                  Reopen
                </Button>
              </div>
            )}
          </div>
        </StateRow>
      </Section>

      <Section title="EmptyState" description="Quiet block, no illustrations. With and without an action slot.">
        <StateRow label="With action">
          <EmptyState
            heading="Example empty heading"
            copy="Example one-line copy explaining the empty state."
            action={<Button variant="primary" size="sm">Example action</Button>}
          />
        </StateRow>
        <StateRow label="Without action">
          <EmptyState heading="Example empty heading" copy="Example one-line copy explaining the empty state." />
        </StateRow>
      </Section>
    </main>
  );
}
