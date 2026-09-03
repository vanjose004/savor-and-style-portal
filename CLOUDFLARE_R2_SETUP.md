# Cloudflare R2 Setup — Gallery Photo Storage

Gallery photos (the public `/gallery` page) now live in Cloudflare R2
instead of Supabase Storage. R2 has **no egress fee**, unlike Supabase
Storage, which was charging for every byte served to every gallery page
visitor. This doc walks through creating the bucket and wiring it up.

Code changes that go with this (already done, for reference):
- `api/gallery-presign-upload.js` / `api/gallery-delete.js` — admin-only
  Vercel functions that hand the browser a short-lived presigned URL so
  uploads/deletes go straight to R2, never through our server.
- `api/_lib/r2.js` — shared R2 client.
- `src/pages/admin/Gallery.jsx` — compresses each photo in-browser
  (`browser-image-compression`, capped at 2000px / ~1.5MB) before uploading.
- `supabase/migrations/20260101000037_gallery_r2.sql` — adds `storage_key`,
  `width`, `height` columns to `gallery_photos`.
- `scripts/migrate-gallery-to-r2.mjs` — one-off script to copy existing
  Supabase-hosted photos over to R2.

---

## 1. Create the R2 bucket

1. Cloudflare dashboard → **R2 Object Storage** (left sidebar). If this is
   your first time here, R2 asks you to enable it for the account — it's
   pay-as-you-go for storage but **egress is free**, no credit card minimum
   beyond that.
2. **Create bucket** → name it something like `savor-and-style-gallery`.
   Location: Automatic is fine.
3. Open the new bucket → **Settings** tab.

## 2. Enable public access

Under **Settings → Public access**:

- Turn on **"Allow Access"** under **R2.dev subdomain**. This gives you an
  instant public URL like `https://pub-xxxxxxxxxxxxxxxx.r2.dev` — no DNS
  setup required. Copy this URL; it's your `R2_PUBLIC_URL`.

  (Optional, later: you can instead connect a custom domain — e.g.
  `gallery-cdn.savorandstylecatering.com` — under **Custom Domains** on the
  same page, if that subdomain's DNS is managed through Cloudflare. Not
  required for this to work; the r2.dev URL is fine to ship with and you
  can switch `R2_PUBLIC_URL` later without touching any code.)

## 3. Configure CORS

Photos upload **directly from the admin's browser** to R2 (via a presigned
URL), so the bucket needs to allow cross-origin `PUT` requests from your
site. Still on the bucket's **Settings** tab, scroll to **CORS Policy** →
**Add CORS policy** → paste:

```json
[
  {
    "AllowedOrigins": [
      "https://www.savorandstylecatering.com",
      "https://savorandstylecatering.com",
      "https://*.vercel.app",
      "http://localhost:5173"
    ],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

(`*.vercel.app` covers Vercel preview deployments; `localhost:5173` covers
local dev. Trim whichever you don't need.)

## 4. Create an API token (credentials for the app)

1. R2 home page (not inside a specific bucket) → **Manage R2 API Tokens** →
   **Create API Token**.
2. Name it e.g. `savor-and-style-gallery-app`.
3. Permissions: **Object Read & Write**.
4. Specify bucket: restrict it to the `savor-and-style-gallery` bucket you
   just created (don't grant account-wide access).
5. TTL: no expiry (or set one and rotate later — your call).
6. Create it. You'll be shown, **once**:
   - **Access Key ID**
   - **Secret Access Key**
   - Your **Account ID** (also visible in the R2 dashboard's right sidebar,
     or in the API token's "S3 endpoint" — it's the subdomain before
     `.r2.cloudflarestorage.com`)

   Copy all three now — the secret key is not shown again (you'd have to
   create a new token if you lose it).

## 5. Set environment variables

**In Vercel** (Project → Settings → Environment Variables), add for
Production **and** Preview:

| Name | Value |
|---|---|
| `R2_ACCOUNT_ID` | from step 4 |
| `R2_ACCESS_KEY_ID` | from step 4 |
| `R2_SECRET_ACCESS_KEY` | from step 4 |
| `R2_BUCKET_NAME` | `savor-and-style-gallery` (or whatever you named it) |
| `R2_PUBLIC_URL` | the `https://pub-....r2.dev` URL from step 2 |

Also confirm these two already exist (they power the new admin-auth check
in `api/gallery-*.js`, and may not have been set before now — see
`.env.example`):

| Name | Value |
|---|---|
| `SUPABASE_URL` | Supabase dashboard → Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | same page → `service_role` secret key |

Redeploy after adding these (Vercel only picks up new env vars on the next
deploy).

## 6. Apply the database migration

```bash
supabase db push
```

This adds `storage_key`, `width`, and `height` to `gallery_photos` and
updates the `get_gallery_photos()` RPC to return them. Purely additive —
safe to run against the live project, nothing existing is touched.

## 7. Migrate existing photos from Supabase Storage to R2

Any photos already uploaded before this change are still sitting in the
Supabase `gallery` Storage bucket. Copy them over:

```bash
npm install   # picks up the new @aws-sdk/*, browser-image-compression, sharp deps

# Create a local-only file (never commit this) with the migration's secrets:
cat > .env.migration << 'EOF'
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
R2_PUBLIC_URL=...
EOF

node --env-file=.env.migration scripts/migrate-gallery-to-r2.mjs
```

This downloads each photo, resizes/compresses it the same way new uploads
are (max 2000px, JPEG quality 82), uploads it to R2, and updates the row's
`url`/`storage_key`/`width`/`height`. **It leaves the Supabase-hosted
originals in place** by default — nothing is deleted. Re-running the script
is safe; already-migrated rows (ones with a `storage_key`) are skipped.

Once you've confirmed the public `/gallery` page looks right (photos
loading from your `r2.dev` or custom domain, not `supabase.co`), you can
either:
- Re-run with `MIGRATION_DELETE_SOURCE=true node --env-file=.env.migration scripts/migrate-gallery-to-r2.mjs` to also delete the Supabase originals, or
- Just leave them — Supabase Storage bills for storage, not egress, so idle
  files there aren't the cost driver this migration was about. Delete the
  `gallery` bucket manually from the Supabase dashboard whenever you're
  ready, or leave it as a backup indefinitely.

## 8. Deploy and verify

1. Push/deploy the code changes (env vars must already be set in Vercel —
   step 5).
2. In the admin portal, upload a test photo to the gallery.
3. Check the Cloudflare dashboard → your bucket → confirm the object
   appears there.
4. Open `/gallery` on the live site and confirm the photo loads (its `src`
   should now point at your `r2.dev`/custom domain, not `supabase.co`).
5. Delete the test photo from the admin portal and confirm it disappears
   from both the page and the R2 bucket.

---

### Rollback

Nothing about this change is destructive to what already existed: the old
`gallery` Storage bucket, its RLS policies, and any un-migrated photos are
left alone in Supabase. If something's wrong with R2, you can revert the
code changes and the site goes back to serving straight from Supabase
Storage exactly as before.
