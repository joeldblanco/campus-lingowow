'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ActivityRenderer } from '@/components/activities/activity-renderer'

// Tipos compatibles con ambas interfaces
interface BaseActivity {
  id: string
  title: string
  description: string
  level: number
  points: number
  activityData?: {
    readingText?: string
    questions?: unknown[]
    tags?: string[]
  }
}

interface ActivityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activity: BaseActivity | null
  isPreview?: boolean
  onComplete?: (score: number, totalQuestions: number) => void
  onClose?: () => void
}

export function ActivityDialog({
  open,
  onOpenChange,
  activity,
  isPreview = false,
  onComplete,
  onClose,
}: ActivityDialogProps) {
  const handleCloseActivity = () => {
    onClose?.()
    onOpenChange(false)
  }

  const handleActivityComplete = (score: number, totalQuestions: number) => {
    if (!isPreview) {
      onComplete?.(score, totalQuestions)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`!w-screen !max-w-none h-screen p-0 rounded-none [&>button]:hidden`}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{isPreview ? 'Activity Preview' : 'Activity'}</DialogTitle>
        </DialogHeader>

        {activity && (
          <ActivityRenderer
            activity={{
              id: activity.id,
              title: activity.title,
              description: activity.description,
              readingText: activity.activityData?.readingText,
              questions:
                (
                  activity.activityData?.questions as Array<{
                    id: string
                    type:
                      | 'multiple_choice'
                      | 'fill_blanks'
                      | 'matching_pairs'
                      | 'sentence_unscramble'
                    order: number
                    questionText?: string
                    options?: { id: string; text: string; isCorrect: boolean }[]
                    sentenceWithBlanks?: string
                    blanks?: { id: string; answer: string }[]
                    pairs?: { id: string; left: string; right: string }[]
                    correctSentence?: string
                    scrambledWords?: { id: string; text: string; originalIndex: number }[]
                  }>
                )?.map((q) => ({
                  ...q,
                  scrambledWords: q.scrambledWords || [],
                })) || [],
              difficulty:
                activity.level === 1
                  ? 'beginner'
                  : activity.level === 2
                    ? 'intermediate'
                    : 'advanced',
              points: activity.points,
              tags: activity.activityData?.tags,
            }}
            onComplete={handleActivityComplete}
            onClose={handleCloseActivity}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
