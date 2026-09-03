import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getR2Client, getR2BucketName, getR2PublicUrl } from './_lib/r2.js'
import { requireAdmin } from './_lib/requireAdmin.js'

// Called from src/pages/admin/Gallery.jsx before each upload. Returns a
// short-lived presigned PUT URL so the (already-compressed, in-browser)
// image bytes go straight from the browser to R2 — never through this
// function or any other server — same "don't proxy the file" reasoning
// admin uploads used with Supabase Storage's RLS-gated direct upload
// before this migration, just re-implemented for R2 since R2 credentials
// can't be shipped to the browser the way Supabase's RLS-gated anon key
// could.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const adminId = await requireAdmin(req)
  if (!adminId) {
    res.status(401).json({ error: 'Admin session required' })
    return
  }

  const { category, filename, contentType } = req.body ?? {}
  if (!category || !filename || !contentType) {
    res.status(400).json({ error: 'category, filename, and contentType are required' })
    return
  }
  if (!contentType.startsWith('image/')) {
    res.status(400).json({ error: 'Only image uploads are allowed' })
    return
  }

  try {
    const ext = filename.includes('.') ? filename.slice(filename.lastIndexOf('.')) : ''
    const slug = String(category).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'others'
    const key = `${slug}/${crypto.randomUUID()}${ext}`

    const command = new PutObjectCommand({
      Bucket: getR2BucketName(),
      Key: key,
      ContentType: contentType,
    })
    const uploadUrl = await getSignedUrl(getR2Client(), command, { expiresIn: 300 })

    res.status(200).json({ key, uploadUrl, publicUrl: getR2PublicUrl(key) })
  } catch (err) {
    console.error('[gallery-presign-upload] error:', err)
    res.status(500).json({ error: err.message })
  }
}
