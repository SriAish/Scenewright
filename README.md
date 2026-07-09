# Scenewright

Campaign planning tool for game masters. Build branching scene graphs, link NPCs, monsters, and items inline, and prep TTRPG campaigns scene by scene.

Scenewright is a campaign-building tool for tabletop GMs. Campaigns are built as scenes connected in a branching graph: write each scene's start, end, and narration, link characters, monsters, and items directly in the text with @mentions, and see the whole campaign as a flowchart. Entities are reusable across scenes and campaigns, with a personal library for homebrew. Includes SRD monster and item search (filters plus semantic matching), random NPC generation, per-scene map uploads, and black-and-white PDF export.

Planning-only by design: no session runner, no VTT. Scenewright is for the prep between sessions, not the table.

## Features

- **Branching scene graph.** Scenes are nodes with directed links: branches, dead ends, and paths that never merge back are all valid. Orphan scenes are legal; structure is never enforced. Graph view with draggable, persisted layout.
- **Inline entity mentions.** Type @ in any scene narration, NPC backstory, or campaign note to link an entity. Mentions are references, not text: rename an NPC once and every mention updates. Hover for a summary card, click to open the record.
- **Reusable entities.** One copy per campaign, shared across scenes. Fork entities between campaigns or from a personal library; variants are grouped by lineage so you can pick which version to reuse.
- **SRD monster and item finder.** Structured filters (CR, type, rarity, and more) plus semantic search over SRD 5.1/5.2 content: describe what you want, get the top matches. Copies are campaign-local and fully editable.
- **NPC generation.** Constraint-based (race, alignment, occupation, plot hooks) with three candidates per roll. V1 runs on embedded open-source random tables; no external API required.
- **Scene maps and entity images.** Image upload per scene with an optional generator permalink field; portraits and item art on entities.
- **Campaign notes and statuses.** A mention-enabled notes tab for session outcomes; GM-set statuses on campaigns and scenes (including "skipped" for untaken branches). Labels only: nothing is enforced.
- **PDF export.** Full campaign in reading order, black and white.

## Tech stack

Next.js (TypeScript) on Vercel · Supabase (Postgres + pgvector, Auth, Storage) · Tiptap · React Flow · transformers.js for embeddings · @react-pdf/renderer

No runtime external APIs in v1. SRD data is imported at build time from open datasets; semantic search runs on a small local embedding model.

## Status

Personal project, under active development. Single-user by design: no sharing, no collaboration features planned.

## Licensing

Code is MIT licensed (see [LICENSE](LICENSE)).

This work includes material from the System Reference Document 5.1 and 5.2 ("SRD") by Wizards of the Coast LLC, available under the Creative Commons Attribution 4.0 International License. Scenewright is an independent project and is not affiliated with or endorsed by Wizards of the Coast.
