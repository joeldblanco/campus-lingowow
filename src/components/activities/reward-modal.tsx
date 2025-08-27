import Confetti from '@/components/activities/confetti'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Award, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'

interface RewardModalProps {
  reward: string
  open: boolean
  onClose: () => void
}

export default function RewardModal({ reward, open, onClose }: RewardModalProps) {
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    if (open) {
      setShowConfetti(true)
      const timer = setTimeout(() => {
        setShowConfetti(false)
      }, 5000)

      return () => {
        clearTimeout(timer)
      }
    }
  }, [open])

  return (
    <>
      {showConfetti && <Confetti />}

      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) onClose()
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold flex items-center justify-center gap-2">
              <Award className="h-6 w-6 text-yellow-500" />
              ¡Felicidades!
              <Award className="h-6 w-6 text-yellow-500" />
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center py-6">
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-ping h-16 w-16 rounded-full bg-yellow-400 opacity-20"></div>
              </div>
              <div className="relative flex items-center justify-center h-24 w-24 rounded-full bg-yellow-50 border-2 border-yellow-200">
                <Sparkles className="h-12 w-12 text-yellow-500" />
              </div>
            </div>

            <h3 className="text-xl font-bold text-center mb-2">{reward}</h3>

            <p className="text-center text-muted-foreground">
              Continúa aprendiendo para ganar más recompensas.
            </p>
          </div>

          <DialogFooter>
            <Button onClick={onClose} className="w-full">
              ¡Genial! Seguir aprendiendo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
