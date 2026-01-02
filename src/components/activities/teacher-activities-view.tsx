'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
  Search,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  BarChart3,
  Tag,
  Layers,
  UserPlus,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Activity {
  id: string
  title: string
  description: string
  level: number
  activityType: string
  points: number
  duration: number
  isPublished: boolean
  activityData: {
    tags?: string[]
    questions?: unknown[]
  }
  createdAt: string
}

interface Student {
  id: string
  name: string
  email: string
  image?: string
}

const DIFFICULTY_CONFIG: Record<number, { label: string; color: string; bgColor: string }> = {
  1: {
    label: 'Principiante',
    color: 'text-green-800 dark:text-green-400',
    bgColor: 'bg-green-100 border-green-200 dark:bg-green-900/30',
  },
  2: {
    label: 'Intermedio',
    color: 'text-yellow-800 dark:text-yellow-500',
    bgColor: 'bg-yellow-100 border-yellow-200 dark:bg-yellow-900/30',
  },
  3: {
    label: 'Avanzado',
    color: 'text-red-800 dark:text-red-400',
    bgColor: 'bg-red-100 border-red-200 dark:bg-red-900/30',
  },
}

const GRADIENT_COLORS = [
  'from-blue-50 to-indigo-50',
  'from-emerald-50 to-teal-50',
  'from-orange-50 to-red-50',
  'from-purple-50 to-pink-50',
  'from-sky-50 to-cyan-50',
  'from-lime-50 to-green-50',
]

const ICON_COLORS = [
  'text-primary',
  'text-emerald-600',
  'text-orange-600',
  'text-purple-600',
  'text-sky-600',
  'text-lime-600',
]

