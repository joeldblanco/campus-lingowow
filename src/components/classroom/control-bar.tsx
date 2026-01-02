'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import {
    Mic,
    MicOff,
    Video,
    VideoOff,
    MonitorUp,
    Hand,
    PhoneOff
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface ControlBarProps {
    isMicMuted?: boolean
    isVideoMuted?: boolean
    isScreenSharing?: boolean
    isHandRaised?: boolean
    isRecording?: boolean
    onToggleMic?: () => void
    onToggleVideo?: () => void
    onToggleScreenShare?: () => void
    onToggleHand?: () => void
    onEndCall?: () => void
}

export function ControlBar({
    isMicMuted = false,
    isVideoMuted = false,
    isScreenSharing = false,
    isHandRaised = false,
    isRecording = false,
    onToggleMic,
    onToggleVideo,
    onToggleScreenShare,
    onToggleHand,
    onEndCall
}: ControlBarProps) {
    return (
        <div className="flex items-center gap-1">
            <TooltipProvider>
                {/* Microphone */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant={isMicMuted ? "destructive" : "ghost"}
                            size="icon"
                            className={cn(
                                "rounded-full w-9 h-9 transition-all",
                                !isMicMuted && "bg-gray-100 hover:bg-gray-200 text-gray-700"
                            )}
                            onClick={onToggleMic}
                        >
                            {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{isMicMuted ? 'Activar micrófono' : 'Silenciar'}</p>
                    </TooltipContent>
                </Tooltip>

                {/* Camera */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant={isVideoMuted ? "destructive" : "ghost"}
                            size="icon"
                            className={cn(
                                "rounded-full w-9 h-9 transition-all",
                                !isVideoMuted && "bg-gray-100 hover:bg-gray-200 text-gray-700"
                            )}
                            onClick={onToggleVideo}
                        >
                            {isVideoMuted ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{isVideoMuted ? 'Activar cámara' : 'Apagar cámara'}</p>
                    </TooltipContent>
                </Tooltip>

                {/* Screen Share */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant={isScreenSharing ? "default" : "ghost"}
                            size="icon"
                            className={cn(
                                "rounded-full w-9 h-9 transition-all",
                                !isScreenSharing && "bg-gray-100 hover:bg-gray-200 text-gray-700"
                            )}
                            onClick={onToggleScreenShare}
                        >
                            <MonitorUp className="w-4 h-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{isScreenSharing ? 'Dejar de compartir' : 'Compartir pantalla'}</p>
                    </TooltipContent>
                </Tooltip>

                {/* Raise Hand */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant={isHandRaised ? "default" : "ghost"}
                            size="icon"
                            className={cn(
                                "rounded-full w-9 h-9 transition-all",
                                isHandRaised ? "bg-yellow-400 hover:bg-yellow-500 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                            )}
                            onClick={onToggleHand}
                        >
                            <Hand className="w-4 h-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{isHandRaised ? 'Bajar la mano' : 'Levantar la mano'}</p>
                    </TooltipContent>
                </Tooltip>

                {/* Recording Indicator - Automatic, no manual control */}
                {isRecording && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-red-100 rounded-full">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-xs font-medium text-red-600">REC</span>
                    </div>
                )}

                <div className="w-px h-6 bg-gray-200 mx-1" />

                {/* End Call */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="destructive"
                            size="sm"
                            className="rounded-full px-3 h-9 gap-1.5 font-medium hover:bg-red-600 transition-all"
                            onClick={onEndCall}
                        >
                            <PhoneOff className="w-4 h-4" />
                            <span>Finalizar</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Salir de la clase</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    )
}
