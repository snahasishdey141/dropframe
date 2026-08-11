import { GetObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { NextRequest, NextResponse } from 'next/server'
import { assertR2Config, r2, r2Bucket } from '@/lib/r2'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const requestedKey = request.nextUrl.searchParams.get('pathname')
  const expiresAt = request.nextUrl.searchParams.get('expiresAt')
  if (expiresAt && Number(expiresAt) < Date.now()) return new NextResponse('This link has expired.', { status: 410 })

  try {
    assertR2Config()
    let key = requestedKey
    if (!key) {
      const listed = await r2.send(new ListObjectsV2Command({ Bucket: r2Bucket, Prefix: `dropframe/${id}/`, MaxKeys: 2 }))
      key = listed.Contents?.[0]?.Key ?? null
    }
    if (!key || !key.startsWith(`dropframe/${id}/`)) return new NextResponse('Video not found.', { status: 404 })

    const head = await r2.send(new HeadObjectCommand({ Bucket: r2Bucket, Key: key }))
    const storedExpiry = head.Metadata?.expiresat ? Number(head.Metadata.expiresat) : null
    if (storedExpiry && storedExpiry <= Date.now()) return new NextResponse('This video has expired.', { status: 410 })

    const range = request.headers.get('range')
    const size = Number(head.ContentLength ?? 0)
    const rangeMatch = range?.match(/bytes=(\d+)-(\d*)/)
    const start = rangeMatch ? Number(rangeMatch[1]) : 0
    const end = rangeMatch?.[2] ? Math.min(Number(rangeMatch[2]), size - 1) : size - 1
    if (start >= size || end < start) return new NextResponse('Invalid range.', { status: 416, headers: { 'Content-Range': `bytes */${size}` } })

    const object = await r2.send(new GetObjectCommand({ Bucket: r2Bucket, Key: key, ...(rangeMatch ? { Range: `bytes=${start}-${end}` } : {}) }))
    if (!object.Body) return new NextResponse('Video not found.', { status: 404 })
    const filename = key.split('/').pop() || 'video.mp4'
    const headers = new Headers({
      'Content-Type': head.ContentType || 'video/mp4',
      'Accept-Ranges': 'bytes',
      'Content-Disposition': `${request.nextUrl.searchParams.get('download') === '1' ? 'attachment' : 'inline'}; filename="${filename.replace(/"/g, '')}"`,
      'Cache-Control': 'private, max-age=3600',
    })
    if (rangeMatch) {
      headers.set('Content-Length', String(end - start + 1))
      headers.set('Content-Range', `bytes ${start}-${end}/${size}`)
      return new NextResponse(object.Body.transformToWebStream(), { status: 206, headers })
    }
    headers.set('Content-Length', String(size))
    return new NextResponse(object.Body.transformToWebStream(), { headers })
  } catch (error) {
    console.error('[v0] R2 video delivery error:', error)
    return new NextResponse('Video not found or expired.', { status: 404 })
  }
}
