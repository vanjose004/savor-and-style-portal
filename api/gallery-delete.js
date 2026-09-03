import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getR2Client, getR2BucketName } from './_lib/r2.js'
import { requireAdmin } from './_lib/requireAdmin.js'

// Called from src/pages/admin/Gallery.jsx when an admin deletes a photo.
// Deletes the R2 object by its stored `storage_key` — the gallery_photos
// row itself is deleted separately, directly from the browser (RLS-gated,
// same as before), since that part never needed R2 credentials.
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

  const { key } = req.body ?? {}
  if (!key) {
    res.status(400).json({ error: 'key is required' })
    return
  }

  try {
    await getR2Client().send(new DeleteObjectCommand({ Bucket: getR2BucketName(), Key: key }))
    res.status(200).json({ deleted: true })
  } catch (err) {
    console.error('[gallery-delete] error:', err)
    res.status(500).json({ error: err.message })
  }
}
