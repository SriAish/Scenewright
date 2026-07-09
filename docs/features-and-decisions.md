## Major Features
### Accounts and campaign dashboard
1. Single GM per account; no sharing of any kind; campaigns visible only to their owner.
2. Dashboard listing all campaigns, filterable by GM-set status: draft / running / completed.
### Campaign creation (pipeline step 1)
1. V1: blank campaign with title and premise/storyline field.
2. Curated link directory of free published adventures with a "start campaign from this" flow; GM reads the source themselves and builds structure in-app. The app never ships, stores, or redistributes adventure text.
3. Deferred: structural templates (genre skeletons pre-seeding a scene graph with placeholder scenes, guidance text, and links).
### Scene system
1. Suggested pipeline (storyline &rarr; start/end scenes &rarr; middle scenes &rarr; per-scene detail), never enforced; any order, any completeness.
2. Per-scene components: start, end, narrative, map, characters, monsters, items.
3. Start and end as separate structured fields; helper shows predecessors' end text (plural) while editing a scene's start.
4. Branching scene graph: directed links (3a &rarr; 5, 3b &rarr; 4 &rarr; 5, dead ends, never-merging branches), optional edge labels, fully editable anytime; orphan scenes legal.
5. Graph/flowchart campaign view supported by the data model from day one; v1 UI can be a flat list.
6. Scene status: not run yet / running / completed / skipped, GM-set ("skipped" exists because untaken branches are neither completed nor pending).
### Rich text editor with entity mentions
1. @ or [[ trigger &rarr; autocomplete of current-campaign entities plus "create new"; inserts a mention node (entity ID + type) rendered as an inline chip; hover popover, click opens full record.
2. Rename propagation: mentions store IDs, so renames update everywhere on render.
Mention-enabled fields: scene narration (including start/end), NPC backstories, campaign notes. Item descriptions are plain text.
3. Create-entity-from-mention: unknown name &rarr; stub record created and linked without breaking writing flow.
4. Soft delete: deleted entities render as greyed-out chips.
5. Reverse-lookup rebuilt on save: which scenes, backstories, and notes reference an entity; auto-populates a scene's Characters/Monsters/Items sections from mentions, manual additions allowed.
### Entity model and reuse
1. One copy per campaign, shared by reference across scenes; edits visible everywhere. All campaign entities are editable, no locked entities.
2. Cross-campaign reuse via fork: independent copy, no syncing. Applies to characters, monsters, and items.
3. Implicit registry: browse/search all entities across campaigns and library, grouped by lineage (root ancestor), not name; version picker shows name, campaign name, two-line description per variant; picking one forks that variant's data. Variants from soft-deleted campaigns hidden by default with a toggle.
4. Import lives in campaign-level tabs via "Import from my other campaigns"; never appears mid-mention. Optional later: an "or import existing…" path from the autocomplete opening the browse dialog.
5. On copy, cross-campaign backstory mentions flatten to plain text, with a prompt to also copy referenced characters.
6. Library: campaign-independent homebrew NPCs/monsters/items as a scope on the same tables; appears in the registry as one more source; import uses the same fork mechanism.Library backstories can mention other library entities.
7. "Save to library" reverse fork from any campaign entity, available anytime, shown only when no library entity shares the entity's lineage.
### Entity generation and retrieval
1. Unified pattern everywhere: describe or constrain &rarr; 3 suggestions &rarr; pick one &rarr; editable campaign copy.
2. NPCs (generated, never retrieved): structured inputs (race, sex, alignment, occupation, plot hooks) producing Description, Personality Traits, Ability Scores, Relationships, Alignment Tendencies. V1 backend: embedded open-source random tables (Relationships left empty for manual entry). Later: free-tier LLM call first (context-aware, auto-wired relationships) with silent fallback to tables on error/rate-limit, plus a "generated offline" note. Generation context = auto-assembled campaign context plus an optional freeform steering box (user text overrides; the box is the fallback for empty campaigns).
3. Monsters and items (retrieved from SRD): two-layer narrowing with no LLM. Layer 1: structured filters (CR, type, size, environment, alignment; rarity, category, attunement) plus keyword search. Layer 2: embedding-based semantic search (SRD embedded once offline, pgvector, top 3 by cosine similarity). Filter-then-rank: filters applied first, survivors ranked by similarity.
4. Manual creation from scratch for all three types, including custom monster statblocks and plot items. Community homebrew import deferred.
### Campaign detail view and notes
1. Tabs: scenes, characters, items, monsters.
2. Campaign-level notes tab for session outcomes, mention-enabled; note references appear in reverse-lookup.
### Maps and images
1. Maps v1: image upload per scene plus optional "map source link" field (Watabou/donjon permalinks reproduce via seed). Deferred: embedded open-source dungeon-generation library.
2. Entity images: upload only for now (NPC portraits, item art).
### Export
1. Campaign-to-PDF, black and white: full campaign in reading order (storyline, scenes with narration, maps, entity lists, entity appendix), notes included, mentions rendered as plain styled text.

## Decisions
### Scope and principles
1. Non-enforcement principle governs everything: the pipeline is a scaffold; data model and generation tolerate partial/placeholder content.
2. No session concept at all: original step 5 dropped; no session mode, log, or view. Purely a campaign-building tool; GM manually flips scene statuses.
3. Campaign and scene statuses are visual labels only, no behavior; completed campaigns stay fully editable.
4. Nothing session-related attaches to specific scenes; session notes are campaign-level only.
5. Low-processing principle: LLM re-ranking of search results explicitly dropped (not deferred).
### Architecture and storage 
1. Editor stack: ProseMirror-based (Tiptap) or Lexical; one reusable editor component across narration, backstories, and notes. 
2. Narration stored as a JSON document tree in one jsonb column; entities in their own tables; mentions reference by ID; reverse-lookup table derived on save. 
3. Schema: scenes plus scene_links (from/to/label); no position column as source of truth; display order derived from the graph. 
4. Scene names like "3a" are GM-typed labels, not computed. 
5. Start/end fields carry no structural meaning; transitions exist only in prose and links. No graph validation. 
6. copied_from_id on every copy always points at the root ancestor (flat, not a chain); fork-path history knowingly not recorded. SRD-derived copies point at the SRD source entry. Forking a variant copies its data but roots to the original. 
7. Campaign deletion is soft delete; lineage IDs stay stable so registry groupings never split. Lineage roots can live inside campaigns; a library copy is just another variant, special only in scope. 
8. Library is campaign-independent storage, not a publishing workflow (the earlier "no library" decision was narrowed to that). 
9. Blob storage (S3-style) for all uploads (entity images and scene maps); not DB rows. 
10. Embedding model: small self-hosted CPU model (sentence-transformers family, e.g. all-MiniLM). SRD corpus small enough for brute-force similarity, no vector index. Accepted trade-off: occasional odd top-3 result, mitigated by filters. 
11. Both NPC generation backends emit one normalized schema so picker, editing, and storage are backend-agnostic. No quota tracking for the free tier; attempt the call, catch failure.
### Licensing and third parties 
1. Monster/item source lists are SRD only (CC-licensed); published books are copyrighted and out; non-SRD official content is GM-entered manually. Seed from open datasets (Open5e / 5e SRD JSON); CC-BY attribution statement for SRD 5.1/5.2 must appear visibly in the app. 
2. Adventures are not in the SRD; free WotC adventures are free to read, not to redistribute; hence the link directory instead of shipping content. GM-pasted notes are private note-taking. 
3. npcgenerator.com is not callable; no reliable free hosted NPC API exists; open-source table libraries are embedded rather than calling third parties. No canonical NPC list exists, so NPCs are generated, never retrieved. 
4. Self-hosted open LLMs rejected (GPU cost, weak CPU models, impractical browser models); if LLM generation lands, it's free-tier hosted inference (e.g. Groq, Gemini free tier). 
5. No free callable map-generation API exists; Watabou maps are free even commercially, attribution optional. 
6. Third-party scraped content is untrusted (a scraped page contained prompt-injection text during research); any future scraping feature must treat page text as untrusted.
