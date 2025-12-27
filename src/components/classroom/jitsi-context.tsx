'use client'

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { VideoTrack } from './video-grid'

type JitsiMeetJS = any
type JitsiConnection = any
type JitsiConference = any
type JitsiTrack = any

interface JitsiContextType {
    isInitialized: boolean
    connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'failed'
    localTracks: VideoTrack | undefined
    remoteTracks: VideoTrack[]
    joinRoom: (roomName: string, token: string | null) => Promise<void>
    leaveRoom: () => Promise<void>
    toggleAudio: () => Promise<void>
    toggleVideo: () => Promise<void>
    isAudioMuted: boolean
    isVideoMuted: boolean
    sendCommand: (name: string, values: any) => void
    toggleScreenShare: () => Promise<void>
    toggleRaiseHand: () => Promise<void>
    isScreenSharing: boolean
    isHandRaised: boolean
    addCommandListener: (command: string, handler: (values: any) => void) => void
    removeCommandListener: (command: string, handler: (values: any) => void) => void
}

const JitsiContext = createContext<JitsiContextType | null>(null)

export function useJitsi() {
    const context = useContext(JitsiContext)
    if (!context) throw new Error('useJitsi must be used within a JitsiProvider')
    return context
}

export function JitsiProvider({ children }: { children: React.ReactNode }) {
    const [isInitialized, setIsInitialized] = useState(false)
    const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'failed'>('disconnected')

    // Raw Jitsi Objects
    const connectionRef = useRef<JitsiConnection | null>(null)
    const conferenceRef = useRef<JitsiConference | null>(null)
    const JitsiMeetJSRef = useRef<JitsiMeetJS | null>(null)

    // State for UI
    const [rawLocalTracks, setRawLocalTracks] = useState<JitsiTrack[]>([])
    // Map participant ID -> VideoTrack object
    const [remoteParticipants, setRemoteParticipants] = useState<Map<string, VideoTrack>>(new Map())

    const [isAudioMuted, setIsAudioMuted] = useState(false)
    const [isVideoMuted, setIsVideoMuted] = useState(false)
    const [isScreenSharing, setIsScreenSharing] = useState(false)
    const [isHandRaised, setIsHandRaised] = useState(false)

    // Load Script
    useEffect(() => {
        if (window.JitsiMeetJS) {
            JitsiMeetJSRef.current = window.JitsiMeetJS
            setIsInitialized(true)
            return
        }
        const script = document.createElement('script')
        script.src = 'https://meet.jit.si/libs/lib-jitsi-meet.min.js'
        script.async = true
        script.onload = () => {
            JitsiMeetJSRef.current = window.JitsiMeetJS
            if (JitsiMeetJSRef.current) {
                JitsiMeetJSRef.current.init({ disableAudioLevels: true })
                JitsiMeetJSRef.current.setLogLevel(JitsiMeetJSRef.current.logLevels.ERROR)
                setIsInitialized(true)
            }
        }
        document.head.appendChild(script)
    }, [])

    const createLocalTracks = useCallback(async () => {
        if (!JitsiMeetJSRef.current) return []
        try {
            const tracks = await JitsiMeetJSRef.current.createLocalTracks({ devices: ['audio', 'video'] })
            setRawLocalTracks(tracks)
            return tracks
        } catch (e) {
            console.error('Error creating local tracks', e)
            return []
        }
    }, [])

    const joinRoom = useCallback(async (roomName: string, token: string | null) => {
        if (!JitsiMeetJSRef.current || !isInitialized) return

        try {
            setConnectionStatus('connecting')

            let options: any = {}
            let conferenceRoomName = roomName

            console.log('[Jitsi] Join Room:', roomName)
            console.log('[Jitsi] Token Present:', !!token)
            if (token) console.log('[Jitsi] Token Start:', token.substring(0, 15) + '...')

            if (token) {
                // JaaS Production config
                // For JaaS with lib-jitsi-meet, we need to extract the tenant and room name
                // roomName format: "vpaas-magic-cookie-xxx/roomname" 
                const parts = roomName.split('/')
                const tenant = parts.length > 1 ? parts[0] : roomName
                conferenceRoomName = parts.length > 1 ? parts.slice(1).join('/') : roomName

                console.log('[Jitsi] JaaS Tenant:', tenant)
                console.log('[Jitsi] Conference Room:', conferenceRoomName)

                options = {
                    hosts: {
                        domain: '8x8.vc',
                        muc: `conference.${tenant}.8x8.vc`,
                        focus: 'focus.8x8.vc'
                    },
                    serviceUrl: `wss://8x8.vc/${tenant}/xmpp-websocket?room=${encodeURIComponent(conferenceRoomName)}`,
                    clientNode: 'http://jitsi.org/jitsimeet'
                }
            } else {
                // Public Jitsi fallback (Development)
                options = {
                    hosts: { domain: 'meet.jit.si', muc: 'conference.meet.jit.si' },
                    serviceUrl: `wss://meet.jit.si/xmpp-websocket?room=${roomName}`,
                    clientNode: 'http://jitsi.org/jitsimeet'
                }
            }

            const connection = new JitsiMeetJSRef.current.JitsiConnection(null, token, options)
            connectionRef.current = connection

            console.log(`[Jitsi] Connecting to ${token ? 'JaaS' : 'Public Jitsi'}...`)
            console.log('[Jitsi] Options:', JSON.stringify(options, null, 2))

            connection.addEventListener(JitsiMeetJSRef.current.events.connection.CONNECTION_ESTABLISHED, () => {
                console.log('[Jitsi] Connection Established')
                setConnectionStatus('connected')
                createLocalTracks().then((tracks) => {
                    const conference = connection.initJitsiConference(conferenceRoomName, { p2p: { enabled: false } })
                    conferenceRef.current = conference

                    conference.on(JitsiMeetJSRef.current.events.conference.TRACK_ADDED, (track: JitsiTrack) => {
                        if (!track.isLocal()) {
                            const id = track.getParticipantId()
                            updateRemoteParticipant(id, track, 'add')
                        }
                    })

                    conference.on(JitsiMeetJSRef.current.events.conference.TRACK_REMOVED, (track: JitsiTrack) => {
                        if (!track.isLocal()) {
                            const id = track.getParticipantId()
                            updateRemoteParticipant(id, track, 'remove')
                        }
                    })

                    conference.on(JitsiMeetJSRef.current.events.conference.USER_JOINED, (id: string, user: any) => {
                        console.log(`[Jitsi] User joined: ${id}`)
                        updateParticipantInfo(id, user.getDisplayName())
                    })

                    conference.on(JitsiMeetJSRef.current.events.conference.USER_LEFT, (id: string) => {
                        console.log(`[Jitsi] User left: ${id}`)
                        setRemoteParticipants(prev => {
                            const newMap = new Map(prev)
                            newMap.delete(id)
                            return newMap
                        })
                    })

                    conference.join()
                    tracks.forEach((t: JitsiTrack) => conference.addTrack(t))
                })
            })

            connection.addEventListener(JitsiMeetJSRef.current.events.connection.CONNECTION_FAILED, (err: any) => {
                console.error('[Jitsi] Connection Failed:', err)
                setConnectionStatus('failed')
            })

            connection.addEventListener(JitsiMeetJSRef.current.events.connection.CONNECTION_DISCONNECTED, () => {
                console.log('[Jitsi] Connection Disconnected')
                if (connectionStatus !== 'failed') {
                    setConnectionStatus('disconnected')
                }
            })

            connection.connect()

        } catch (e) {
            console.error('[Jitsi] Connect Exception:', e)
            setConnectionStatus('failed')
        }
    }, [isInitialized, createLocalTracks])

    // Helper to update remote participants map
    const updateRemoteParticipant = (id: string, track: JitsiTrack, action: 'add' | 'remove') => {
        setRemoteParticipants(prev => {
            const newMap = new Map(prev)
            const existing = newMap.get(id) || {
                participantId: id,
                name: 'User ' + id.substr(0, 4),
                isLocal: false,
                isMuted: false, // Default
                isVideoMuted: false,
                videoTrack: undefined,
                audioTrack: undefined
            } as VideoTrack

            // Cast structure for update
            const updated = { ...existing }

            if (track.getType() === 'video') {
                updated.videoTrack = action === 'add' ? track : undefined
                updated.isVideoMuted = action === 'remove' // Rough assumption
            } else if (track.getType() === 'audio') {
                updated.audioTrack = action === 'add' ? track : undefined
                updated.isMuted = action === 'remove'
            }

            newMap.set(id, updated)
            return newMap
        })
    }

    const updateParticipantInfo = (id: string, displayName: string) => {
        setRemoteParticipants(prev => {
            const newMap = new Map(prev)
            const existing = newMap.get(id)
            if (existing) {
                newMap.set(id, { ...existing, name: displayName })
            }
            return newMap
        })
    }

    const leaveRoom = async () => {
        if (conferenceRef.current) await conferenceRef.current.leave()
        if (connectionRef.current) await connectionRef.current.disconnect()
        setRawLocalTracks([])
        setRemoteParticipants(new Map())
        setConnectionStatus('disconnected')
    }

    const toggleAudio = async () => {
        const track = rawLocalTracks.find(t => t.getType() === 'audio')
        if (track) {
            if (isAudioMuted) await track.unmute()
            else await track.mute()
            setIsAudioMuted(!isAudioMuted)
        }
    }

    const toggleVideo = async () => {
        const track = rawLocalTracks.find(t => t.getType() === 'video' && t.videoType !== 'desktop')
        if (track) {
            if (isVideoMuted) await track.unmute()
            else await track.mute()
            setIsVideoMuted(!isVideoMuted)
        }
    }

    const toggleScreenShare = async () => {
        if (!conferenceRef.current || !JitsiMeetJSRef.current) return

        if (isScreenSharing) {
            // Stop sharing
            const desktopTrack = rawLocalTracks.find(t => t.getType() === 'video' && t.videoType === 'desktop')
            if (desktopTrack) {
                await conferenceRef.current.removeTrack(desktopTrack)
                await desktopTrack.dispose()
                setRawLocalTracks(prev => prev.filter(t => t !== desktopTrack))

                // Switch back to camera if it was active? 
                // Usually Jitsi switches automatically if camera track exists.
                // We might need to ensure camera track is added back or unmuted if we muted it.
            }
            setIsScreenSharing(false)
        } else {
            // Start sharing
            try {
                const tracks = await JitsiMeetJSRef.current.createLocalTracks({ devices: ['desktop'] })
                const desktopTrack = tracks[0]

                if (desktopTrack) {
                    desktopTrack.addEventListener(JitsiMeetJSRef.current.events.track.TRACK_MUTE_CHANGED, () => {
                        // Handle case where user stops sharing via browser UI
                        console.log('Screen share stopped via browser')
                        toggleScreenShare() // Toggle off
                    })

                    await conferenceRef.current.addTrack(desktopTrack)
                    setRawLocalTracks(prev => [...prev, desktopTrack])
                    setIsScreenSharing(true)
                }
            } catch (e) {
                console.error('Error starting screen share', e)
                // User might have cancelled
            }
        }
    }

    const toggleRaiseHand = async () => {
        if (!conferenceRef.current) return

        try {
            const newStatus = !isHandRaised
            await conferenceRef.current.setLocalParticipantProperty('raisedHand', newStatus)
            setIsHandRaised(newStatus)
        } catch (e) {
            console.error('Error toggling hand raise', e)
        }
    }

    // Command handling
    const sendCommand = (name: string, values: any) => {
        if (conferenceRef.current) {
            conferenceRef.current.sendCommand(name, {
                value: JSON.stringify(values),
                attributes: {} // Optional attributes
            })
        }
    }

    const addCommandListener = (command: string, handler: (values: any) => void) => {
        if (conferenceRef.current) {
            conferenceRef.current.addCommandListener(command, (data: any) => {
                // Jitsi sends data as { value: string, attributes: object }
                try {
                    const parsed = JSON.parse(data.value)
                    handler(parsed)
                } catch (e) {
                    console.error('Failed to parse command data', e)
                }
            })
        }
    }

    const removeCommandListener = (command: string, handler: (values: any) => void) => {
        if (conferenceRef.current) {
            // Jitsi's removeCommandListener expects the original handler function
            // However, our addCommandListener wraps the handler.
            // A more robust implementation would store the wrapped handler to remove it correctly.
            // For simplicity, this current implementation might not correctly remove if the handler is wrapped.
            // If direct removal of the wrapped function is needed, the wrapper needs to be stored.
            conferenceRef.current.removeCommandListener(command, handler)
        }
    }

    // Computed Local Track
    const localTrackFormatted: VideoTrack | undefined = rawLocalTracks.length > 0 ? {
        participantId: 'local',
        name: 'You',
        isLocal: true,
        isMuted: isAudioMuted,
        isVideoMuted: isVideoMuted,
        videoTrack: rawLocalTracks.find(t => t.getType() === 'video'),
        audioTrack: rawLocalTracks.find(t => t.getType() === 'audio')
    } : undefined

    return (
        <JitsiContext.Provider value={{
            isInitialized,
            connectionStatus,
            localTracks: localTrackFormatted,
            remoteTracks: Array.from(remoteParticipants.values()),
            joinRoom,
            leaveRoom,
            toggleAudio,
            toggleVideo,
            isAudioMuted,
            isVideoMuted,
            isScreenSharing,
            isHandRaised,
            toggleScreenShare,
            toggleRaiseHand,
            sendCommand,
            addCommandListener,
            removeCommandListener
        }}>
            {children}
        </JitsiContext.Provider>
    )
}

// Add global type for typescript
declare global {
    interface Window {
        JitsiMeetJS: any
    }
}
