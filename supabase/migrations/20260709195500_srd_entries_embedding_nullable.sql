-- Correction: embedding must allow null between import and the embed
-- precompute step (and for hand-added entries awaiting their next
-- incremental embed run). See scripts/srd/embed.ts.
alter table srd_entries alter column embedding drop not null;
