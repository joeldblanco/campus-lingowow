'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Search, Flame, Clock, CheckCircle, Sparkles, Calendar, BookOpen, Headphones, Mic, PenTool, FileText, BarChart3, Layers, Tag } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { ActivityDialog } from '@/components/activities/activity-dialog'
import { useAutoCloseSidebar } from '@/hooks/use-auto-close-sidebar'

interface Activity {
  id: string
  title: string
  description: string
  level: number
  activityType: string
  points: number
  duration: number
  activityData: {
    readingText?: string
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

const ACTIVITY_TYPES = ['GRAMMAR', 'VOCABULARY', 'READING', 'LISTENING', 'SPEAKING', 'WRITING'] as const

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  VOCABULARY: { label: 'Vocabulario', icon: <FileText className="h-4 w-4 text-blue-500" /> },
  READING: { label: 'Lectura', icon: <BookOpen className="h-4 w-4 text-blue-500" /> },
  LISTENING: { label: 'Escucha', icon: <Headphones className="h-4 w-4 text-blue-500" /> },
  SPEAKING: { label: 'Habla', icon: <Mic className="h-4 w-4 text-blue-500" /> },
  WRITING: { label: 'Escritura', icon: <PenTool className="h-4 w-4 text-blue-500" /> },
  GRAMMAR: { label: 'Gramática', icon: <FileText className="h-4 w-4 text-blue-500" /> },
  PRONUNCIATION: { label: 'Pronunciación', icon: <Mic className="h-4 w-4 text-blue-500" /> },
  COMPREHENSION: { label: 'Comprensión', icon: <BookOpen className="h-4 w-4 text-blue-500" /> },
  MULTIPLE_CHOICE: { label: 'Opción Múltiple', icon: <FileText className="h-4 w-4 text-blue-500" /> },
  FILL_IN_BLANK: { label: 'Completar', icon: <FileText className="h-4 w-4 text-blue-500" /> },
  MATCHING: { label: 'Emparejar', icon: <FileText className="h-4 w-4 text-blue-500" /> },
  ORDERING: { label: 'Ordenar', icon: <FileText className="h-4 w-4 text-blue-500" /> },
  DICTATION: { label: 'Dictado', icon: <PenTool className="h-4 w-4 text-blue-500" /> },
  TRANSLATION: { label: 'Traducción', icon: <FileText className="h-4 w-4 text-blue-500" /> },
  OTHER: { label: 'Otro', icon: <FileText className="h-4 w-4 text-blue-500" /> },
}

export function StudentActivitiesView({ initialActivities }: StudentActivitiesViewProps) {
  const { data: session } = useSession()
  useAutoCloseSidebar() // ← Cierra la sidebar automáticamente
  
  const [activities, setActivities] = useState<Activity[]>(initialActivities || [])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDifficulties, setSelectedDifficulties] = useState<number[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [tagSearchQuery, setTagSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(!initialActivities)
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [activityDialogOpen, setActivityDialogOpen] = useState(false)
  const [userStreak, setUserStreak] = useState(0)

  // Stats
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

    const matchesDifficulty = selectedDifficulties.length === 0 || selectedDifficulties.includes(activity.level)
    
    const matchesType = selectedTypes.length === 0 || selectedTypes.includes(activity.activityType)
    
    const matchesTags = selectedTags.length === 0 || 
      (activity.activityData?.tags?.some(tag => selectedTags.includes(tag)) || false)

    return matchesSearch && matchesDifficulty && matchesType && matchesTags
  })

  // Get all available tags
  const allTags = Array.from(new Set(
    activities.flatMap(a => a.activityData?.tags || [])
  )).sort()

  const filteredTags = allTags.filter(tag =>
    tag.toLowerCase().includes(tagSearchQuery.toLowerCase())
  )

  const toggleDifficulty = (level: number) => {
    setSelectedDifficulties(prev =>
      prev.includes(level)
        ? prev.filter(d => d !== level)
        : [...prev, level]
    )
  }

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const clearAllFilters = () => {
    setSelectedDifficulties([])
    setSelectedTypes([])
    setSelectedTags([])
    setTagSearchQuery('')
  }

  const activeFilters = [
    ...selectedDifficulties.map(d => `Nivel ${d}`),
    ...selectedTypes.map(t => TYPE_CONFIG[t]?.label || t),
    ...selectedTags
  ]

  // Separate activities by status
  const newActivities = filteredActivities.filter((a) => {
    const progress = a.userProgress?.[0]
    return !progress || progress.status === 'ASSIGNED'
  })

  const completedActivities = filteredActivities.filter(
    (a) => a.userProgress?.[0]?.status === 'COMPLETED'
  )

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
            <div className="flex items-center justify-between">
              <h2 className="text-slate-900 dark:text-white text-lg font-bold">Filtros</h2>
              <button
                onClick={clearAllFilters}
                className="text-xs font-medium text-primary hover:text-primary/80"
              >
                Limpiar Todo
              </button>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Refina tus resultados de búsqueda
            </p>

