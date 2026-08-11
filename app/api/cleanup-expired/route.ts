import { DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { NextRequest, NextResponse } from 'next/server'
import { assertR2Config, r2, r2Bucket } from '@/lib/r2'

export async function GET(request: NextRequest) {
  const authorization = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authorization !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    assertR2Config()
    let continuationToken: string | undefined
    let deleted = 0
    do {
      const listed = await r2.send(new ListObjectsV2Command({ Bucket: r2Bucket, Prefix: 'dropframe/', ContinuationToken: continuationToken }))
      for (const item of listed.Contents ?? []) {
        if (!item.Key) continue
        try {
          const head = await r2.send(new HeadObjectCommand({ Bucket: r2Bucket, Key: item.Key }))
          const expiresAt = head.Metadata?.expiresat ? Number(head.Metadata.expiresat) : null
          if (expiresAt && Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
            await r2.send(new DeleteObjectCommand({ Bucket: r2Bucket, Key: item.Key }))
            deleted += 1
          }
        } catch (error) {
          console.error('[v0] Failed to inspect expired object:', item.Key, error)
        }
      }
      continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined
    } while (continuationToken)
    return NextResponse.json({ deleted })
  } catch (error) {
    console.error('[v0] Expiry cleanup error:', error)
    return NextResponse.json({ error: 'Expiry cleanup failed.' }, { status: 500 })
  }
}
