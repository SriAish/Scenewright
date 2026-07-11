import type React from "react";
import { Document, Page, StyleSheet, Text, View, Image } from "@react-pdf/renderer";
import type { EntityType } from "@/lib/entities/schemas";
import type { AbilityScores, ItemData, MonsterData, NpcData } from "./entityTypes";
import type { ResolvedParagraph, ResolvedRun } from "./tiptapDoc";

/*
  Print styles, kept conceptually consistent with the app's type
  hierarchy (src/app/globals.css) without importing it: @react-pdf/
  renderer has its own StyleSheet system and can't consume Tailwind CSS
  variables. Display headings use Times-BoldItalic to echo the app's
  "font-display italic font-semibold" (Lora); body text uses Helvetica
  to echo the sans "Work Sans" body font. Both are react-pdf's built-in
  base-14 fonts, chosen over registering the app's actual webfonts
  (Lora/Work Sans) since that would mean bundling font files or fetching
  them over the network at render time, neither of which the docs call
  for.

  Mentions render as plain styled text per features-and-decisions.md:
  bold + uppercase for an active mention (a print-safe small-caps
  substitute, since true small caps needs a special font), italic for a
  mention pointing at a soft-deleted entity, echoing the app's
  greyed-out chip without relying on color in a black-and-white
  document.
*/
const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10.5,
    lineHeight: 1.4,
    color: "#000000",
    paddingTop: 48,
    paddingBottom: 40,
    paddingHorizontal: 48,
  },
  coverTitle: {
    fontFamily: "Times-BoldItalic",
    fontSize: 26,
    lineHeight: 1.3,
    marginBottom: 20,
  },
  coverPremise: {
    fontSize: 11,
    lineHeight: 1.5,
  },
  sectionHeading: {
    fontFamily: "Times-BoldItalic",
    fontSize: 16,
    lineHeight: 1.3,
    marginTop: 20,
    marginBottom: 12,
  },
  sceneHeading: {
    fontFamily: "Times-BoldItalic",
    fontSize: 14,
    lineHeight: 1.3,
    marginTop: 16,
    marginBottom: 6,
  },
  statusLine: {
    fontSize: 9,
    color: "#444444",
    marginBottom: 8,
  },
  fieldLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: "#333333",
    marginTop: 8,
    marginBottom: 3,
  },
  paragraph: {
    fontSize: 10.5,
    lineHeight: 1.45,
    marginBottom: 5,
  },
  mentionActive: {
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
  },
  mentionDeleted: {
    fontFamily: "Helvetica-Oblique",
  },
  sceneImage: {
    width: "100%",
    maxHeight: 260,
    objectFit: "contain",
    marginTop: 6,
    marginBottom: 6,
  },
  entityImage: {
    width: 90,
    height: 90,
    objectFit: "cover",
    marginBottom: 6,
  },
  entityListItem: {
    fontSize: 10,
    marginBottom: 2,
  },
  appendixItem: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 0.75,
    borderTopColor: "#999999",
  },
  appendixName: {
    fontFamily: "Times-Bold",
    fontSize: 13,
    lineHeight: 1.3,
    marginBottom: 4,
  },
  appendixSummary: {
    fontSize: 9.5,
    color: "#444444",
    marginBottom: 4,
  },
  statblockRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 4,
  },
  statblockField: {
    fontSize: 9.5,
  },
  statblockFieldLabel: {
    fontFamily: "Helvetica-Bold",
  },
  actionBlock: {
    marginTop: 4,
    marginBottom: 2,
  },
  actionName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
  },
  footerNote: {
    fontSize: 8,
    color: "#666666",
  },
});

function Paragraphs({ paragraphs }: { paragraphs: ResolvedParagraph[] }) {
  return (
    <>
      {paragraphs.map((paragraph, index) => (
        <Text key={index} style={styles.paragraph}>
          {paragraph.map((run, runIndex) => (
            <Run key={runIndex} run={run} />
          ))}
        </Text>
      ))}
    </>
  );
}

function Run({ run }: { run: ResolvedRun }) {
  if (run.kind === "text") return <Text>{run.text}</Text>;
  return <Text style={run.deleted ? styles.mentionDeleted : styles.mentionActive}>{run.name}</Text>;
}

function Field({ label, paragraphs }: { label: string; paragraphs: ResolvedParagraph[] }) {
  if (paragraphs.length === 0) return null;
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Paragraphs paragraphs={paragraphs} />
    </View>
  );
}

export interface PdfSceneEntityRef {
  name: string;
  type: EntityType;
  deleted: boolean;
}

export interface PdfScene {
  id: string;
  name: string;
  statusLabel: string;
  start: ResolvedParagraph[];
  narration: ResolvedParagraph[];
  end: ResolvedParagraph[];
  mapImage: Buffer | null;
  sidebarEntities: PdfSceneEntityRef[];
}

