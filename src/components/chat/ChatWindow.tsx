'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Search,
  MoreVertical,
  Paperclip,
  Smile,
  Send,
  FileText,
  Download,
  Check,
  CheckCheck,
  Loader2,
  Trash2,
  Archive,
  User,
  X,
  Mic,
  Maximize2,
  Play,
  Pause,
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { pusherClient } from '@/lib/pusher'
import {
  sendFloatingMessage,
  getConversationMessages,
  markMessagesAsRead,
} from '@/lib/actions/floating-chat'
import { uploadFileByType } from '@/lib/actions/cloudinary'
import EmojiPicker from 'emoji-picker-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface ChatWindowProps {
  conversationId: string
  currentUser: any
  otherUser: any
  initialMessages?: any[]
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversationId,
  currentUser,
  otherUser,
  initialMessages = [],
}) => {
  // --- Existing States ---
  const [messages, setMessages] = useState<any[]>(initialMessages)
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // --- Media Lightbox State ---
  const [lightboxMedia, setLightboxMedia] = useState<{
    url: string
    type: 'image' | 'video'
  } | null>(null)

  // --- New Recording States ---
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // --- Effects ---
  useEffect(() => {
    if (scrollRef.current) {
      if (!searchTerm) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }
    }
  }, [messages, searchTerm])

  useEffect(() => {
    const loadMessages = async () => {
      setIsLoading(true)
      const res = await getConversationMessages(conversationId, currentUser.id)
      if (res.success && res.messages) {
        setMessages(res.messages)
        await markMessagesAsRead(conversationId, currentUser.id)
      }
      setIsLoading(false)
    }

    if (conversationId) {
      loadMessages()
      setSearchTerm('')
      setShowSearch(false)
    }
  }, [conversationId, currentUser.id])

  useEffect(() => {
    const channel = pusherClient.subscribe(`conversation-${conversationId}`)

    channel.bind('new-message', (message: any) => {
      setMessages((prev) => {
        if (prev.find((m) => m.id === message.id)) return prev
        const pendingMatch = prev.find(
          (m) =>
            m.isSending &&
            m.content === message.content &&
            m.senderId === message.senderId &&
            m.type === message.type &&
            new Date(message.timestamp).getTime() - new Date(m.timestamp).getTime() < 10000
        )
        if (pendingMatch) {
          return prev.map((m) => (m.id === pendingMatch.id ? message : m))
        }
        return [...prev, message]
      })

      if (scrollRef.current) {
        setTimeout(() => {
          scrollRef.current!.scrollTop = scrollRef.current!.scrollHeight
        }, 100)
      }

      if (message.senderId !== currentUser.id) {
        markMessagesAsRead(conversationId, currentUser.id)
      }
    })

    return () => {
      pusherClient.unsubscribe(`conversation-${conversationId}`)
    }
  }, [conversationId, currentUser.id])

  // --- Message Sending Logic ---
  const sendMessageInternal = async (
    content: string,
    type: 'TEXT' | 'FILE' = 'TEXT',
    metadata: any = null
  ) => {
    const tempId = `temp-${Date.now()}`
    const tempMessage = {
      id: tempId,
      content: content,
      senderId: currentUser.id,
      timestamp: new Date(),
      isRead: false,
      type: type,
      metadata: metadata,
      sender: currentUser,
      isSending: true,
    }

    setMessages((prev) => [...prev, tempMessage])
    if (type === 'TEXT') setNewMessage('')
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight

    const res = await sendFloatingMessage(conversationId, currentUser.id, content, type, metadata)

    if (res.success && res.message) {
      setMessages((prev) => {
        if (prev.find((m) => m.id === res.message.id)) {
          return prev.filter((m) => m.id !== tempId)
        }
        return prev.map((m) => (m.id === tempId ? res.message : m))
      })
    } else {
      console.error('Failed to send message')
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
    }
  }

  const handleSend = () => {
    if (!newMessage.trim()) return
    sendMessageInternal(newMessage, 'TEXT')
  }

  // --- File Upload Logic ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)

    let fileType: 'image' | 'video' | 'audio' | 'document' = 'document'
    if (file.type.startsWith('image/')) fileType = 'image'
    else if (file.type.startsWith('video/')) fileType = 'video'
    else if (file.type.startsWith('audio/')) fileType = 'audio'

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await uploadFileByType(formData, fileType, 'chat-files')
      if (res.success && res.data) {
        await sendMessageInternal(file.name, 'FILE', {
          fileName: file.name,
          url: res.data.secure_url,
          size: file.size,
          mimeType: file.type,
        })
      } else {
        console.error('Upload failed', res.error)
      }
    } catch (err) {
      console.error('Upload error', err)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // --- Recording Logic ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const audioFile = new File([audioBlob], `voice-message-${Date.now()}.webm`, {
          type: 'audio/webm',
        })

        setIsUploading(true)
        const formData = new FormData()
        formData.append('file', audioFile)

        try {
          const res = await uploadFileByType(formData, 'audio', 'chat-audio')
          if (res.success && res.data) {
            await sendMessageInternal('Mensaje de voz', 'FILE', {
              fileName: audioFile.name,
              url: res.data.secure_url,
              size: audioFile.size,
              mimeType: 'audio/webm',
              isVoice: true,
            })
          } else {
            console.error('Audio upload failed')
          }
        } catch (e) {
          console.error(e)
        } finally {
          setIsUploading(false)
          setIsRecording(false)
          setRecordingDuration(0)
        }

        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1)
      }, 1000)
    } catch (err) {
      console.error('Error accessing microphone', err)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
      setIsRecording(false)
      setRecordingDuration(0)
      audioChunksRef.current = []
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  // --- Download Helper ---
  const handleDownload = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error('Download failed:', error)
      window.open(url, '_blank')
    }
  }

  // --- Custom Audio Player Component ---
  const CustomAudioPlayer = ({ audioUrl }: { audioUrl: string }) => {
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [waveformData, setWaveformData] = useState<number[]>([])
    const audioRef = useRef<HTMLAudioElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const animationRef = useRef<number | null>(null)

    const generateWaveform = async () => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const response = await fetch(audioUrl)
        const arrayBuffer = await response.arrayBuffer()
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

        const channelData = audioBuffer.getChannelData(0)
        const samples = 100 // Number of samples to display
        const blockSize = Math.floor(channelData.length / samples)
        const filteredData: number[] = []

        for (let i = 0; i < samples; i++) {
          const start = blockSize * i
          let sum = 0
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(channelData[start + j])
          }
          filteredData.push(sum / blockSize)
        }

        // Normalize the data
        const max = Math.max(...filteredData)
        setWaveformData(filteredData.map((value) => value / max))
      } catch (error) {
        console.error('Error generating waveform:', error)
        // Generate random waveform as fallback
        setWaveformData(Array.from({ length: 100 }, () => Math.random() * 0.8 + 0.2))
      }
    }

    const drawWaveform = () => {
      if (!canvasRef.current) return

      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const width = canvas.width
      const height = canvas.height

      // Clear canvas
      ctx.clearRect(0, 0, width, height)

      // Draw waveform
      const barWidth = width / waveformData.length
      const progress = duration > 0 ? currentTime / duration : 0

      waveformData.forEach((value, index) => {
        const barHeight = value * height * 0.8
        const x = index * barWidth
        const y = (height - barHeight) / 2

        // Color based on progress
        const isPlayed = index / waveformData.length <= progress
        ctx.fillStyle = isPlayed ? '#2563eb' : '#e5e7eb'

        ctx.fillRect(x, y, barWidth - 1, barHeight)
      })
    }

    const handlePlay = () => {
      if (!audioRef.current) return

      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
    }

    const handleTimeUpdate = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime)
      }
    }

    const handleLoadedMetadata = () => {
      if (audioRef.current) {
        setDuration(audioRef.current.duration)
        generateWaveform()
      }
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    const formatTime = (time: number) => {
      const minutes = Math.floor(time / 60)
      const seconds = Math.floor(time % 60)
      return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
    }

    useEffect(() => {
      drawWaveform()
    }, [waveformData, currentTime])

    useEffect(() => {
      const animate = () => {
        drawWaveform()
        animationRef.current = requestAnimationFrame(animate)
      }

      if (isPlaying) {
        animate()
      } else {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current)
        }
      }

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current)
        }
      }
    }, [isPlaying, currentTime])

    return (
      <div className="flex items-center gap-3 p-0 bg-gray-50 rounded-lg">
        <Button
          type="button"
          size="sm"
          onClick={handlePlay}
          className="h-8 w-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0"
        >
          {isPlaying ? (
            <Pause className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
        </Button>

        <div className="flex-1 flex flex-col gap-1">
          <canvas
            ref={canvasRef}
            width={300}
            height={40}
            className="w-full h-10 cursor-pointer"
            onClick={(e) => {
              if (!audioRef.current || !duration) return
              const rect = canvasRef.current!.getBoundingClientRect()
              const x = e.clientX - rect.left
              const progress = x / rect.width
              audioRef.current.currentTime = progress * duration
            }}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">{formatTime(currentTime)}</span>
            <span className="text-xs text-gray-500">{formatTime(duration)}</span>
          </div>
        </div>

        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          preload="metadata"
        />
      </div>
    )
  }

  // --- Render Helpers ---
  const filteredMessages = searchTerm
    ? messages.filter((m) => m.content?.toLowerCase().includes(searchTerm.toLowerCase()))
    : messages

  const renderMessageContent = (msg: any) => {
    if (msg.type === 'FILE' || msg.metadata) {
      const mime = msg.metadata?.mimeType || ''
      const isImage = mime.startsWith('image/')
      const isVideo = mime.startsWith('video/')
      const isAudio = mime.startsWith('audio/') || msg.metadata?.isVoice

      if (isImage) {
        return (
          <div className="relative group max-w-[280px]">
            <img
              src={msg.metadata.url}
              alt={msg.metadata.fileName}
              className="rounded-lg w-full h-auto object-cover max-h-[300px] cursor-pointer hover:brightness-95 transition-all"
              loading="lazy"
              onClick={() => setLightboxMedia({ url: msg.metadata.url, type: 'image' })}
            />
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 text-white"
                onClick={() => setLightboxMedia({ url: msg.metadata.url, type: 'image' })}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 text-white"
                onClick={() => handleDownload(msg.metadata.url, msg.metadata.fileName || 'imagen')}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )
      }

      if (isVideo) {
        return (
          <div className="relative group max-w-[280px]">
            <video
              src={msg.metadata.url}
              className="rounded-lg w-full h-auto max-h-[300px]"
              controls
            />
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 text-white"
                onClick={() => setLightboxMedia({ url: msg.metadata.url, type: 'video' })}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 text-white"
                onClick={() => handleDownload(msg.metadata.url, msg.metadata.fileName || 'video')}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )
      }

      if (isAudio) {
        return (
          <div className="min-w-[400px]">
            <CustomAudioPlayer audioUrl={msg.metadata.url} />
          </div>
        )
      }

      return (
        <div className="flex items-center gap-3 bg-white p-3 rounded-lg border shadow-sm max-w-[300px]">
          <div className="bg-red-100 p-2 rounded-lg">
            <FileText className="h-6 w-6 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <a
                href={msg.metadata?.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-sm truncate hover:underline text-blue-600 block"
              >
                {msg.metadata?.fileName || 'Documento'}
              </a>
              {msg.isSending && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
            </div>
            <p className="text-xs text-gray-500">
              {msg.metadata?.size
                ? (msg.metadata.size / 1024).toFixed(1) + ' KB'
                : 'Tamaño desconocido'}
            </p>
          </div>
          {msg.metadata?.url && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-400 hover:text-gray-600"
              onClick={() => handleDownload(msg.metadata.url, msg.metadata.fileName || 'documento')}
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      )
    }
    return <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b h-20 shrink-0">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={otherUser.image} />
            <AvatarFallback>{otherUser.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-sm">
              {otherUser.name} {otherUser.lastName}
            </h3>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">
                Hora local: {format(new Date(), 'HH:mm')}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showSearch ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => {
              setShowSearch(!showSearch)
              if (showSearch) setSearchTerm('')
            }}
          >
            {showSearch ? (
              <X className="h-5 w-5 text-gray-700" />
            ) : (
              <Search className="h-5 w-5 text-gray-500" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5 text-gray-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Opciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" /> Ver perfil
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Archive className="mr-2 h-4 w-4" /> Archivar chat
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" /> Eliminar chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search Bar Overlay */}
      {showSearch && (
        <div className="p-2 border-b bg-gray-50 flex items-center gap-2 animate-in slide-in-from-top-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar en la conversación..."
              className="pl-9 bg-white"
              autoFocus
            />
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-6" ref={scrollRef}>
        {filteredMessages.map((msg, index) => {
          const isMe = msg.senderId === currentUser.id
          const showAvatar =
            !isMe && (index === 0 || filteredMessages[index - 1].senderId !== msg.senderId)

          return (
            <div
              key={msg.id}
              className={cn('flex gap-3 text-left', isMe ? 'justify-end' : 'justify-start')}
            >
              {!isMe && (
                <div className="w-8 flex-shrink-0">
                  {showAvatar && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={otherUser.image} />
                      <AvatarFallback>{otherUser.name[0]}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              )}

              <div className={cn('flex flex-col max-w-[70%]', isMe ? 'items-end' : 'items-start')}>
                <div className="flex items-baseline gap-2 mb-1">
                  {!isMe && (
                    <span className="text-xs font-semibold text-gray-700">
                      {otherUser.name} {otherUser.lastName}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {format(new Date(msg.timestamp), 'h:mm a')}
                  </span>
                </div>

                <div
                  className={cn(
                    'relative px-4 py-3 rounded-2xl shadow-sm transition-all',
                    isMe
                      ? 'bg-blue-600 text-white rounded-tr-sm'
                      : 'bg-white border text-gray-800 rounded-tl-sm',
                    msg.isSending && 'opacity-70'
                  )}
                >
                  {renderMessageContent(msg)}
                </div>

                {isMe && (
                  <div className="flex justify-end w-full mt-1 min-h-[16px]">
                    {msg.isSending ? (
                      <div className="flex items-center text-gray-400 animate-pulse">
                        <span className="text-[10px] mr-1">Enviando...</span>
                      </div>
                    ) : msg.isRead ? (
                      <div className="flex items-center text-blue-500">
                        <CheckCheck className="h-3 w-3" />
                        <span className="text-[10px] ml-1">Leído</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-gray-400">
                        <Check className="h-3 w-3" />
                        <span className="text-[10px] ml-1">Enviado</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {isMe && (
                <div className="w-8 flex-shrink-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={currentUser.image} />
                    <AvatarFallback>{currentUser.name[0]}</AvatarFallback>
                  </Avatar>
                </div>
              )}
            </div>
          )
        })}

        {filteredMessages.length === 0 && searchTerm && (
          <div className="text-center text-gray-400 mt-10">
            <p>No se encontraron mensajes.</p>
          </div>
        )}
      </div>

      {/* Input Area Updated */}
      <div className="p-4 border-t bg-white shrink-0">
        {isRecording ? (
          <div className="flex items-center gap-4 bg-gray-50 rounded-xl p-3 border animate-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 flex-1">
              <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-500 font-medium">{formatDuration(recordingDuration)}</span>
              <span className="text-xs text-gray-400 ml-2">Grabando nota de voz...</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={cancelRecording}
              className="text-gray-500 hover:text-red-500"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              onClick={stopRecording}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 bg-gray-50 rounded-xl p-2 border focus-within:ring-1 focus-within:ring-blue-500 transition-all">
            <div className="flex items-center gap-2 p-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-400 hover:text-gray-600"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Paperclip className="h-5 w-5" />
                )}
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-gray-600"
                  >
                    <Smile className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border-none ml-10 mb-2" side="top">
                  <EmojiPicker
                    onEmojiClick={(e) => setNewMessage((prev) => prev + e.emoji)}
                    searchDisabled
                    skinTonesDisabled
                    width={300}
                    height={400}
                  />
                </PopoverContent>
              </Popover>

              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="Escribe un mensaje..."
                className="flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 text-base min-h-[44px] max-h-[150px] resize-none py-3"
              />

              {newMessage.trim() ? (
                <Button
                  onClick={handleSend}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 gap-2"
                >
                  Enviar <Send className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={startRecording}
                  variant="ghost"
                  size="icon"
                  className="text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                >
                  <Mic className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        )}

        {!isRecording && (
          <div className="flex justify-end mt-2">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
              Corrección gramatical activa
            </div>
          </div>
        )}
      </div>

      {/* Media Lightbox Dialog */}
      <Dialog open={!!lightboxMedia} onOpenChange={(open) => !open && setLightboxMedia(null)}>
        <DialogTitle className="sr-only">Vista previa de medio</DialogTitle>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none shadow-2xl flex items-center justify-center overflow-hidden">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
            onClick={() => setLightboxMedia(null)}
          >
            <X className="h-5 w-5" />
          </Button>
          <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
            {lightboxMedia?.type === 'image' && (
              <img
                src={lightboxMedia.url}
                alt="Vista previa"
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
            )}
            {lightboxMedia?.type === 'video' && (
              <video
                src={lightboxMedia.url}
                controls
                className="max-w-full max-h-[80vh] rounded-lg"
                autoPlay
              />
            )}
            <div className="mt-4 flex gap-3">
              <Button
                className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm"
                onClick={() => {
                  if (lightboxMedia) {
                    const fileName = lightboxMedia.type === 'image' ? 'imagen' : 'video'
                    handleDownload(lightboxMedia.url, fileName)
                  }
                }}
              >
                <Download className="mr-2 h-4 w-4" /> Descargar
              </Button>
              <Button
                variant="outline"
                className="bg-transparent border-white/30 hover:bg-white/10 text-white"
                onClick={() => setLightboxMedia(null)}
              >
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
