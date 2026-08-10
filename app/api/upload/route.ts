import { put } from '@vercel/blob'
import { NextResponse, type NextRequest } from 'next/server'
import { randomUUID } from 'node:crypto'

const expiryMs: Record<string, number | null> = { permanent: null, '3d': 3 * 86400000, '1w': 7 * 86400000, '1m': 30 * 86400000 }

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const expiry = String(formData.get('expiry') || '3d')
    if (!(file instanceof File) || !file.type.startsWith('video/')) return NextResponse.json({ error: 'A video file is required.' }, { status: 400 })
    if (!(expiry in expiryMs)) return NextResponse.json({ error: 'Invalid expiry option.' }, { status: 400 })
    const id = randomUUID()
    const expiresAt = expiryMs[expiry] ? Date.now() + expiryMs[expiry]! : null
    const pathname = `dropframe/${id}/${encodeURIComponent(file.name)}`
    await put(pathname, file, { access: 'private', addRandomSuffix: false, contentType: file.type })
    return NextResponse.json({ id, pathname, expiresAt })
  } catch (error) {
    console.error('[v0] Upload error:', error)
    return NextResponse.json({ error: 'Upload failed. Check Blob storage configuration.' }, { status: 500 })
  }
}
