import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

/*
  Schema transcribed from docs/architecture.md, "Database tables" section.
  Every table carries uuid id (default gen_random_uuid), created_at and
  updated_at timestamptz (updated_at maintained by a trigger, see the
  migration). Column presence, nullability, and check constraints follow
  that section exactly, with one resolved ambiguity: campaigns.premise is
  nullable, per screens.md's "optional premise textarea" (architecture.md's
  schema table omitted the "null" annotation it uses elsewhere).
*/

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    title: text("title").notNull(),
    premise: text("premise"),
    status: text("status").notNull(),
    notesJson: jsonb("notes_json").notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("campaigns_status_check", sql`${table.status} in ('draft', 'running', 'completed')`),
    index("campaigns_user_id_idx").on(table.userId),
  ],
);

export const scenes = pgTable(
  "scenes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id),
    name: text("name").notNull(),
    status: text("status").notNull(),
    startJson: jsonb("start_json").notNull(),
    endJson: jsonb("end_json").notNull(),
    narrationJson: jsonb("narration_json").notNull(),
    mapImagePath: text("map_image_path"),
    mapSourceUrl: text("map_source_url"),
    sortIndex: integer("sort_index").notNull(),
    graphX: real("graph_x"),
    graphY: real("graph_y"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "scenes_status_check",
      sql`${table.status} in ('not_run', 'running', 'completed', 'skipped')`,
    ),
    index("scenes_campaign_id_idx").on(table.campaignId),
  ],
);

export const sceneLinks = pgTable(
  "scene_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id),
    fromSceneId: uuid("from_scene_id")
      .notNull()
      .references(() => scenes.id),
    toSceneId: uuid("to_scene_id")
      .notNull()
      .references(() => scenes.id),
    label: text("label"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("scene_links_campaign_id_idx").on(table.campaignId)],
);

export const entities = pgTable(
  "entities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    campaignId: uuid("campaign_id").references(() => campaigns.id),
    type: text("type").notNull(),
    name: text("name").notNull(),
    summary: text("summary").notNull(),
    data: jsonb("data").notNull(),
    backstoryJson: jsonb("backstory_json"),
    imagePath: text("image_path"),
    // Null for entities created directly (manual creation, generation,
    // SRD add): they have no lineage relationship yet, and are their
    // own root. Set only by the fork service (later build step), which
    // must resolve an entity's effective root as
    // COALESCE(lineage_root_id, id) rather than assume the column is
    // always populated. Confirmed 2026-07-10.
    lineageRootId: uuid("lineage_root_id").references((): AnyPgColumn => entities.id),
    srdSourceId: uuid("srd_source_id").references(() => srdEntries.id),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("entities_type_check", sql`${table.type} in ('npc', 'monster', 'item')`),
    index("entities_user_id_idx").on(table.userId),
    index("entities_campaign_id_idx").on(table.campaignId),
  ],
);

export const srdEntries = pgTable(
  "srd_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: text("type").notNull(),
    name: text("name").notNull(),
    data: jsonb("data").notNull(),
    searchText: text("search_text").notNull(),
    // Nullable: rows exist between import and embed precompute, and
    // between hand-adding an entry and its next incremental embed run.
    embedding: vector("embedding", { dimensions: 384 }),
    cr: numeric("cr"),
    monsterType: text("monster_type"),
    size: text("size"),
    environment: text("environment").array(),
    alignment: text("alignment"),
    rarity: text("rarity"),
    category: text("category"),
    attunement: boolean("attunement"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("srd_entries_type_check", sql`${table.type} in ('monster', 'item')`),
    uniqueIndex("srd_entries_type_name_idx").on(table.type, table.name),
  ],
);

export const mentions = pgTable(
  "mentions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id),
    sourceType: text("source_type").notNull(),
    sourceId: uuid("source_id").notNull(),
    campaignId: uuid("campaign_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "mentions_source_type_check",
      sql`${table.sourceType} in ('scene', 'entity_backstory', 'campaign_notes')`,
    ),
    index("mentions_entity_id_idx").on(table.entityId),
  ],
);

export const adventureDirectory = pgTable("adventure_directory", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  publisher: text("publisher").notNull(),
  url: text("url").notNull(),
  description: text("description").notNull(),
  tags: text("tags").array().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
