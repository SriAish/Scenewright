# Build brief

Status, July 2026: spec, architecture, and screen designs complete. Nothing built yet. This document governs how the app gets built, not what it is. For what it is, read features-and-decisions.md, architecture.md, and screens.md. All decisions there are settled; do not redesign, substitute technologies, or add features.

## Build order (agreed, one feature per instruction)

1. Design system to code: Tailwind config plus shared base components, reviewed on its own before any screen.
2. Supabase project, schema migration, RLS policies.
3. SRD import and embedding precompute scripts.
4. Screens in dependency order, scene editor last of the hard ones (Tiptap mentions, autosave, sidebar are the most moving parts).

Never "build the whole app" in one step.

## Design source and handoff

Screens were designed in Claude Design across two projects, with a published design system extracted from the scene editor. The design system is the source of truth for tokens and icons.

Primary handoff: Claude Design MCP server, connected when build steps run. Fallback: full-res PNGs in design/, filenames matching screen numbers from screens.md.

Designed with all states: scene editor (@ dropdown, chip popover, sidebar states, empty state), campaign shell + scenes list (5), graph view (6), dashboard (2), notes tab (14), entity detail with NPC, monster, and item variants (9), entity tab (8, Characters frame; Monsters and Items share the layout), library (13), monster/item finder (11, monster + item + empty), NPC generation modal (10), import modal (12, including lineage grouping and the flatten/copy confirm step), new campaign modal (3, blank + adventure-prefilled).

Not designed, to be derived from the design system: sign-in (1), attribution page (16), PDF export modal (15).

## Performance configuration (decided)

Vercel function region co-located with the Supabase project region. Pooled (transaction-mode) connection string, never the direct one. Module-scope caching for the embedding pipeline and DB client. React Query with optimistic updates on status flips, link edits, and entity saves. Dynamic imports for Tiptap and React Flow.

## Pending items

- Verify fantasy-content-generator's license before embedding it. If porting mjmcphee's MIT tables instead, keep its copyright notice at the top of the ported file. Resolve before the NPC generation step.
- Dev-mode overlapping PATCH no-response, root-caused to auth proxy concurrency; re-test on Vercel after deploy.

## Standing rules for all build work

- No em dashes in any written output: code comments, copy, docs, commit messages.
- No fabricated or estimated values anywhere: schema, seed data, docs, sample props.
- Flag specific errors rather than requesting broad rewrites.
- Concise, grounded prose.
- Ask rather than invent anything the docs do not specify.