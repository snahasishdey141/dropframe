import { handleUpload } from '@vercel/blob/client'
import { NextResponse, type NextRequest } from 'next/server'
import { randomUUID } from 'node:crypto'

const expiryMs: Record<string, number | null> = {
  permanent: null,
  '3d': 3 * 86400000,
  '1w': 7 * 86400000,
  '1m': 30 * 86400000,
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const type = body?.type
    const payload = body?.payload

    if (type !== 'blob.generate-client-token' || !payload) {
      return NextResponse.json({ error: 'Invalid upload request.' }, { status: 400 })
    }

    const fileType = String(payload.contentType || '')
    const clientPayload = payload.clientPayload ? JSON.parse(String(payload.clientPayload)) : {}
    const expiry = String(clientPayload.expiry || '3d')
    const id = String(clientPayload.id || randomUUID())

    if (!fileType.startsWith('video/')) {
      return NextResponse.json({ error: 'A video file is required.' }, { status: 400 })
    }
    if (!(expiry in expiryMs)) {
      return NextResponse.json({ error: 'Invalid expiry option.' }, { status: 400 })
    }

    const token = await handleUpload({
      body: { type, payload },
      request,
      onBeforeGenerateToken: async (pathname) => ({
        allowedContentTypes: ['video/*'],
        access: 'private',
        addRandomSuffix: false,
        tokenPayload: JSON.stringify({ id, expiry, pathname }),
      }),
      onUploadCompleted: async () => {},
    })

    return NextResponse.json(token)
  } catch (error) {
    console.error('[v0] Direct upload authorization error:', error)
    return NextResponse.json({ error: 'Could not prepare the upload. Check Blob configuration.' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  return POST(request)
}
