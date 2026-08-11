import { VideoPlayer } from './video-player'

export default async function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <VideoPlayer id={id} />
}
