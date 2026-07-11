create trigger set_updated_at before update on scene_entities
  for each row execute function set_updated_at();

alter table scene_entities enable row level security;

-- scene_entities carries no campaign_id of its own; ownership is
-- enforced through the parent scene's campaign, a two-hop join, unlike
-- scene_links which carries campaign_id directly.
create policy "scene_entities_owner_all" on scene_entities
  for all
  to authenticated
  using (
    exists (
      select 1 from scenes s
      join campaigns c on c.id = s.campaign_id
      where s.id = scene_entities.scene_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from scenes s
      join campaigns c on c.id = s.campaign_id
      where s.id = scene_entities.scene_id
        and c.user_id = auth.uid()
    )
  );
