import { VideoPlayer } from './video-player'

export default async function WatchPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pathname?: string; expiresAt?: string }> }) {
  const { id } = await params
  const { pathname, expiresAt } = await searchParams
  const expired = Boolean(expiresAt && Number(expiresAt) < Date.now())
  return <VideoPlayer id={id} pathname={expired ? '' : pathname ?? ''} expired={expired} />
}