interface AppendixItemBase {
  id: string;
  name: string;
  summary: string;
  image: Buffer | null;
}

export interface PdfNpcAppendixItem extends AppendixItemBase {
  kind: "npc";
  data: NpcData;
  backstory: ResolvedParagraph[];
}

export interface PdfMonsterAppendixItem extends AppendixItemBase {
  kind: "monster";
  data: MonsterData;
}

export interface PdfItemAppendixItem extends AppendixItemBase {
  kind: "item";
  data: ItemData;
}

export type PdfAppendixItem = PdfNpcAppendixItem | PdfMonsterAppendixItem | PdfItemAppendixItem;

export interface PdfExportData {
  campaignTitle: string;
  premiseParagraphs: string[];
  scenes: PdfScene[];
  npcs: PdfNpcAppendixItem[];
  monsters: PdfMonsterAppendixItem[];
  items: PdfItemAppendixItem[];
  notes: ResolvedParagraph[];
}

function EntityImage({ image, style }: { image: Buffer | null; style: React.ComponentProps<typeof Image>["style"] }) {
  if (!image) return null;
  // react-pdf's Image renders into a PDF, not the DOM; it has no alt prop.
  // eslint-disable-next-line jsx-a11y/alt-text
  return <Image src={{ data: image, format: "png" }} style={style} />;
}

function AbilityScoreLine({ scores }: { scores?: AbilityScores }) {
  if (!scores) return null;
  return (
    <View style={styles.statblockRow}>
      {(["str", "dex", "con", "int", "wis", "cha"] as const).map((key) => (
        <Text key={key} style={styles.statblockField}>
          <Text style={styles.statblockFieldLabel}>{key.toUpperCase()} </Text>
          {scores[key]}
        </Text>
      ))}
    </View>
  );
}

function NpcAppendixEntry({ item }: { item: PdfNpcAppendixItem }) {
  return (
    <View style={styles.appendixItem} wrap={false}>
      <EntityImage image={item.image} style={styles.entityImage} />
      <Text style={styles.appendixName}>{item.name}</Text>
      {item.summary && <Text style={styles.appendixSummary}>{item.summary}</Text>}
      {item.data.description && <Text style={styles.paragraph}>{item.data.description}</Text>}
      {item.data.personalityTraits && (
        <View>
          <Text style={styles.fieldLabel}>Personality Traits</Text>
          <Text style={styles.paragraph}>{item.data.personalityTraits}</Text>
        </View>
      )}
      {item.data.abilityScores && (
        <View>
          <Text style={styles.fieldLabel}>Ability Scores</Text>
          <AbilityScoreLine scores={item.data.abilityScores} />
        </View>
      )}
      {item.data.relationships && (
        <View>
          <Text style={styles.fieldLabel}>Relationships</Text>
          <Text style={styles.paragraph}>{item.data.relationships}</Text>
        </View>
      )}
      {item.data.alignmentTendencies && (
        <View>
          <Text style={styles.fieldLabel}>Alignment Tendencies</Text>
          <Text style={styles.paragraph}>{item.data.alignmentTendencies}</Text>
        </View>
      )}
      <Field label="Backstory" paragraphs={item.backstory} />
    </View>
  );
}

