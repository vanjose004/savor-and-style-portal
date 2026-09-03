// One-off migration: copies every gallery_photos row still hosted on
// Supabase Storage over to Cloudflare R2 — downloading the original,
// compressing/resizing it (same target as the browser-side compression new
// uploads get, so old and new photos end up equally sized), uploading the
// result to R2, and updating the row's `url`/`storage_key`/`width`/`height`
// to point at R2 instead.
//
// Safe to re-run: any row that already has `storage_key` set (i.e. already
// migrated) is skipped.
//
// Usage:
//   node --env-file=.env.migration scripts/migrate-gallery-to-r2.mjs
//
// .env.migration needs (see CLOUDFLARE_R2_SETUP.md):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   — from your Supabase project settings
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL
//
// Add MIGRATION_DELETE_SOURCE=true to also delete each original from
// Supabase Storage once it's confirmed copied — omitted (or any other
// value) leaves the Supabase bucket untouched, so you can double-check the
// public gallery page against R2 before cleaning up the old bucket.

import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getR2Client, getR2BucketName, getR2PublicUrl } from '../api/_lib/r2.js'

const STORAGE_PUBLIC_MARKER = '/storage/v1/object/public/gallery/'
const DELETE_SOURCE = process.env.MIGRATION_DELETE_SOURCE === 'true'

function requireEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

function storagePathFromUrl(url) {
  const idx = url.indexOf(STORAGE_PUBLIC_MARKER)
  if (idx === -1) return null
  return decodeURIComponent(url.slice(idx + STORAGE_PUBLIC_MARKER.length))
}

function buildR2Key(category) {
  const slug = String(category || 'others')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'others'
  return `${slug}/${crypto.randomUUID()}.jpg`
}

async function main() {
  const supabaseUrl = requireEnv('SUPABASE_URL')
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  requireEnv('R2_ACCOUNT_ID')
  requireEnv('R2_ACCESS_KEY_ID')
  requireEnv('R2_SECRET_ACCESS_KEY')
  requireEnv('R2_BUCKET_NAME')
  requireEnv('R2_PUBLIC_URL')

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const { data: photos, error } = await supabase
    .from('gallery_photos')
    .select('id, url, category, storage_key')
    .order('created_at', { ascending: true })
  if (error) throw error

  const pending = photos.filter((p) => !p.storage_key)
  console.log(`Found ${photos.length} photos total, ${pending.length} still on Supabase Storage.`)

  let migrated = 0
  let failed = 0

  for (const photo of pending) {
    const sourcePath = storagePathFromUrl(photo.url)
    if (!sourcePath) {
      console.warn(`  [skip] ${photo.id} — url doesn't look like a Supabase Storage URL: ${photo.url}`)
      continue
    }

    try {
      const { data: blob, error: downloadError } = await supabase.storage.from('gallery').download(sourcePath)
      if (downloadError) throw downloadError

      const original = Buffer.from(await blob.arrayBuffer())
      const { data: resized, info } = await sharp(original)
        .rotate() // apply EXIF orientation before resizing so dimensions are correct
        .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toBuffer({ resolveWithObject: true })

      const key = buildR2Key(photo.category)
      await getR2Client().send(
        new PutObjectCommand({ Bucket: getR2BucketName(), Key: key, Body: resized, ContentType: 'image/jpeg' })
      )
      const publicUrl = getR2PublicUrl(key)

      const { error: updateError } = await supabase
        .from('gallery_photos')
        .update({ url: publicUrl, storage_key: key, width: info.width, height: info.height })
        .eq('id', photo.id)
      if (updateError) throw updateError

      if (DELETE_SOURCE) {
        await supabase.storage.from('gallery').remove([sourcePath])
      }

      migrated += 1
      console.log(`  [ok] ${photo.id} — ${original.length}B -> ${resized.length}B (${info.width}x${info.height})`)
    } catch (err) {
      failed += 1
      console.error(`  [FAIL] ${photo.id} —`, err.message)
    }
  }

  console.log(`\nDone. Migrated ${migrated}, failed ${failed}, already-on-R2 ${photos.length - pending.length}.`)
  if (!DELETE_SOURCE && migrated > 0) {
    console.log('Originals were left in Supabase Storage — re-run with MIGRATION_DELETE_SOURCE=true once verified.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
