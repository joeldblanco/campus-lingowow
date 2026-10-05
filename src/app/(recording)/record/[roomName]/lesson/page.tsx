import RecordingLessonClient from './recording-lesson-client'

export default async function RecordingLessonPage({
  params,
}: {
  params: Promise<{ roomName: string }>
}) {
  const { roomName } = await params

  return <RecordingLessonClient roomName={roomName} />
}

