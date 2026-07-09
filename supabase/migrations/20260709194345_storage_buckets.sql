-- Private buckets. No public access, no storage.objects policies: all
-- access goes through server-issued signed URLs (service role), which
-- bypass RLS, so authenticated users get no direct read/write policy.
insert into storage.buckets (id, name, public)
values ('entity-images', 'entity-images', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('scene-maps', 'scene-maps', false)
on conflict (id) do nothing;
