'use client'

import { useRef, useState, type ReactNode } from 'react'
import { Upload, Link2, Clock3, ShieldCheck, Copy, Check, Play, Download, ArrowUpRight, Sparkles } from 'lucide-react'

const expiryOptions = [
  { value: 'permanent', label: 'Permanent', detail: 'Never expires' },
  { value: '3d', label: '3 days', detail: 'Auto-delete after 3 days' },
  { value: '1w', label: '1 week', detail: 'Auto-delete after 7 days' },
  { value: '1m', label: '1 month', detail: 'Auto-delete after 30 days' },
]

export default function Page() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [expiry, setExpiry] = useState('3d')
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState('')
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  function acceptFile(next: File | undefined) {
    if (!next) return
    setError('')
    if (!next.type.startsWith('video/')) return setError('Please choose a video file.')
    setFile(next)
    setShareUrl('')
  }

  async function upload() {
    if (!file) return
    setUploading(true)
    setUploadProgress(0)
    setUploadStatus('Preparing your video…')
    setError('')
    try {
      const id = crypto.randomUUID()
      const pathname = `dropframe/${id}/${file.name}`
      const expiresAt = expiry === 'permanent' ? null : Date.now() + ({ '3d': 3, '1w': 7, '1m': 30 }[expiry] ?? 3) * 86400000
      const api = async (body: object) => { const response = await fetch('/api/r2-multipart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'R2 request failed'); return data }
      const { uploadId } = await api({ action: 'create', key: pathname, contentType: file.type, expiresAt })
      const chunkSize = 50 * 1024 * 1024
      const parts: { ETag: string; PartNumber: number }[] = []
      try {
        for (let offset = 0, partNumber = 1; offset < file.size; offset += chunkSize, partNumber++) {
          const chunk = file.slice(offset, Math.min(offset + chunkSize, file.size))
          setUploadStatus('Uploading your video…')
          const { url } = await api({ action: 'sign', key: pathname, uploadId, partNumber })
          let response: Response
          try {
            response = await fetch(url, { method: 'PUT', body: chunk })
          } catch {
            throw new Error(`Part ${partNumber} could not reach R2. Check the bucket CORS policy and try again.`)
          }
          if (!response.ok) throw new Error(`Part ${partNumber} failed to upload (HTTP ${response.status}).`)
          const etag = response.headers.get('etag')
          if (!etag) throw new Error(`Part ${partNumber} returned no verification tag.`)
          parts.push({ ETag: etag, PartNumber: partNumber })
          const percent = Math.round((Math.min(offset + chunk.size, file.size) / file.size) * 100)
          setUploadProgress(percent)
          setUploadStatus(percent >= 100 ? 'Finishing your video…' : 'Uploading your video…')
        }
        await api({ action: 'complete', key: pathname, uploadId, parts })
      } catch (uploadError) {
        await api({ action: 'abort', key: pathname, uploadId }).catch(() => undefined)
        throw uploadError
      }
      setUploadProgress(100)
      setUploadStatus('Upload complete — your link is ready.')
      setShareUrl(`${window.location.origin}/watch/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
      setUploadStatus('Upload stopped')
    } finally { setUploading(false) }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true); setTimeout(() => setCopied(false), 1800)
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 md:px-8">
        <div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Play className="size-4 fill-current" /></div><span className="font-mono text-sm font-bold tracking-tight">DROPFRAME</span></div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="hidden items-center gap-2 sm:flex"><ShieldCheck className="size-4 text-accent" /> Private by default</span><button className="rounded-full border border-border px-4 py-2 font-medium text-foreground transition hover:bg-muted">My uploads</button></div>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-14 pt-10 md:px-8 md:pt-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_0.88fr] lg:items-center">
          <div><div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground"><Sparkles className="size-3.5 text-accent" /> Share without the baggage</div><h1 className="max-w-xl text-balance text-5xl font-semibold tracking-[-0.055em] text-foreground sm:text-6xl lg:text-7xl">Send videos.<br /><span className="text-muted-foreground">Keep it simple.</span></h1><p className="mt-6 max-w-md text-pretty text-base leading-7 text-muted-foreground">Upload a video, choose when it disappears, and share one clean link. No account, no compression, no file-size limit from Dropframe.</p></div>
          <div className="rounded-[1.75rem] border border-border bg-card p-2 shadow-[0_24px_80px_-30px_rgba(15,23,42,0.25)]">
            <div onClick={() => inputRef.current?.click()} onDragOver={(e) => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); acceptFile(e.dataTransfer.files[0]) }} className={`flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 text-center transition ${dragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/40 hover:border-primary/50 hover:bg-muted/70'}`}>
              <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={(e) => acceptFile(e.target.files?.[0])} />
              <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-foreground text-background"><Upload className="size-5" /></div>
              <p className="max-w-full truncate font-medium">{file ? file.name : 'Drop a video here'}</p><p className="mt-2 text-sm text-muted-foreground">{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB · Ready to upload` : 'or click to browse your files'}</p>
              {uploading && <div className="mt-5 w-full max-w-sm" aria-live="polite"><div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground"><span>{uploadStatus}</span><span>{uploadProgress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out" style={{ width: `${uploadProgress}%` }} /></div><p className="mt-2 text-xs text-muted-foreground">Large videos upload securely in the background. Keep this tab open.</p></div>}
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-end"><label className="grid gap-2 text-xs font-medium text-muted-foreground">LINK EXPIRY<select value={expiry} onChange={(e) => setExpiry(e.target.value)} className="h-11 rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-ring">{expiryOptions.map((option) => <option key={option.value} value={option.value}>{option.label} · {option.detail}</option>)}</select></label><button disabled={!file || uploading} onClick={upload} className="h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">{uploading ? (uploadProgress ? `${uploadProgress}% uploaded` : 'Preparing upload…') : 'Create share link'} <ArrowUpRight className="ml-1 inline size-4" /></button></div>
            {error && <p className="px-4 pb-4 text-sm text-destructive">{error}</p>}
          </div>
        </div>
      </section>

      {shareUrl && <section className="mx-auto max-w-6xl px-5 pb-14 md:px-8"><div className="flex flex-col gap-4 rounded-2xl border border-accent/30 bg-accent/5 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">Your video is ready to share</p><p className="mt-1 max-w-xl truncate font-mono text-xs text-muted-foreground">{shareUrl}</p></div><button onClick={copyLink} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground">{copied ? <Check className="size-4" /> : <Copy className="size-4" />}{copied ? 'Copied' : 'Copy link'}</button></div></section>}

      <section className="border-t border-border"><div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-3 md:px-8"><Feature icon={<Clock3 />} title="Set it and forget it" text="Pick an expiry window and the link takes care of the rest." /><Feature icon={<Link2 />} title="One clean link" text="Anyone with the link can watch instantly in their browser." /><Feature icon={<Download />} title="Download when needed" text="Keep downloads available for the people you trust." /></div></section>
      <footer className="mx-auto flex max-w-6xl justify-between px-5 py-7 text-xs text-muted-foreground md:px-8"><span>DROPFRAME / 2026</span><span>Made for sharing, not storing.</span></footer>
    </main>
  )
}

function Feature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) { return <div className="grid gap-3"><div className="text-accent [&>svg]:size-5">{icon}</div><h2 className="font-medium">{title}</h2><p className="max-w-xs text-sm leading-6 text-muted-foreground">{text}</p></div> }

