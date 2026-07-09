CREATE TABLE "adventure_directory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"publisher" text NOT NULL,
	"url" text NOT NULL,
	"description" text NOT NULL,
	"tags" text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"premise" text,
	"status" text NOT NULL,
	"notes_json" jsonb NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaigns_status_check" CHECK ("campaigns"."status" in ('draft', 'running', 'completed'))
);
--> statement-breakpoint
CREATE TABLE "entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"campaign_id" uuid,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"summary" text NOT NULL,
	"data" jsonb NOT NULL,
	"backstory_json" jsonb,
	"image_path" text,
	"lineage_root_id" uuid,
	"srd_source_id" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entities_type_check" CHECK ("entities"."type" in ('npc', 'monster', 'item'))
);
--> statement-breakpoint
CREATE TABLE "mentions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"source_type" text NOT NULL,
	"source_id" uuid NOT NULL,
	"campaign_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mentions_source_type_check" CHECK ("mentions"."source_type" in ('scene', 'entity_backstory', 'campaign_notes'))
);
--> statement-breakpoint
CREATE TABLE "scene_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"from_scene_id" uuid NOT NULL,
	"to_scene_id" uuid NOT NULL,
	"label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" text NOT NULL,
	"start_json" jsonb NOT NULL,
	"end_json" jsonb NOT NULL,
	"narration_json" jsonb NOT NULL,
	"map_image_path" text,
	"map_source_url" text,
	"sort_index" integer NOT NULL,
	"graph_x" real,
	"graph_y" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scenes_status_check" CHECK ("scenes"."status" in ('not_run', 'running', 'completed', 'skipped'))
);
--> statement-breakpoint
CREATE TABLE "srd_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"data" jsonb NOT NULL,
	"search_text" text NOT NULL,
	"embedding" vector(384) NOT NULL,
	"cr" numeric,
	"monster_type" text,
	"size" text,
	"environment" text[],
	"alignment" text,
	"rarity" text,
	"category" text,
	"attunement" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "srd_entries_type_check" CHECK ("srd_entries"."type" in ('monster', 'item'))
);
--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_lineage_root_id_entities_id_fk" FOREIGN KEY ("lineage_root_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_srd_source_id_srd_entries_id_fk" FOREIGN KEY ("srd_source_id") REFERENCES "public"."srd_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentions" ADD CONSTRAINT "mentions_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_links" ADD CONSTRAINT "scene_links_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_links" ADD CONSTRAINT "scene_links_from_scene_id_scenes_id_fk" FOREIGN KEY ("from_scene_id") REFERENCES "public"."scenes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_links" ADD CONSTRAINT "scene_links_to_scene_id_scenes_id_fk" FOREIGN KEY ("to_scene_id") REFERENCES "public"."scenes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaigns_user_id_idx" ON "campaigns" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "entities_user_id_idx" ON "entities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "entities_campaign_id_idx" ON "entities" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "mentions_entity_id_idx" ON "mentions" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "scene_links_campaign_id_idx" ON "scene_links" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "scenes_campaign_id_idx" ON "scenes" USING btree ("campaign_id");