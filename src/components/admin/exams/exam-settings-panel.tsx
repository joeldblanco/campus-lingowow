'use client'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { ExamTypeValue } from '@/types/exam'
import { ClipboardCheck, GraduationCap, Stethoscope, Dumbbell } from 'lucide-react'

interface CourseForExam {
  id: string
  title: string
  language: string
  modules: Array<{
    id: string
    title: string
    level: string
    lessons: Array<{
      id: string
      title: string
    }>
  }>
}

interface ExamSettingsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  timeLimit: number
  setTimeLimit: (value: number) => void
  passingScore: number
  setPassingScore: (value: number) => void
  maxAttempts: number
  setMaxAttempts: (value: number) => void
  isBlocking: boolean
  setIsBlocking: (value: boolean) => void
  isOptional: boolean
  setIsOptional: (value: boolean) => void
  shuffleQuestions: boolean
  setShuffleQuestions: (value: boolean) => void
  shuffleOptions: boolean
  setShuffleOptions: (value: boolean) => void
  showResults: boolean
  setShowResults: (value: boolean) => void
  allowReview: boolean
  setAllowReview: (value: boolean) => void
  isPublished: boolean
  setIsPublished: (value: boolean) => void
  examType: ExamTypeValue
  setExamType: (value: ExamTypeValue) => void
  isGuestAccessible: boolean
  setIsGuestAccessible: (value: boolean) => void
  targetLanguage: string
  setTargetLanguage: (value: string) => void
  courseId: string
  setCourseId: (value: string) => void
  moduleId: string
  setModuleId: (value: string) => void
  lessonId: string
  setLessonId: (value: string) => void
  courses: CourseForExam[]
}

const EXAM_TYPE_OPTIONS: { value: ExamTypeValue; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'COURSE_EXAM', label: 'Examen de Curso', icon: <GraduationCap className="h-4 w-4" />, description: 'Examen asociado a un curso específico' },
  { value: 'PLACEMENT_TEST', label: 'Test de Clasificación', icon: <ClipboardCheck className="h-4 w-4" />, description: 'Determina el nivel del estudiante' },
  { value: 'DIAGNOSTIC', label: 'Examen Diagnóstico', icon: <Stethoscope className="h-4 w-4" />, description: 'Evalúa conocimientos previos' },
  { value: 'PRACTICE', label: 'Práctica Libre', icon: <Dumbbell className="h-4 w-4" />, description: 'Examen de práctica sin restricciones' },
]

const TARGET_LANGUAGES = [
  { value: 'en', label: '🇺🇸 Inglés' },
  { value: 'es', label: '🇪🇸 Español' },
  { value: 'fr', label: '🇫🇷 Francés' },
  { value: 'de', label: '🇩🇪 Alemán' },
  { value: 'pt', label: '🇧🇷 Portugués' },
  { value: 'it', label: '🇮🇹 Italiano' },
]

