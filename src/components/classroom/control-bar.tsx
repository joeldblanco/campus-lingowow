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
    onToggleMic,
    onToggleVideo,
    onToggleScreenShare,
    onToggleHand,
    onEndCall
}: ControlBarProps) {
    return (
        <div className="bg-white/90 backdrop-blur-sm border border-gray-200 shadow-xl rounded-full px-6 py-3 flex items-center gap-4 transition-all duration-300 hover:shadow-2xl">
            <TooltipProvider>
                {/* Microphone */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant={isMicMuted ? "destructive" : "ghost"}
                            size="icon"
                            className={cn(
                                "rounded-full w-12 h-12 transition-all",
                                !isMicMuted && "bg-gray-100 hover:bg-gray-200 text-gray-700"
                            )}
                            onClick={onToggleMic}
                        >
                            {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
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
                                "rounded-full w-12 h-12 transition-all",
                                !isVideoMuted && "bg-gray-100 hover:bg-gray-200 text-gray-700"
                            )}
                            onClick={onToggleVideo}
                        >
                            {isVideoMuted ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
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
                                "rounded-full w-12 h-12 transition-all",
                                !isScreenSharing && "bg-gray-100 hover:bg-gray-200 text-gray-700"
                            )}
                            onClick={onToggleScreenShare}
                        >
                            <MonitorUp className="w-5 h-5" />
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
                                "rounded-full w-12 h-12 transition-all",
                                isHandRaised ? "bg-yellow-400 hover:bg-yellow-500 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                            )}
                            onClick={onToggleHand}
                        >
                            <Hand className="w-5 h-5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{isHandRaised ? 'Bajar la mano' : 'Levantar la mano'}</p>
                    </TooltipContent>
                </Tooltip>

                <div className="w-px h-8 bg-gray-200 mx-2" />

                {/* End Call */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="destructive"
                            className="rounded-full px-6 h-12 gap-2 font-semibold shadow-red-200 shadow-lg hover:bg-red-600 transition-all"
                            onClick={onEndCall}
                        >
                            <PhoneOff className="w-5 h-5" />
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
