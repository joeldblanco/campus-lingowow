
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
    className?: string
    size?: number
    text?: string
}

export function LoadingSpinner({ className, size = 24, text }: LoadingSpinnerProps) {
    return (
        <div className={cn('flex flex-col items-center justify-center gap-2 p-4 text-muted-foreground', className)}>
            <Loader2 className="animate-spin" size={size} />
            {text && <p className="text-sm font-medium">{text}</p>}
        </div>
    )
}