export function ExamSettingsPanel({
  open,
  onOpenChange,
  timeLimit,
  setTimeLimit,
  passingScore,
  setPassingScore,
  maxAttempts,
  setMaxAttempts,
  isBlocking,
  setIsBlocking,
  isOptional,
  setIsOptional,
  shuffleQuestions,
  setShuffleQuestions,
  shuffleOptions,
  setShuffleOptions,
  showResults,
  setShowResults,
  allowReview,
  setAllowReview,
  isPublished,
  setIsPublished,
  examType,
  setExamType,
  isGuestAccessible,
  setIsGuestAccessible,
  targetLanguage,
  setTargetLanguage,
  courseId,
  setCourseId,
  moduleId,
  setModuleId,
  lessonId,
  setLessonId,
  courses,
}: ExamSettingsPanelProps) {
  const selectedCourse = courses.find((c) => c.id === courseId)
  const availableModules = selectedCourse?.modules || []
  const selectedModule = availableModules.find((m) => m.id === moduleId)
  const availableLessons = selectedModule?.lessons || []
  
  const isPlacementTest = examType === 'PLACEMENT_TEST'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Configuración del examen</SheetTitle>
          <SheetDescription>
            Ajusta los parámetros y opciones del examen
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Exam Type */}
          <div className="space-y-4">
            <h3 className="font-semibold">Tipo de examen</h3>
            
            <div className="space-y-2">
              <Label htmlFor="exam-type">Tipo</Label>
              <Select
                value={examType}
                onValueChange={(value) => setExamType(value as ExamTypeValue)}
              >
                <SelectTrigger id="exam-type">
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {EXAM_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        {option.icon}
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {EXAM_TYPE_OPTIONS.find(o => o.value === examType)?.description}
              </p>
            </div>

            {/* Placement Test specific options */}
            {isPlacementTest && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="target-language">Idioma objetivo</Label>
                  <Select
                    value={targetLanguage}
                    onValueChange={setTargetLanguage}
                  >
                    <SelectTrigger id="target-language">
                      <SelectValue placeholder="Seleccionar idioma" />
                    </SelectTrigger>
                    <SelectContent>
                      {TARGET_LANGUAGES.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="guest-accessible">Acceso para invitados</Label>
                    <p className="text-xs text-muted-foreground">
                      Usuarios GUEST pueden tomar este test
                    </p>
                  </div>
                  <Switch
                    id="guest-accessible"
                    checked={isGuestAccessible}
                    onCheckedChange={setIsGuestAccessible}
                  />
                </div>

                <Badge variant="outline" className="text-xs">
                  Los usuarios solo pueden tomar 1 placement test por idioma
                </Badge>
              </>
            )}
          </div>

          <Separator />

          {/* Basic Settings */}
          <div className="space-y-4">
            <h3 className="font-semibold">Configuración básica</h3>

            <div className="space-y-2">
              <Label htmlFor="time-limit">Tiempo límite (minutos)</Label>
              <Input
                id="time-limit"
                type="number"
                min="1"
                value={timeLimit}
                onChange={(e) => setTimeLimit(parseInt(e.target.value) || 60)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="passing-score">Puntaje de aprobación (%)</Label>
              <Input
                id="passing-score"
                type="number"
                min="0"
                max="100"
                value={passingScore}
                onChange={(e) => setPassingScore(parseInt(e.target.value) || 70)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-attempts">Intentos máximos</Label>
              <Input
                id="max-attempts"
                type="number"
                min="1"
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(parseInt(e.target.value) || 3)}
              />
            </div>
          </div>

          <Separator />

          {/* Course Assignment */}
          <div className="space-y-4">
            <h3 className="font-semibold">Asignación a curso</h3>

            <div className="space-y-2">
              <Label htmlFor="course">Curso</Label>
              <Select
                value={courseId}
                onValueChange={(value) => {
                  setCourseId(value)
                  setModuleId('')
                  setLessonId('')
                }}
              >
                <SelectTrigger id="course">
                  <SelectValue placeholder="Seleccionar curso" />
                </SelectTrigger>
                <SelectContent>
                  {courses.length === 0 ? (
                    <SelectItem value="no-courses" disabled>
                      No hay cursos disponibles
                    </SelectItem>
                  ) : (
                    courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title} ({course.language})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="module">Módulo (opcional)</Label>
              <Select
                value={moduleId}
                onValueChange={(value) => {
                  setModuleId(value)
                  setLessonId('')
                }}
                disabled={!courseId}
              >
                <SelectTrigger id="module">
                  <SelectValue placeholder="Seleccionar módulo" />
                </SelectTrigger>
                <SelectContent>
                  {availableModules.length === 0 ? (
                    <SelectItem value="no-modules" disabled>
                      No hay módulos disponibles
                    </SelectItem>
                  ) : (
                    availableModules.map((module) => (
                      <SelectItem key={module.id} value={module.id}>
                        {module.title} (Level {module.level})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lesson">Lección (opcional)</Label>
              <Select
                value={lessonId}
                onValueChange={setLessonId}
                disabled={!moduleId}
              >
                <SelectTrigger id="lesson">
                  <SelectValue placeholder="Seleccionar lección" />
                </SelectTrigger>
                <SelectContent>
                  {availableLessons.length === 0 ? (
                    <SelectItem value="no-lessons" disabled>
                      No hay lecciones disponibles
                    </SelectItem>
                  ) : (
                    availableLessons.map((lesson) => (
                      <SelectItem key={lesson.id} value={lesson.id}>
                        {lesson.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Exam Behavior */}
          <div className="space-y-4">
            <h3 className="font-semibold">Comportamiento del examen</h3>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="blocking">Examen bloqueante</Label>
                <p className="text-xs text-muted-foreground">
                  El estudiante debe aprobar para continuar
                </p>
              </div>
              <Switch
                id="blocking"
                checked={isBlocking}
                onCheckedChange={setIsBlocking}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="optional">Examen opcional</Label>
                <p className="text-xs text-muted-foreground">
                  El estudiante puede omitir este examen
                </p>
              </div>
              <Switch
                id="optional"
                checked={isOptional}
                onCheckedChange={setIsOptional}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="shuffle-questions">Mezclar preguntas</Label>
                <p className="text-xs text-muted-foreground">
                  Las preguntas aparecerán en orden aleatorio
                </p>
              </div>
              <Switch
                id="shuffle-questions"
                checked={shuffleQuestions}
                onCheckedChange={setShuffleQuestions}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="shuffle-options">Mezclar opciones</Label>
                <p className="text-xs text-muted-foreground">
                  Las opciones de respuesta se mezclarán
                </p>
              </div>
              <Switch
                id="shuffle-options"
                checked={shuffleOptions}
                onCheckedChange={setShuffleOptions}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="show-results">Mostrar resultados</Label>
                <p className="text-xs text-muted-foreground">
                  Mostrar calificación al finalizar
                </p>
              </div>
              <Switch
                id="show-results"
                checked={showResults}
                onCheckedChange={setShowResults}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="allow-review">Permitir revisión</Label>
                <p className="text-xs text-muted-foreground">
                  El estudiante puede revisar sus respuestas
                </p>
              </div>
              <Switch
                id="allow-review"
                checked={allowReview}
                onCheckedChange={setAllowReview}
              />
            </div>
          </div>

          <Separator />

          {/* Publishing */}
          <div className="space-y-4">
            <h3 className="font-semibold">Publicación</h3>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="published">Publicar examen</Label>
                <p className="text-xs text-muted-foreground">
                  Hacer visible para los estudiantes
                </p>
              </div>
              <Switch
                id="published"
                checked={isPublished}
                onCheckedChange={setIsPublished}
              />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
