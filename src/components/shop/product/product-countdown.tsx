'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

interface ProductCountdownProps {
    publishedAt: Date | string | null
    expiresAt: Date | string | null
    className?: string
    onComplete?: () => void
}

export function ProductCountdown({ publishedAt, expiresAt, className = '', onComplete }: ProductCountdownProps) {
    const [timeLeft, setTimeLeft] = useState<{
        type: 'published' | 'expires'
        days: number
        hours: number
        minutes: number
        seconds: number
        text: string
    } | null>(null)

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date()
            const start = publishedAt ? new Date(publishedAt) : null
            const end = expiresAt ? new Date(expiresAt) : null

            // Caso 1: Aún no publicado
            if (start && start > now) {
                const difference = start.getTime() - now.getTime()
                return {
                    type: 'published',
                    difference,
                    text: 'Disponible en:'
                }
            }

            // Caso 2: Publicado pero tiene fecha de expiración
            if (end && end > now) {
                const difference = end.getTime() - now.getTime()
                return {
                    type: 'expires',
                    difference,
                    text: 'Expira en:'
                }
            }

            // Caso 3: Expirado o ya activo sin fecha fin relevante
            return null
        }

        const timer = setInterval(() => {
            const result = calculateTimeLeft()

            if (!result) {
                setTimeLeft(null)
                onComplete?.()
                return
            }

            const { difference, type, text } = result

            const days = Math.floor(difference / (1000 * 60 * 60 * 24))
            const hours = Math.floor((difference / (1000 * 60 * 60)) % 24)
            const minutes = Math.floor((difference / 1000 / 60) % 60)
            const seconds = Math.floor((difference / 1000) % 60)

            setTimeLeft({
                type: type as 'published' | 'expires',
                days,
                hours,
                minutes,
                seconds,
                text
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [publishedAt, expiresAt, onComplete])

    if (!timeLeft) return null

    return (
        <div className={`flex items-center gap-2 text-sm font-medium ${timeLeft.type === 'published' ? 'text-blue-600 bg-blue-50' : 'text-amber-600 bg-amber-50'
            } px-3 py-1.5 rounded-full ${className}`}>
            <Clock className="w-4 h-4" />
            <span>{timeLeft.text}</span>
            <span className="font-bold font-mono">
                {timeLeft.days > 0 && `${timeLeft.days}d `}
                {timeLeft.hours.toString().padStart(2, '0')}:
                {timeLeft.minutes.toString().padStart(2, '0')}:
                {timeLeft.seconds.toString().padStart(2, '0')}
            </span>
        </div>
    )
}
