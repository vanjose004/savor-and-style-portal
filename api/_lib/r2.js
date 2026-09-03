import { S3Client } from '@aws-sdk/client-s3'

// Cloudflare R2 is S3-compatible — same SDK as AWS S3, pointed at R2's
// account-scoped endpoint instead. Credentials are server-only Vercel env
// vars (no VITE_ prefix), same pattern as SUPABASE_SERVICE_ROLE_KEY in
// supabaseAdmin.js. See CLOUDFLARE_R2_SETUP.md for how to obtain these.
let client

export function getR2Client() {
  if (!client) {
    const accountId = process.env.R2_ACCOUNT_ID
    const accessKeyId = process.env.R2_ACCESS_KEY_ID
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error('R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY are not configured')
    }
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    })
  }
  return client
}

export function getR2BucketName() {
  const bucket = process.env.R2_BUCKET_NAME
  if (!bucket) throw new Error('R2_BUCKET_NAME is not configured')
  return bucket
}

/** Public URL for an object key — R2_PUBLIC_URL is either a custom domain or the bucket's r2.dev URL, no trailing slash. */
export function getR2PublicUrl(key) {
  const base = process.env.R2_PUBLIC_URL
  if (!base) throw new Error('R2_PUBLIC_URL is not configured')
  return `${base.replace(/\/+$/, '')}/${key}`
}
