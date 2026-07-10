-- Unique index supporting idempotent upsert of SRD import rows.
create unique index srd_entries_type_name_idx on srd_entries (type, name);
