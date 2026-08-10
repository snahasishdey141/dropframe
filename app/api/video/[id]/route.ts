import { get } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const pathname = request.nextUrl.searchParams.get('pathname')
  const expiresAt = request.nextUrl.searchParams.get('expiresAt')
  if (expiresAt && Number(expiresAt) < Date.now()) return new NextResponse('This link has expired.', { status: 410 })
  if (!pathname || !pathname.startsWith(`dropframe/${id}/`)) return NextResponse.json({ error: 'Invalid video.' }, { status: 400 })
  try {
    const result = await get(pathname, { access: 'private', ifNoneMatch: request.headers.get('if-none-match') ?? undefined })
    if (!result) return new NextResponse('Video not found or expired.', { status: 404 })
    if (result.statusCode === 304) return new NextResponse(null, { status: 304, headers: { ETag: result.blob.etag, 'Cache-Control': 'private, no-cache' } })
    return new NextResponse(result.stream, { headers: { 'Content-Type': result.blob.contentType || 'video/mp4', ETag: result.blob.etag, 'Content-Disposition': request.nextUrl.searchParams.get('download') === '1' ? 'attachment' : 'inline', 'Cache-Control': 'private, no-cache' } })
  } catch { return new NextResponse('Video not found or expired.', { status: 404 }) }
}
