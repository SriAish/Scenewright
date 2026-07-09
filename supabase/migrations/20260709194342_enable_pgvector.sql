-- Enable pgvector, required before srd_entries.embedding (vector(384)) can be created.
create extension if not exists vector;
