-- Single reusable trigger function to maintain updated_at on every table.
create function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on campaigns
  for each row execute function set_updated_at();

create trigger set_updated_at before update on scenes
  for each row execute function set_updated_at();

create trigger set_updated_at before update on scene_links
  for each row execute function set_updated_at();

create trigger set_updated_at before update on entities
  for each row execute function set_updated_at();

create trigger set_updated_at before update on srd_entries
  for each row execute function set_updated_at();

create trigger set_updated_at before update on mentions
  for each row execute function set_updated_at();

create trigger set_updated_at before update on adventure_directory
  for each row execute function set_updated_at();

-- Full-text index on srd_entries.search_text. No vector index (brute-force
-- similarity is the settled decision).
create index srd_entries_search_text_idx on srd_entries
  using gin (to_tsvector('english', search_text));

-- Row level security.
alter table campaigns enable row level security;
alter table scenes enable row level security;
alter table scene_links enable row level security;
alter table entities enable row level security;
alter table srd_entries enable row level security;
alter table mentions enable row level security;
alter table adventure_directory enable row level security;

-- campaigns, entities: all four operations only where user_id = auth.uid().
create policy "campaigns_owner_all" on campaigns
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "entities_owner_all" on entities
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- scenes, scene_links: all operations only where the parent campaign
-- belongs to the caller.
create policy "scenes_owner_all" on scenes
  for all
  to authenticated
  using (
    exists (
      select 1 from campaigns c
      where c.id = scenes.campaign_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from campaigns c
      where c.id = scenes.campaign_id
        and c.user_id = auth.uid()
    )
  );

create policy "scene_links_owner_all" on scene_links
  for all
  to authenticated
  using (
    exists (
      select 1 from campaigns c
      where c.id = scene_links.campaign_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from campaigns c
      where c.id = scene_links.campaign_id
        and c.user_id = auth.uid()
    )
  );

-- mentions: all operations only where the referenced entity belongs to
-- the caller.
create policy "mentions_owner_all" on mentions
  for all
  to authenticated
  using (
    exists (
      select 1 from entities e
      where e.id = mentions.entity_id
        and e.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from entities e
      where e.id = mentions.entity_id
        and e.user_id = auth.uid()
    )
  );

-- srd_entries, adventure_directory: read-only for authenticated users.
-- No insert/update/delete policies; writes happen via service role only.
create policy "srd_entries_select_authenticated" on srd_entries
  for select
  to authenticated
  using (true);

create policy "adventure_directory_select_authenticated" on adventure_directory
  for select
  to authenticated
  using (true);