function MonsterAppendixEntry({ item }: { item: PdfMonsterAppendixItem }) {
  const { data } = item;
  const hasStatline = [data.cr, data.type, data.size, data.ac, data.hp, data.speeds].some(
    (value) => value !== undefined && value !== "",
  );
  return (
    <View style={styles.appendixItem} wrap={false}>
      <EntityImage image={item.image} style={styles.entityImage} />
      <Text style={styles.appendixName}>{item.name}</Text>
      {item.summary && <Text style={styles.appendixSummary}>{item.summary}</Text>}
      {hasStatline && (
        <View style={styles.statblockRow}>
          {data.cr !== undefined && data.cr !== "" && (
            <Text style={styles.statblockField}><Text style={styles.statblockFieldLabel}>CR </Text>{data.cr}</Text>
          )}
          {data.type && (
            <Text style={styles.statblockField}><Text style={styles.statblockFieldLabel}>Type </Text>{data.type}</Text>
          )}
          {data.size && (
            <Text style={styles.statblockField}><Text style={styles.statblockFieldLabel}>Size </Text>{data.size}</Text>
          )}
          {data.ac !== undefined && (
            <Text style={styles.statblockField}><Text style={styles.statblockFieldLabel}>AC </Text>{data.ac}</Text>
          )}
          {data.hp !== undefined && (
            <Text style={styles.statblockField}><Text style={styles.statblockFieldLabel}>HP </Text>{data.hp}</Text>
          )}
          {data.speeds && (
            <Text style={styles.statblockField}><Text style={styles.statblockFieldLabel}>Speed </Text>{data.speeds}</Text>
          )}
        </View>
      )}
      <AbilityScoreLine scores={data.abilities} />
      {data.description && <Text style={styles.paragraph}>{data.description}</Text>}
      {(data.actions ?? []).length > 0 && (
        <View>
          <Text style={styles.fieldLabel}>Actions</Text>
          {data.actions!.map((action, index) => (
            <View key={index} style={styles.actionBlock}>
              <Text style={styles.actionName}>{action.name || "Unnamed action"}</Text>
              <Text style={styles.paragraph}>{action.description}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function ItemAppendixEntry({ item }: { item: PdfItemAppendixItem }) {
  const { data } = item;
  const hasMeta = data.rarity || data.category || data.attunement;
  return (
    <View style={styles.appendixItem} wrap={false}>
      <EntityImage image={item.image} style={styles.entityImage} />
      <Text style={styles.appendixName}>{item.name}</Text>
      {item.summary && <Text style={styles.appendixSummary}>{item.summary}</Text>}
      {hasMeta && (
        <View style={styles.statblockRow}>
          {data.rarity && (
            <Text style={styles.statblockField}><Text style={styles.statblockFieldLabel}>Rarity </Text>{data.rarity}</Text>
          )}
          {data.category && (
            <Text style={styles.statblockField}><Text style={styles.statblockFieldLabel}>Category </Text>{data.category}</Text>
          )}
          {data.attunement && <Text style={styles.statblockField}>Requires attunement</Text>}
        </View>
      )}
      {data.description && <Text style={styles.paragraph}>{data.description}</Text>}
    </View>
  );
}

function SceneSection({ scene }: { scene: PdfScene }) {
  return (
    <View wrap={true}>
      <Text style={styles.sceneHeading}>{scene.name}</Text>
      <Text style={styles.statusLine}>Status: {scene.statusLabel}</Text>
      {scene.mapImage && (
        // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image has no alt prop; it renders into a PDF, not the DOM.
        <Image src={{ data: scene.mapImage, format: "png" }} style={styles.sceneImage} />
      )}
      <Field label="Start" paragraphs={scene.start} />
      <Field label="Narration" paragraphs={scene.narration} />
      <Field label="End" paragraphs={scene.end} />
      {scene.sidebarEntities.length > 0 && (
        <View>
          <Text style={styles.fieldLabel}>Characters, Monsters, and Items</Text>
          {scene.sidebarEntities.map((entity, index) => (
            <Text key={index} style={styles.entityListItem}>
              {entity.name}
              {entity.deleted ? " (deleted)" : ""}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

/*
  A plain builder function rather than a component consumed as JSX at
  the root: renderToBuffer's type expects a React.ReactElement<
  DocumentProps> specifically, which a <Document> element satisfies
  directly but a wrapper component's own element does not. Everything
  nested below (SceneSection, NpcAppendixEntry, etc.) is still ordinary
  JSX; only the outermost call needs to already be the Document element.
*/
export function buildCampaignPdfDocument(data: PdfExportData) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.coverTitle}>{data.campaignTitle}</Text>
        {data.premiseParagraphs.map((paragraph, index) => (
          <Text key={index} style={styles.coverPremise}>
            {paragraph}
          </Text>
        ))}

        {data.scenes.length > 0 && <Text style={styles.sectionHeading}>Scenes</Text>}
        {data.scenes.map((scene) => (
          <SceneSection key={scene.id} scene={scene} />
        ))}

        {(data.npcs.length > 0 || data.monsters.length > 0 || data.items.length > 0) && (
          <>
            <Text style={styles.sectionHeading} break>
              Entity Appendix
            </Text>
            {data.npcs.length > 0 && (
              <View>
                <Text style={styles.sceneHeading}>Characters</Text>
                {data.npcs.map((item) => (
                  <NpcAppendixEntry key={item.id} item={item} />
                ))}
              </View>
            )}
            {data.monsters.length > 0 && (
              <View>
                <Text style={styles.sceneHeading}>Monsters</Text>
                {data.monsters.map((item) => (
                  <MonsterAppendixEntry key={item.id} item={item} />
                ))}
              </View>
            )}
            {data.items.length > 0 && (
              <View>
                <Text style={styles.sceneHeading}>Items</Text>
                {data.items.map((item) => (
                  <ItemAppendixEntry key={item.id} item={item} />
                ))}
              </View>
            )}
          </>
        )}

        {data.notes.length > 0 && (
          <View break>
            <Text style={styles.sectionHeading}>Campaign Notes</Text>
            <Paragraphs paragraphs={data.notes} />
          </View>
        )}

        <Text
          style={styles.footerNote}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}
