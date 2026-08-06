-- Photo Gallery — admin-uploaded event photos shown on the public /gallery
-- page, organized into fixed categories (albums).
--
-- Storage: the `gallery` bucket is public so photo URLs can be embedded
-- directly (no signed URLs, no extra round trip) — but the *public* flag
-- only affects reads. Writes (upload/delete) still go through
-- storage.objects RLS, gated by the same is_admin() check used everywhere
-- else in this schema.
--
-- Table reads: unlike most tables here, gallery_photos is intentionally
-- public data (that's the whole point of the page), so instead of a direct
-- anon SELECT grant on the table we expose it via a SECURITY DEFINER RPC
-- (get_gallery_photos), matching this codebase's "no direct table grants
-- for anon" convention used by submit_booking_request etc.

insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do nothing;

drop policy if exists "admins upload gallery photos" on storage.objects;
create policy "admins upload gallery photos" on storage.objects
  for insert
  with check (bucket_id = 'gallery' and public.is_admin());

drop policy if exists "admins delete gallery photos" on storage.objects;
create policy "admins delete gallery photos" on storage.objects
  for delete
  using (bucket_id = 'gallery' and public.is_admin());

create table if not exists gallery_photos (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  category text not null default 'Others' check (category in (
    'Wedding',
    'Debut',
    'Kiddie Party',
    'Christening / Binyag',
    'Birthday',
    'Corporate Event',
    'Christmas Party',
    'House Blessing',
    'Buffet / Dining Setup',
    'Others'
  )),
  caption text,
  created_at timestamptz not null default now()
);

create index if not exists idx_gallery_photos_category on gallery_photos (category);
create index if not exists idx_gallery_photos_created_at on gallery_photos (created_at desc);

alter table gallery_photos enable row level security;

drop policy if exists "admins manage gallery_photos" on gallery_photos;
create policy "admins manage gallery_photos" on gallery_photos
  for all using (is_admin()) with check (is_admin());

create or replace function get_gallery_photos()
returns table (id uuid, url text, category text, caption text, created_at timestamptz) as $$
  select gallery_photos.id, gallery_photos.url, gallery_photos.category, gallery_photos.caption, gallery_photos.created_at
  from gallery_photos
  order by created_at desc;
$$ language sql security definer stable set search_path = public;

grant execute on function get_gallery_photos() to anon, authenticated;
