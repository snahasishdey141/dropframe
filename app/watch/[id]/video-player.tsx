'use client'

import { Download } from 'lucide-react'

export function VideoPlayer({ id }: { id: string }) {
  const videoUrl = `/api/video/${id}`
  return <main className="flex min-h-screen items-center justify-center bg-[#0d1117] px-5 py-10 text-white"><div className="w-full max-w-4xl"><div className="mb-6 flex items-center gap-3"><img src="/dropframe-mark.svg" alt="Dropframe" className="size-9 rounded-xl" /><span className="font-mono text-sm font-bold tracking-tight">DROPFRAME</span></div><div className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl"><video className="aspect-video w-full" controls preload="metadata" src={videoUrl} onError={(event) => { event.currentTarget.style.display = 'none'; event.currentTarget.parentElement?.insertAdjacentHTML('beforeend', '<div class="flex aspect-video flex-col items-center justify-center gap-4 text-center text-white/50"><svg class="size-8" aria-hidden="true"></svg><p class="text-sm">This video is unavailable or expired.</p></div>') }} /></div><div className="mt-5 flex items-center justify-between"><div><h1 className="font-medium">Shared video</h1><p className="mt-1 text-sm text-white/45">Watch in your browser · Downloads enabled</p></div><a className="inline-flex items-center gap-2 rounded-xl bg-[#b8f36b] px-4 py-2.5 text-sm font-semibold text-[#0d1117]" href={`${videoUrl}?download=1`}><Download className="size-4" /> Download</a></div></div></main>
}
