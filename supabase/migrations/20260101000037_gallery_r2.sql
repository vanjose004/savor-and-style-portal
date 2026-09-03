-- Gallery photos move from Supabase Storage to Cloudflare R2 (R2 has no
-- egress fees; Supabase Storage was generating meaningful egress cost on
-- every gallery page view). This migration only touches the gallery_photos
-- table — it does not drop the old `gallery` Storage bucket or its RLS
-- policies (harmless leftovers now that api/gallery-*.js upload/delete
-- against R2 instead), so nothing here is destructive or hard to reverse.
--
-- `storage_key` is the new source of truth for deleting a photo's backing
-- object — the admin UI used to derive it by string-matching Supabase's
-- storage URL shape (`/storage/v1/object/public/gallery/...`), which breaks
-- once `url` points at an R2/CDN domain instead.
--
-- `width`/`height` let the public gallery page reserve layout space for a
-- lazy-loaded image before it downloads, avoiding layout shift.

alter table gallery_photos add column if not exists storage_key text;
alter table gallery_photos add column if not exists width int;
alter table gallery_photos add column if not exists height int;

-- Return type is gaining columns, which `create or replace` can't do —
-- must drop first.
drop function if exists get_gallery_photos();

create function get_gallery_photos()
returns table (
  id uuid,
  url text,
  category text,
  caption text,
  width int,
  height int,
  created_at timestamptz
) as $$
  select gallery_photos.id, gallery_photos.url, gallery_photos.category, gallery_photos.caption,
         gallery_photos.width, gallery_photos.height, gallery_photos.created_at
  from gallery_photos
  order by created_at desc;
$$ language sql security definer stable set search_path = public;

grant execute on function get_gallery_photos() to anon, authenticated;
