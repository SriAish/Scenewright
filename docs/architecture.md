# System Architecture (consolidated, v2)

## Tech stack

- **Framework:** Next.js (React, TypeScript), frontend and API route handlers in one codebase, deployed on Vercel (Hobby tier, Fluid compute on by default).
- **Database:** Supabase Postgres with pgvector extension; Supabase Auth for accounts; Supabase Storage for blobs; row-level security throughout.
- **ORM:** Drizzle or Prisma, pointed at Supabase's pooled (transaction-mode) connection string.
- **Styling:** Tailwind.

## External APIs

- **V1:** none at runtime. SRD data is imported by a build-time script from open datasets (Open5e / 5e SRD JSON). Supabase and Vercel are owned infrastructure, not content APIs.
- **Long term:** one free-tier LLM inference endpoint (Groq or Gemini) for context-aware NPC generation, behind a fallback adapter.

## Open source libraries

### V1

- Tiptap + Mention extension (rich text, mention nodes)
- fantasy-content-generator or mjmcphee's tables ported to TypeScript (NPC random generation)
- transformers.js with all-MiniLM (query embedding in Node)
- pgvector (vector storage + cosine similarity)
- @xyflow/react (React Flow) for the campaign graph view; dagre or elkjs for auto-arrange
- @react-pdf/renderer (PDF export)
- React Query or SWR (client cache, optimistic updates)
- zod (payload validation, normalized NPC schema)

### Long term

- LLM provider SDK
- Procedural dungeon-generation library for embedded maps

## Components

- **Web client (Next.js pages, RSC defaults):** dashboard, campaign view (tabs: scenes, characters, items, monsters, notes), scene editor, graph view, registry browser, library. Tiptap and React Flow are dynamically imported so only their routes pay the bundle cost. Directory and attribution pages are statically rendered.
- **API layer (route handlers):** auth-gated CRUD plus the services below. All business logic server-side.
- **Mention/reverse-lookup service:** on save of any mention-enabled doc, walks Tiptap JSON, extracts mention nodes, replaces that document's mention rows in the same transaction as the doc write.
- **Search service:** structured filters as SQL WHERE, then embed prose query via module-scope-cached transformers.js, then rank survivors by cosine similarity in pgvector, then top 3.
- **Generation service:** emits the normalized NPC schema. V1: table generator only. Later: try LLM, catch any error or rate-limit, fall back to tables, flag "generated offline."
- **Fork service:** single implementation for all copy operations (cross-campaign import, SRD add, library import, save-to-library): lineage resolution, mention flattening, referenced-entity copy prompt. Transactional.
- **PDF exporter:** walks campaign in graph-derived reading order, renders mentions as styled text, grayscale-converts images, streams the file.
- **Blob storage (Supabase Storage, private buckets):** entity images and map images, uploaded client-direct via short-lived signed URLs.
- **Build-time scripts:** SRD import + filter-column population + embedding precompute (re-runs incrementally for hand-added entries).

## Call flows

- **@ autocomplete:** client → API (debounced prefix query, campaign-scoped) → Postgres → dropdown.
- **Doc save:** client sends Tiptap JSON → API writes jsonb + rebuilds mention rows, one transaction.
- **Monster/item search:** filters + prose → search service → top 3 (filter-then-rank, no LLM).
- **NPC generation:** structured inputs (+ optional steering text) → generation service → 3 candidates → pick → insert entity.
- **Fork/import:** registry pick → fork service → clone into target scope, handle referenced mentions per prompt answer.
- **Graph edit:** drawing an edge creates a `scene_links` row; dragging a node persists `graph_x`/`graph_y`; clicking a node navigates to the scene page. Auto-arrange (dagre/elkjs) runs on unplaced nodes or on demand.
- **PDF export:** endpoint reads campaign → streams file.
- **Image upload:** API issues signed URL → client uploads directly to storage → path saved via normal API call.
- Status flips, link edits, and similar small writes are optimistic on the client (React Query/SWR), reconciled in the background.

## Database tables

(uuid PKs, `created_at`/`updated_at` timestamptz on all tables, omitted below)

