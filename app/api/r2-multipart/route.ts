import { AbortMultipartUploadCommand, CompleteMultipartUploadCommand, CreateMultipartUploadCommand, UploadPartCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { NextRequest, NextResponse } from 'next/server'
import { assertR2Config, r2, r2Bucket } from '@/lib/r2'

export async function POST(request: NextRequest) {
  try {
    assertR2Config()
    const body = await request.json()
    const action = body.action as string
    const key = String(body.key || '')
    if (!key.startsWith('dropframe/') || !key.includes('/')) return NextResponse.json({ error: 'Invalid object key.' }, { status: 400 })

    if (action === 'create') {
      const expiresAt = body.expiresAt === null ? null : Number(body.expiresAt)
      if (expiresAt !== null && (!Number.isFinite(expiresAt) || expiresAt <= Date.now())) return NextResponse.json({ error: 'Invalid expiry time.' }, { status: 400 })
      const result = await r2.send(new CreateMultipartUploadCommand({ Bucket: r2Bucket, Key: key, ContentType: body.contentType || 'video/mp4', Metadata: expiresAt === null ? { permanent: 'true' } : { expiresat: String(expiresAt) } }))
      return NextResponse.json({ uploadId: result.UploadId })
    }

    if (action === 'sign') {
      const partNumber = Number(body.partNumber)
      if (!body.uploadId || !Number.isInteger(partNumber) || partNumber < 1) return NextResponse.json({ error: 'Invalid part.' }, { status: 400 })
      const url = await getSignedUrl(r2, new UploadPartCommand({ Bucket: r2Bucket, Key: key, UploadId: body.uploadId, PartNumber: partNumber }), { expiresIn: 3600 })
      return NextResponse.json({ url })
    }

    if (action === 'complete') {
      const parts = Array.isArray(body.parts) ? body.parts.map((part: { ETag: string; PartNumber: number }) => ({ ETag: part.ETag, PartNumber: part.PartNumber })) : []
      await r2.send(new CompleteMultipartUploadCommand({ Bucket: r2Bucket, Key: key, UploadId: body.uploadId, MultipartUpload: { Parts: parts } }))
      return NextResponse.json({ key })
    }

    if (action === 'abort') {
      await r2.send(new AbortMultipartUploadCommand({ Bucket: r2Bucket, Key: key, UploadId: body.uploadId }))
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Invalid multipart action.' }, { status: 400 })
  } catch (error) {
    console.error('[v0] R2 multipart error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'R2 upload failed.' }, { status: 500 })
  }
}
