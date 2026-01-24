'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Search, Flame, AlertTriangle, Clock, CheckCircle, Sparkles, Calendar, BookOpen, Headphones, Mic, PenTool, FileText } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { ActivityRenderer } from '@/components/activities/activity-renderer'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'

interface Activity {
  id: string
  title: string
  description: string
  level: number
  activityType: string
  points: number
  duration: number
  activityData: {
    tags?: string[]
    questions?: unknown[]
  }
  userProgress?: {
    status: string
    score: number | null
    completedAt: string | null
  }[]
  dueDate?: string
  isNew?: boolean
}

interface StudentActivitiesViewProps {
  initialActivities?: Activity[]
}

const DIFFICULTY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Fácil', color: 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-400' },
  2: { label: 'Medio', color: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20 dark:bg-yellow-900/30 dark:text-yellow-500' },
  3: { label: 'Difícil', color: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/30 dark:text-red-400' },
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  VOCABULARY: <FileText className="h-4 w-4 text-blue-500" />,
  READING: <BookOpen className="h-4 w-4 text-blue-500" />,
  LISTENING: <Headphones className="h-4 w-4 text-blue-500" />,
  SPEAKING: <Mic className="h-4 w-4 text-blue-500" />,
  WRITING: <PenTool className="h-4 w-4 text-blue-500" />,
  GRAMMAR: <FileText className="h-4 w-4 text-blue-500" />,
  PRONUNCIATION: <Mic className="h-4 w-4 text-blue-500" />,
  COMPREHENSION: <BookOpen className="h-4 w-4 text-blue-500" />,
  MULTIPLE_CHOICE: <FileText className="h-4 w-4 text-blue-500" />,
  FILL_IN_BLANK: <FileText className="h-4 w-4 text-blue-500" />,
  MATCHING: <FileText className="h-4 w-4 text-blue-500" />,
  ORDERING: <FileText className="h-4 w-4 text-blue-500" />,
  DICTATION: <PenTool className="h-4 w-4 text-blue-500" />,
  TRANSLATION: <FileText className="h-4 w-4 text-blue-500" />,
  OTHER: <FileText className="h-4 w-4 text-blue-500" />,
}

const TYPE_LABELS: Record<string, string> = {
  VOCABULARY: 'Vocabulario',
  READING: 'Lectura',
  LISTENING: 'Escucha',
  SPEAKING: 'Habla',
  WRITING: 'Escritura',
  GRAMMAR: 'Gramática',
  PRONUNCIATION: 'Pronunciación',
  COMPREHENSION: 'Comprensión',
  MULTIPLE_CHOICE: 'Opción Múltiple',
  FILL_IN_BLANK: 'Completar',
  MATCHING: 'Emparejar',
  ORDERING: 'Ordenar',
  DICTATION: 'Dictado',
  TRANSLATION: 'Traducción',
  OTHER: 'Otro',
}

export function StudentActivitiesView({ initialActivities }: StudentActivitiesViewProps) {
  const { data: session } = useSession()
  const [activities, setActivities] = useState<Activity[]>(initialActivities || [])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(!initialActivities)
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [activityDialogOpen, setActivityDialogOpen] = useState(false)
  const [userStreak, setUserStreak] = useState(0)

  // Stats
  const dueToday = activities.filter((a) => {
    const progress = a.userProgress?.[0]
    return progress?.status !== 'COMPLETED' && a.dueDate === new Date().toISOString().split('T')[0]
  }).length

  const pending = activities.filter((a) => {
    const progress = a.userProgress?.[0]
    return !progress || progress.status === 'ASSIGNED' || progress.status === 'IN_PROGRESS'
  }).length

  const completed = activities.filter((a) => a.userProgress?.[0]?.status === 'COMPLETED').length

  useEffect(() => {
    if (!initialActivities) {
      fetchActivities()
    }
  }, [initialActivities])

  const fetchActivities = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/activities?published=true')
      if (response.ok) {
        const data = await response.json()
        setActivities(data)
      }
    } catch (error) {
      console.error('Error fetching activities:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredActivities = activities.filter((activity) => {
    const matchesSearch =
      activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.description.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesFilter =
      selectedFilters.length === 0 ||
      selectedFilters.includes(activity.activityType)

    return matchesSearch && matchesFilter
  })

  const toggleFilter = (filter: string) => {
    setSelectedFilters((prev) =>
      prev.includes(filter)
        ? prev.filter((f) => f !== filter)
        : [...prev, filter]
    )
  }

  // Separate activities by status
  const dueSoonActivities = filteredActivities.filter((a) => {
    const progress = a.userProgress?.[0]
    return progress?.status !== 'COMPLETED'
  }).slice(0, 3)

  const newActivities = filteredActivities.filter((a) => {
    const progress = a.userProgress?.[0]
    return !progress || progress.status === 'ASSIGNED'
  })

  const completedActivities = filteredActivities.filter(
    (a) => a.userProgress?.[0]?.status === 'COMPLETED'
  )

  const getActivityStatus = (activity: Activity) => {
    const progress = activity.userProgress?.[0]
    if (!progress) return 'new'
    if (progress.status === 'COMPLETED') return 'completed'
    if (progress.status === 'IN_PROGRESS') return 'in_progress'
    return 'assigned'
  }

  const getProgressPercentage = (activity: Activity) => {
    const progress = activity.userProgress?.[0]
    if (!progress || progress.status === 'ASSIGNED') return 0
    if (progress.status === 'COMPLETED') return 100
    return 45 // Mock progress for in_progress
  }

  // Función para iniciar una actividad
  const handleStartActivity = (activity: Activity) => {
    setSelectedActivity(activity)
    setActivityDialogOpen(true)
  }

  // Función cuando se completa una actividad
  const handleActivityComplete = async (score: number, totalQuestions: number) => {
    if (!selectedActivity || !session?.user?.id) return

    try {
      // Actualizar progreso en el servidor
      await fetch('/api/activities/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityId: selectedActivity.id,
          status: 'COMPLETED',
          score: Math.round((score / totalQuestions) * 100),
        }),
      })

      // Actualizar estado local
      setActivities((prev) =>
        prev.map((a) =>
          a.id === selectedActivity.id
            ? {
                ...a,
                userProgress: [
                  {
                    status: 'COMPLETED',
                    score: Math.round((score / totalQuestions) * 100),
                    completedAt: new Date().toISOString(),
                  },
                ],
              }
            : a
        )
      )

      // Cerrar el diálogo
      setActivityDialogOpen(false)
      setSelectedActivity(null)
    } catch (error) {
      console.error('Error updating activity progress:', error)
    }
  }

  // Función para cerrar el diálogo de actividad
  const handleCloseActivity = () => {
    setActivityDialogOpen(false)
    setSelectedActivity(null)
  }

  // Cargar racha del usuario
  useEffect(() => {
    const fetchStreak = async () => {
      if (!session?.user?.id) return
      try {
        const response = await fetch('/api/user/streak')
        if (response.ok) {
          const data = await response.json()
          setUserStreak(data.currentStreak || 0)
        }
      } catch (error) {
        console.error('Error fetching streak:', error)
      }
    }
    fetchStreak()
  }, [session?.user?.id])

  return (
    <div className="flex h-full w-full flex-row">
      {/* Sidebar */}
      <aside className="hidden w-72 flex-col justify-between border-r border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:flex">
        <div className="flex flex-col gap-8">
          {/* User Profile */}
          {session?.user && (
            <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <div
                className="bg-center bg-no-repeat bg-cover rounded-full size-12 shadow-sm bg-primary/20"
                style={{
                  backgroundImage: session.user.image
                    ? `url("${session.user.image}")`
                    : undefined,
                }}
              >
                {!session.user.image && (
                  <div className="size-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                    {session.user.name?.[0] || 'U'}
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <h1 className="text-slate-900 dark:text-white text-base font-bold leading-tight">
                  {session.user.name}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-normal">
                  Estudiante
                </p>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider pl-4">
              Tipo de Actividad
            </p>
            {['GRAMMAR', 'VOCABULARY', 'READING', 'LISTENING', 'SPEAKING', 'WRITING'].map((filter) => (
              <label
                key={filter}
                className="flex items-center gap-3 px-4 cursor-pointer group"
              >
                <Checkbox
                  checked={selectedFilters.includes(filter)}
                  onCheckedChange={() => toggleFilter(filter)}
                />
                <span className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  {TYPE_ICONS[filter]}
                  {TYPE_LABELS[filter]}
                </span>
              </label>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex h-full flex-1 flex-col overflow-y-auto bg-slate-50 dark:bg-slate-950 relative">
        {/* Search Header */}
        <header className="sticky top-0 z-20 flex items-center justify-between bg-slate-50/95 px-8 py-5 backdrop-blur-sm dark:bg-slate-950/95 border-b border-transparent">
          <div className="w-full max-w-xl">
            <div className="flex h-12 w-full items-stretch rounded-xl bg-white shadow-sm ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-primary dark:bg-slate-900 dark:ring-slate-700">
              <div className="flex items-center justify-center rounded-l-xl bg-transparent pl-4 text-slate-400">
                <Search className="h-5 w-5" />
              </div>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar actividades por título o etiqueta..."
                className="flex h-full min-w-0 flex-1 border-none bg-transparent px-4 pl-2 text-base focus:ring-0"
              />
            </div>
          </div>
        </header>

        <div className="flex flex-col gap-8 px-8 pb-12 pt-2">
          {/* Page Heading */}
          <div className="flex flex-wrap justify-between gap-4">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                Actividades
              </h1>
              <p className="text-base text-slate-500 dark:text-slate-400">
                Sigue tu progreso y completa tus actividades de práctica de idiomas.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-500">Racha Actual:</span>
              <span className="flex items-center gap-1 text-sm font-bold text-orange-500">
                <Flame className="h-4 w-4" /> {userStreak} Días
              </span>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-transform hover:-translate-y-1 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Vence Hoy
                </p>
                <div className="flex size-8 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-900/20">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </div>
              <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {dueToday}
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-transform hover:-translate-y-1 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Pendientes
                </p>
                <div className="flex size-8 items-center justify-center rounded-full bg-orange-50 text-orange-500 dark:bg-orange-900/20">
                  <Clock className="h-5 w-5" />
                </div>
              </div>
              <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {pending}
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-transform hover:-translate-y-1 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Completadas
                </p>
                <div className="flex size-8 items-center justify-center rounded-full bg-green-50 text-green-500 dark:bg-green-900/20">
                  <CheckCircle className="h-5 w-5" />
                </div>
              </div>
              <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {completed}
              </p>
            </div>
          </div>

          {/* Due Soon Section */}
          {dueSoonActivities.length > 0 && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2 dark:border-slate-800">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <h2 className="text-xl font-bold leading-tight text-slate-900 dark:text-white">
                  Próximas a Vencer
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {dueSoonActivities.map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    status={getActivityStatus(activity)}
                    progress={getProgressPercentage(activity)}
                    onStart={() => handleStartActivity(activity)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* New Assignments Section */}
          {newActivities.length > 0 && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2 dark:border-slate-800">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold leading-tight text-slate-900 dark:text-white">
                  Nuevas Actividades
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {newActivities.slice(0, 6).map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    status="new"
                    isNew
                    onStart={() => handleStartActivity(activity)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed Section */}
          {completedActivities.length > 0 && (
            <div className="mt-4 flex flex-col gap-4 opacity-75">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2 dark:border-slate-800">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h2 className="text-xl font-bold leading-tight text-slate-900 dark:text-white">
                  Completadas Recientemente
                </h2>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                {completedActivities.slice(0, 3).map((activity) => (
                  <div
                    key={activity.id}
                    className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 border-b last:border-b-0 border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-4 w-full">
                      <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-full bg-green-50 text-green-600 dark:bg-green-900/20">
                        <CheckCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {activity.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Completada • Puntuación: {activity.userProgress?.[0]?.score || 0}%
                        </p>
                      </div>
                    </div>
                    <Button variant="link" className="text-sm text-primary">
                      Ver Resultado
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredActivities.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="size-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <Search className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                No se encontraron actividades
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Intenta ajustar tus filtros o términos de búsqueda.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Activity Dialog */}
      <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          {selectedActivity && (
            <ActivityRenderer
              activity={{
                id: selectedActivity.id,
                title: selectedActivity.title,
                description: selectedActivity.description,
                questions: (selectedActivity.activityData?.questions as Array<{
                  id: string
                  type: 'multiple_choice' | 'fill_blanks' | 'matching_pairs' | 'sentence_unscramble'
                  order: number
                  questionText?: string
                  options?: { id: string; text: string; isCorrect: boolean }[]
                  sentenceWithBlanks?: string
                  blanks?: { id: string; answer: string }[]
                  pairs?: { id: string; left: string; right: string }[]
                  correctSentence?: string
                  scrambledWords?: string[]
                }>)?.map(q => ({
                  ...q,
                  scrambledWords: q.scrambledWords?.map((word, index) => ({
                    id: `word-${Date.now()}-${index}`,
                    text: word,
                    originalIndex: index
                  }))
                })) || [],
                difficulty: selectedActivity.level === 1 ? 'beginner' : selectedActivity.level === 2 ? 'intermediate' : 'advanced',
                points: selectedActivity.points,
              }}
              onComplete={handleActivityComplete}
              onClose={handleCloseActivity}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Activity Card Component
function ActivityCard({
  activity,
  status,
  progress = 0,
  isNew = false,
  onStart,
}: {
  activity: Activity
  status: string
  progress?: number
  isNew?: boolean
  onStart?: () => void
}) {
  const difficulty = DIFFICULTY_LABELS[activity.level] || DIFFICULTY_LABELS[1]
  const typeIcon = TYPE_ICONS[activity.activityType] || <FileText className="h-6 w-6 text-blue-500" />
  const tags = activity.activityData?.tags || []

  return (
    <div className="group relative flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-primary/50 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary/50">
      <div>
        <div className="mb-3 flex items-start justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                {activity.title}
              </h3>
              {isNew && (
                <span className="h-2 w-2 rounded-full bg-primary" />
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <span
                className={cn(
                  'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset',
                  difficulty.color
                )}
              >
                {difficulty.label}
              </span>
              {tags.slice(0, 1).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20">
            {typeIcon}
          </div>
        </div>
        <p className="line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
          {activity.description}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Progress Bar (only for in_progress) */}
        {status === 'in_progress' && (
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-medium text-slate-500 dark:text-slate-500">
              <span>En Progreso</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Calendar className="h-4 w-4" />
            <span>{activity.duration} min</span>
          </div>
          <Button
            variant={status === 'in_progress' ? 'default' : 'outline'}
            size="sm"
            className={cn(
              status === 'in_progress' && 'bg-primary hover:bg-primary/90'
            )}
            onClick={onStart}
          >
            {status === 'in_progress' ? 'Continuar' : 'Iniciar Actividad'}
          </Button>
        </div>
      </div>
    </div>
  )
}
