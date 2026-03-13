import { Suspense } from 'react'
import RecordingClient from './recording-client'

// CRITICAL: This is a SERVER component.
// The inline <script> emits START_RECORDING as part of the server-rendered HTML,
// executing before any JS bundle loads or React hydrates.
// This guarantees the LiveKit egress headless Chrome receives the signal
// even if the React client bundle is slow to hydrate or fails entirely.
export default async function RecordingPage({
    params
}: {
    params: Promise<{ roomName: string }>
}) {
    const { roomName } = await params

    return (
        <>
            <script
                dangerouslySetInnerHTML={{
                    __html: `console.log('START_RECORDING');`,
                }}
            />
            <div style={{ width: '100vw', height: '100vh', backgroundColor: '#111827', overflow: 'hidden' }}>
                <Suspense fallback={
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>
                        Cargando grabación...
                    </div>
                }>
                    <RecordingClient roomName={roomName} />
                </Suspense>
            </div>
        </>
    )
}
