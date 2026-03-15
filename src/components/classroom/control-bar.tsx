'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    Mic,
    MicOff,
    Video,
    VideoOff,
    Hand,
    PhoneOff,
    LogOut,
    MessageSquare,
    ScreenShare
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface ControlBarProps {
    isMicMuted?: boolean
    isVideoMuted?: boolean
    isHandRaised?: boolean
    isRecording?: boolean
    isTeacher?: boolean
    isChatOpen?: boolean
    hasUnreadChat?: boolean
    isSharing?: boolean
    onToggleMic?: () => void
    onToggleVideo?: () => void
    onToggleHand?: () => void
    onToggleChat?: () => void
    onToggleShare?: () => void
    onEndCall?: () => void
    onLeave?: () => void
}

export function ControlBar({
    isMicMuted = false,
    isVideoMuted = false,
    isHandRaised = false,
    isRecording = false,
    isTeacher = false,
    isChatOpen = false,
    hasUnreadChat = false,
    isSharing = false,
    onToggleMic,
    onToggleVideo,
    onToggleHand,
    onToggleChat,
    onToggleShare,
    onEndCall,
    onLeave
}: ControlBarProps) {
    const [showConfirmModal, setShowConfirmModal] = useState(false)

    const handleConfirm = () => {
        setShowConfirmModal(false)
        if (isTeacher) {
            onEndCall?.()
        } else {
            onLeave?.()
        }
    }

    return (
        <>
        <div className="flex items-center gap-2">
            <TooltipProvider>
                {/* Microphone */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "rounded-full w-10 h-10 transition-all",
                                isMicMuted
                                    ? "bg-red-500 hover:bg-red-600 text-white"
                                    : "bg-[#3c4043] hover:bg-[#4a4d51] text-white"
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
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "rounded-full w-10 h-10 transition-all",
                                isVideoMuted
                                    ? "bg-red-500 hover:bg-red-600 text-white"
                                    : "bg-[#3c4043] hover:bg-[#4a4d51] text-white"
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

                {/* Raise Hand */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "rounded-full w-10 h-10 transition-all",
                                isHandRaised
                                    ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                                    : "bg-[#3c4043] hover:bg-[#4a4d51] text-white"
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

                {/* Chat */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "rounded-full w-10 h-10 transition-all relative",
                                isChatOpen
                                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                                    : "bg-[#3c4043] hover:bg-[#4a4d51] text-white"
                            )}
                            onClick={onToggleChat}
                        >
                            <MessageSquare className="w-5 h-5" />
                            {hasUnreadChat && !isChatOpen && (
                                <span className="absolute top-1 right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-[#202124] animate-pulse" />
                            )}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{isChatOpen ? 'Ocultar chat' : 'Abrir chat'}</p>
                    </TooltipContent>
                </Tooltip>

                {/* Share Content */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "rounded-full w-10 h-10 transition-all",
                                isSharing
                                    ? "bg-green-600 hover:bg-green-700 text-white"
                                    : "bg-[#3c4043] hover:bg-[#4a4d51] text-white"
                            )}
                            onClick={onToggleShare}
                        >
                            <ScreenShare className="w-5 h-5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{isSharing ? 'Compartiendo...' : 'Compartir contenido'}</p>
                    </TooltipContent>
                </Tooltip>

                {/* Recording Indicator - Automatic, no manual control */}
                {isRecording && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-500/20 rounded-full">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-xs font-medium text-red-400">REC</span>
                    </div>
                )}

                <div className="w-px h-6 bg-white/10 mx-1" />

                {/* End Call (teacher) / Leave (student) */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="destructive"
                            size="sm"
                            className="rounded-full px-5 h-10 gap-2 font-medium bg-red-500 hover:bg-red-600 transition-all"
                            onClick={() => setShowConfirmModal(true)}
                        >
                            {isTeacher ? (
                                <PhoneOff className="w-5 h-5" />
                            ) : (
                                <LogOut className="w-5 h-5" />
                            )}
                            <span className="hidden sm:inline">{isTeacher ? 'Finalizar' : 'Salir'}</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{isTeacher ? 'Finalizar la clase' : 'Salir de la clase'}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>

        {/* Confirmation Modal */}
        {showConfirmModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowConfirmModal(false)}>
                <div
                    className="bg-[#292a2d] rounded-2xl shadow-2xl w-[400px] max-w-[90vw] overflow-hidden border border-white/10"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-6 text-center">
                        <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                            {isTeacher ? (
                                <PhoneOff className="w-7 h-7 text-red-400" />
                            ) : (
                                <LogOut className="w-7 h-7 text-red-400" />
                            )}
                        </div>
                        <h2 className="text-lg font-semibold text-white mb-2">
                            {isTeacher ? '¿Finalizar la clase?' : '¿Salir de la clase?'}
                        </h2>
                        <p className="text-sm text-white/50 mb-6">
                            {isTeacher
                                ? 'Esto finalizará la clase para todos los participantes. La grabación se detendrá automáticamente.'
                                : 'Saldrás de la clase. Puedes volver a unirte mientras la clase siga activa.'}
                        </p>
                        <div className="flex gap-3 justify-center">
                            <Button
                                variant="ghost"
                                onClick={() => setShowConfirmModal(false)}
                                className="text-white/70 hover:text-white hover:bg-white/10 px-6"
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleConfirm}
                                className="bg-red-500 hover:bg-red-600 px-6 gap-2"
                            >
                                {isTeacher ? (
                                    <>
                                        <PhoneOff className="w-4 h-4" />
                                        Finalizar
                                    </>
                                ) : (
                                    <>
                                        <LogOut className="w-4 h-4" />
                                        Salir
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        )}
        </>
    )
}