export function TeacherActivitiesView() {
  const { data: session } = useSession()
  const [activities, setActivities] = useState<Activity[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedDifficulties, setSelectedDifficulties] = useState<number[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])

  const itemsPerPage = 6

  useEffect(() => {
    fetchActivities()
    fetchStudents()
  }, [])

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

  const fetchStudents = async () => {
    try {
      // Usar endpoint específico para profesores que trae solo sus estudiantes
      const response = await fetch('/api/teacher/students')
      if (response.ok) {
        const data = await response.json()
        setStudents(data.students || [])
      }
    } catch (error) {
      console.error('Error fetching students:', error)
    }
  }

  const handleSearch = () => {
    const newFilters: string[] = []
    if (searchQuery) {
      newFilters.push(`"${searchQuery}"`)
    }
    selectedDifficulties.forEach((d) => {
      newFilters.push(DIFFICULTY_CONFIG[d]?.label || '')
    })
    setActiveFilters(newFilters)
  }

  const removeFilter = (filter: string) => {
    setActiveFilters((prev) => prev.filter((f) => f !== filter))
    if (filter.startsWith('"')) {
      setSearchQuery('')
    }
  }

  const clearAllFilters = () => {
    setActiveFilters([])
    setSearchQuery('')
    setSelectedDifficulties([])
    setSelectedTypes([])
  }

  const toggleDifficulty = (level: number) => {
    setSelectedDifficulties((prev) =>
      prev.includes(level) ? prev.filter((d) => d !== level) : [...prev, level]
    )
  }

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  const filteredActivities = activities.filter((activity) => {
    const matchesSearch =
      !searchQuery ||
      activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.description.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesDifficulty =
      selectedDifficulties.length === 0 ||
      selectedDifficulties.includes(activity.level)

    const matchesType =
      selectedTypes.length === 0 || selectedTypes.includes(activity.activityType)

    return matchesSearch && matchesDifficulty && matchesType
  })

  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage)
  const paginatedActivities = filteredActivities.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleAssign = async () => {
    if (!selectedActivity || selectedStudents.length === 0) {
      toast.error('Selecciona al menos un estudiante')
      return
    }

    try {
      const response = await fetch('/api/activities/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityId: selectedActivity.id,
          studentIds: selectedStudents,
          assignedBy: session?.user?.id,
        }),
      })

      if (response.ok) {
        toast.success(`Actividad asignada a ${selectedStudents.length} estudiante(s)`)
        setAssignDialogOpen(false)
        setSelectedStudents([])
        setSelectedActivity(null)
      } else {
        toast.error('Error al asignar la actividad')
      }
    } catch (error) {
      console.error('Error assigning activity:', error)
      toast.error('Error al asignar la actividad')
    }
  }

  const openAssignDialog = (activity: Activity) => {
    setSelectedActivity(activity)
    setAssignDialogOpen(true)
  }

  return (
    <div className="flex h-full w-full flex-row bg-slate-50 dark:bg-slate-950">
      {/* Sidebar Filters */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col overflow-y-auto hidden lg:flex flex-none dark:bg-slate-900 dark:border-slate-800">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-slate-900 dark:text-white text-lg font-bold">Filtros</h1>
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
        </div>

        <div className="p-4 flex flex-col gap-4">
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
                    {DIFFICULTY_CONFIG[level]?.label} (
                    {level === 1 ? 'A1-A2' : level === 2 ? 'B1-B2' : 'C1-C2'})
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
              {['Completar espacios', 'Emparejar', 'Opción Múltiple', 'Lectura y Quiz'].map(
                (type) => (
                  <label
                    key={type}
                    className="flex items-center gap-3 cursor-pointer group/item"
                  >
                    <Checkbox
                      checked={selectedTypes.includes(type)}
                      onCheckedChange={() => toggleType(type)}
                    />
                    <span className="text-sm text-slate-500 dark:text-slate-400 group-hover/item:text-slate-900 dark:group-hover/item:text-white">
                      {type}
                    </span>
                  </label>
                )
              )}
            </div>
          </details>

          {/* Tags Filter */}
          <details className="group rounded-lg border border-slate-200 bg-slate-50 open:bg-white open:ring-1 open:ring-primary/20 transition-all dark:border-slate-700 dark:bg-slate-800 dark:open:bg-slate-900">
            <summary className="flex cursor-pointer items-center justify-between px-4 py-3 select-none">
              <span className="text-slate-900 dark:text-white text-sm font-semibold flex items-center gap-2">
                <Tag className="h-5 w-5 text-slate-500" />
                Etiquetas
              </span>
            </summary>
            <div className="px-4 pb-4 pt-1 flex flex-col gap-2">
              <Input
                placeholder="Buscar etiquetas..."
                className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 mb-2"
              />
              <div className="flex flex-wrap gap-2">
                {['Gramática', 'Vocabulario', 'Verbos'].map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-primary/10 hover:text-primary cursor-pointer"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </details>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6 md:p-10 scroll-smooth">
        <div className="max-w-7xl mx-auto flex flex-col gap-6">
          {/* Page Header & Search */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="flex flex-col gap-2">
                <h1 className="text-slate-900 dark:text-white text-3xl md:text-4xl font-black tracking-tight">
                  Biblioteca de Actividades
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-base font-normal">
                  Explora y asigna ejercicios de práctica a tus estudiantes.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  className="flex lg:hidden items-center gap-2"
                >
                  <Filter className="h-5 w-5" />
                  Filtros
                </Button>
                <div className="text-sm font-medium text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-700">
                  {filteredActivities.length} Resultados
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Buscar por tema, punto gramatical o vocabulario (ej: 'Pasado Simple', 'Comida')..."
                className="w-full h-14 pl-12 pr-4 rounded-xl border-none bg-white shadow-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-primary text-slate-900 dark:bg-slate-900 dark:ring-slate-700 dark:text-white"
              />
              <Button
                onClick={handleSearch}
                className="absolute inset-y-2 right-2 px-4 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-lg"
              >
                Buscar
              </Button>
            </div>

            {/* Active Filters */}
            {activeFilters.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide mr-2">
                  Filtros Activos:
                </span>
                {activeFilters.map((filter) => (
                  <div
                    key={filter}
                    className="flex items-center gap-1.5 px-3 py-1 bg-white border border-primary/20 rounded-full text-sm text-primary font-medium shadow-sm dark:bg-slate-900"
                  >
                    {filter}
                    <button
                      onClick={() => removeFilter(filter)}
                      className="hover:bg-primary/10 rounded-full p-0.5"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={clearAllFilters}
                  className="text-xs font-medium text-slate-500 hover:text-primary ml-2 underline decoration-dashed"
                >
                  Limpiar todo
                </button>
              </div>
            )}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pt-2">
            {paginatedActivities.map((activity, index) => {
              const colorIndex = index % GRADIENT_COLORS.length
              const difficulty = DIFFICULTY_CONFIG[activity.level] || DIFFICULTY_CONFIG[1]
              const tags = activity.activityData?.tags || []

              return (
                <article
                  key={activity.id}
                  className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-primary/30 transition-all flex flex-col overflow-hidden dark:bg-slate-900 dark:border-slate-800"
                >
                  <div
                    className={cn(
                      'h-32 flex items-center justify-center relative overflow-hidden bg-gradient-to-r',
                      GRADIENT_COLORS[colorIndex]
                    )}
                  >
                    <div
                      className="absolute inset-0 opacity-10"
                      style={{
                        backgroundImage:
                          'radial-gradient(currentColor 1px, transparent 1px)',
                        backgroundSize: '16px 16px',
                      }}
                    />
                    <div className="bg-white p-3 rounded-full shadow-sm z-10">
                      <span className={cn('text-3xl', ICON_COLORS[colorIndex])}>
                        📚
                      </span>
                    </div>
                    <div
                      className={cn(
                        'absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full border shadow-sm',
                        difficulty.bgColor,
                        difficulty.color
                      )}
                    >
                      {difficulty.label}
                    </div>
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight group-hover:text-primary transition-colors">
                        {activity.title}
                      </h3>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-4 flex-1">
                      {activity.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-medium rounded border border-slate-200 dark:border-slate-700"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-3 mt-auto">
                      <Button
                        onClick={() => openAssignDialog(activity)}
                        className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-4 rounded-lg text-sm shadow-sm shadow-blue-200"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Asignar
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-10 border-slate-200 dark:border-slate-700"
                        title="Vista Previa"
                      >
                        <Eye className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>

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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center py-8">
              <nav className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="icon"
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        currentPage === page && 'bg-primary text-white shadow-sm'
                      )}
                    >
                      {page}
                    </Button>
                  )
                })}
                {totalPages > 5 && (
                  <>
                    <span className="text-slate-500 px-2">...</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(totalPages)}
                    >
                      {totalPages}
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </nav>
            </div>
          )}
        </div>
      </main>

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar Actividad</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedActivity && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <h4 className="font-semibold text-slate-900 dark:text-white">
                  {selectedActivity.title}
                </h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {selectedActivity.description}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Seleccionar Estudiantes
              </label>
              <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-2">
                {students.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">
                    No hay estudiantes disponibles
                  </p>
                ) : (
                  students.map((student) => (
                    <label
                      key={student.id}
                      className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedStudents.includes(student.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedStudents((prev) => [...prev, student.id])
                          } else {
                            setSelectedStudents((prev) =>
                              prev.filter((id) => id !== student.id)
                            )
                          }
                        }}
                      />
                      <div className="flex items-center gap-2">
                        <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                          {student.name?.[0] || 'U'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            {student.name}
                          </p>
                          <p className="text-xs text-slate-500">{student.email}</p>
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setAssignDialogOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAssign}
                disabled={selectedStudents.length === 0}
                className="flex-1"
              >
                Asignar ({selectedStudents.length})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