            <div className="flex flex-col gap-4">
              {/* Difficulty Filter */}
              <details
                className="group rounded-lg border border-slate-200 bg-slate-50 open:bg-white open:ring-1 open:ring-primary/20 transition-all dark:border-slate-700 dark:bg-slate-800 dark:open:bg-slate-900"
                open
              >
                <summary className="flex cursor-pointer items-center justify-between px-4 py-3 select-none">
                  <span className="text-slate-900 dark:text-white text-sm font-semibold flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-slate-500" />
                    Dificultad
                  </span>
                </summary>
                <div className="px-4 pb-4 pt-1 flex flex-col gap-2">
                  {[1, 2, 3].map((level) => (
                    <label
                      key={level}
                      className="flex items-center gap-3 cursor-pointer group/item"
                    >
                      <Checkbox
                        checked={selectedDifficulties.includes(level)}
                        onCheckedChange={() => toggleDifficulty(level)}
                      />
                      <span
                        className={cn(
                          'text-sm',
                          selectedDifficulties.includes(level)
                            ? 'text-slate-900 dark:text-white font-medium'
                            : 'text-slate-500 dark:text-slate-400 group-hover/item:text-slate-900 dark:group-hover/item:text-white'
                        )}
                      >
                        {DIFFICULTY_LABELS[level]?.label}
                      </span>
                    </label>
                  ))}
                </div>
              </details>

              {/* Activity Type Filter */}
              <details
                className="group rounded-lg border border-slate-200 bg-slate-50 open:bg-white open:ring-1 open:ring-primary/20 transition-all dark:border-slate-700 dark:bg-slate-800 dark:open:bg-slate-900"
                open
              >
                <summary className="flex cursor-pointer items-center justify-between px-4 py-3 select-none">
                  <span className="text-slate-900 dark:text-white text-sm font-semibold flex items-center gap-2">
                    <Layers className="h-5 w-5 text-slate-500" />
                    Tipo de Actividad
                  </span>
                </summary>
                <div className="px-4 pb-4 pt-1 flex flex-col gap-2">
                  {ACTIVITY_TYPES.map((type) => (
                    <label
                      key={type}
                      className="flex items-center gap-3 cursor-pointer group/item"
                    >
                      <Checkbox
                        checked={selectedTypes.includes(type)}
                        onCheckedChange={() => toggleType(type)}
                      />
                      <span className={cn(
                        'text-sm flex items-center gap-2',
                        selectedTypes.includes(type)
                          ? 'text-slate-900 dark:text-white font-medium'
                          : 'text-slate-500 dark:text-slate-400 group-hover/item:text-slate-900 dark:group-hover/item:text-white'
                      )}>
                        <span>{TYPE_ICONS[type]}</span>
                        {TYPE_CONFIG[type]?.label}
                      </span>
                    </label>
                  ))}
                </div>
              </details>

              {/* Tags Filter */}
              <details className="group rounded-lg border border-slate-200 bg-slate-50 open:bg-white open:ring-1 open:ring-primary/20 transition-all dark:border-slate-700 dark:bg-slate-800 dark:open:bg-slate-900">
                <summary className="flex cursor-pointer items-center justify-between px-4 py-3 select-none">
                  <span className="text-slate-900 dark:text-white text-sm font-semibold flex items-center gap-2">
                    <Tag className="h-5 w-5 text-slate-500" />
                    Etiquetas
                    {selectedTags.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-white rounded-full">
                        {selectedTags.length}
                      </span>
                    )}
                  </span>
                </summary>
                <div className="px-4 pb-4 pt-1 flex flex-col gap-2">
                  <Input
                    value={tagSearchQuery}
                    onChange={(e) => setTagSearchQuery(e.target.value)}
                    placeholder="Buscar etiquetas..."
                    className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 mb-2"
                  />
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {filteredTags.length > 0 ? (
                      filteredTags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className={cn(
                            'px-2 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors',
                            selectedTags.includes(tag)
                              ? 'bg-primary text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-primary/10 hover:text-primary'
                          )}
                        >
                          {tag}
                        </button>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">
                        {allTags.length === 0 ? 'No hay etiquetas disponibles' : 'No se encontraron etiquetas'}
                      </span>
                    )}
                  </div>
                </div>
              </details>
            </div>
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
          {/* Active Filters */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide mr-2">
                Filtros Activos:
              </span>
              {activeFilters.map((filter, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium"
                >
                  {filter}
                  <button
                    onClick={() => {
                      // Remove filter logic would go here
                    }}
                    className="hover:text-primary/80"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
      <ActivityDialog
        open={activityDialogOpen}
        onOpenChange={setActivityDialogOpen}
        activity={selectedActivity}
        onComplete={handleActivityComplete}
        onClose={handleCloseActivity}
      />
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
