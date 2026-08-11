import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ error: 'R2 uploads use the multipart upload endpoint.' }, { status: 410 })
}
