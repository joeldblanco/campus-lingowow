'use client'

import { ActivityBuilder } from '@/components/admin/activity-builder'
import { ActivityQuestion, ActivitySettings, DifficultyLevel } from '@/components/admin/activity-builder/types'
import { useAutoCloseSidebar } from '@/hooks/use-auto-close-sidebar'

interface Activity {
  id: string
  title: string
  description: string | null
  level: number
  activityData: unknown
  steps: unknown
  tags?: string[]
  isPublished: boolean
}

interface EditActivityClientProps {
  activity: Activity
}

export function EditActivityClient({ activity }: EditActivityClientProps) {
  useAutoCloseSidebar()
  
  // Convert activity data to the format expected by ActivityBuilder
  const initialData = {
    title: activity.title,
    description: activity.description || '',
    questions: extractQuestions(activity),
    settings: extractSettings(activity),
    isPublished: activity.isPublished,
  }

  return (
    <ActivityBuilder
      activityId={activity.id}
      initialData={initialData}
    />
  )
}

// Helper function to extract questions from activity data
function extractQuestions(activity: Activity): ActivityQuestion[] {
  // Try to get questions from activityData or steps
  const data = activity.activityData as { questions?: ActivityQuestion[] } | null
  const steps = activity.steps as { steps?: Array<{ type: string; question?: string; options?: Array<{ text: string; isCorrect: boolean }> }> } | null

  if (data?.questions) {
    return data.questions
  }

  // If steps format, convert to questions
  if (steps?.steps) {
    return steps.steps
      .filter(step => step.type === 'question')
      .map((step, index) => ({
        id: `q-${index}`,
        type: 'multiple_choice' as const,
        order: index,
        questionText: step.question || '',
        options: step.options?.map((opt, optIndex) => ({
          id: `opt-${index}-${optIndex}`,
          text: opt.text,
          isCorrect: opt.isCorrect,
        })) || [],
      }))
  }

  return []
}

// Helper function to extract settings from activity
function extractSettings(activity: Activity): ActivitySettings {
  const levelMap: Record<number, DifficultyLevel> = {
    1: 'beginner',
    2: 'intermediate',
    3: 'advanced',
  }

  return {
    difficulty: levelMap[activity.level] || 'beginner',
    tags: activity.tags || [],
    description: activity.description || '',
  }
}