### users
Supabase Auth managed; app tables carry `user_id uuid`.

### campaigns
- `user_id` uuid FK
- `title` text, `premise` text
- `status` text check: draft | running | completed
- `notes_json` jsonb (mention-enabled campaign notes doc)
- `deleted_at` timestamptz null (soft delete)

### scenes
- `campaign_id` uuid FK
- `name` text (GM label, e.g. "3a")
- `status` text check: not_run | running | completed | skipped
- `start_json` jsonb, `end_json` jsonb, `narration_json` jsonb
- `map_image_path` text null, `map_source_url` text null
- `sort_index` int (list display only, not structural)
- `graph_x` real null, `graph_y` real null (persisted graph positions; null = auto-layout on first render)

### scene_links
- `campaign_id` uuid FK
- `from_scene_id` uuid FK, `to_scene_id` uuid FK
- `label` text null

### entities
One table, all three types.

- `user_id` uuid FK
- `campaign_id` uuid null FK (null = library scope)
- `type` text check: npc | monster | item
- `name` text, `summary` text (two-line picker description)
- `data` jsonb (type-specific: ability scores, statblock, item properties; NPC payload conforms to the normalized generation schema)
- `backstory_json` jsonb null (NPCs, mention-enabled)
- `image_path` text null
- `lineage_root_id` uuid null FK → entities (registry grouping; always the root ancestor)
- `srd_source_id` uuid null FK → srd_entries
- `deleted_at` timestamptz null

### srd_entries
Read-only reference.

- `type` text check: monster | item
- `name` text, `data` jsonb
- `search_text` text (full-text indexed)
- `embedding` vector(384)
- Filter columns: `cr` numeric null, `monster_type` text null, `size` text null, `environment` text[] null, `alignment` text null, `rarity` text null, `category` text null, `attunement` boolean null

### mentions
Derived, rebuilt on save; indexed on `entity_id`.

- `entity_id` uuid FK
- `source_type` text check: scene | entity_backstory | campaign_notes
- `source_id` uuid
- `campaign_id` uuid null

### adventure_directory
Seeded by you, static.

- `title` text, `publisher` text, `url` text, `description` text, `tags` text[]

## Performance configuration

The straightforward set, all free-tier:

- **Region co-location:** Vercel function region set to match the Supabase project region.
- **Pooled connections:** ORM uses Supabase's serverless/pooled connection string (transaction mode), never the direct one.
- **Module-scope caching:** embedding pipeline and DB client held in module-level variables, lazily initialized, reused across warm invocations (Fluid compute keeps instances alive on Hobby tier).
- React Query/SWR with optimistic updates on status flips, link edits, and entity saves; debounced autocomplete.
- Dynamic imports for Tiptap and React Flow.
- **Deferred optimizations, revisit only if felt:** client-direct Supabase reads for autocomplete (adds a second data-access pattern, makes RLS load-bearing for logic); deliberate RSC fetch architecture beyond defaults; moving to a small always-on server (Fly/Railway) if cold starts still annoy, which would also allow a permanently-resident embedding model.

## Cross-cutting concerns

- **Security:** RLS policies keyed on `user_id` on every table, enforcing single-GM ownership at the DB layer; private storage buckets, signed-URL access only.
- **Transactions:** two multi-write operations, doc-save + mention rebuild and fork + referenced copies, are transactional.
- **Soft delete:** `deleted_at` on campaigns and entities; default query scopes filter it; mention and lineage rows never cascade-deleted; registry hides deleted-campaign variants behind the toggle.
- **Embedding lifecycle:** build-time for SRD rows, incremental for hand-added entries; runtime embeds only the GM's query string.
- **Licensing surface:** static attribution page with the SRD CC-BY statement linked in the footer; app ships no adventure text.
- **Cost:** $0 at single-user scale (Vercel Hobby + Supabase free tier); the only future cost line is LLM inference past free tiers, mitigated by the table fallback.
- **V1 → later seams:** generation service adapter (tables → LLM+fallback), map generator library slot, structural templates (pure data, no schema change), PDF dithering pass, autocomplete "import existing…" path. All designed so nothing gets rebuilt when they land.