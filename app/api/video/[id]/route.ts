import { GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { NextRequest, NextResponse } from 'next/server'
import { assertR2Config, r2, r2Bucket } from '@/lib/r2'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const key = request.nextUrl.searchParams.get('pathname')
  const expiresAt = request.nextUrl.searchParams.get('expiresAt')
  if (expiresAt && Number(expiresAt) < Date.now()) return new NextResponse('This link has expired.', { status: 410 })
  if (!key || !key.startsWith(`dropframe/${id}/`)) return NextResponse.json({ error: 'Invalid video.' }, { status: 400 })
  try {
    assertR2Config()
    const head = await r2.send(new HeadObjectCommand({ Bucket: r2Bucket, Key: key }))
    const storedExpiry = head.Metadata?.expiresat ? Number(head.Metadata.expiresat) : null
    if (storedExpiry && storedExpiry <= Date.now()) return new NextResponse('This video has expired.', { status: 410 })
    const object = await r2.send(new GetObjectCommand({ Bucket: r2Bucket, Key: key }))
    if (!object.Body) return new NextResponse('Video not found.', { status: 404 })
    return new NextResponse(object.Body.transformToWebStream(), { headers: { 'Content-Type': head.ContentType || 'video/mp4', 'Content-Length': String(head.ContentLength || ''), 'Content-Disposition': request.nextUrl.searchParams.get('download') === '1' ? `attachment; filename="${key.split('/').pop()}"` : 'inline', 'Cache-Control': 'private, max-age=3600' } })
  } catch (error) {
    console.error('[v0] R2 video delivery error:', error)
    return new NextResponse('Video not found or expired.', { status: 404 })
  }
}
