'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Play, Save, Loader2, GraduationCap } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ActivitySettingsSidebar } from './activity-settings-sidebar'
import { QuestionBlock } from './question-block'
import {
  ActivityQuestion,
  ActivitySettings,
  QuestionType,
  DEFAULT_ACTIVITY_SETTINGS,
  createDefaultQuestion,
  QUESTION_TYPES,
} from './types'

interface ActivityBuilderProps {
  mode: 'create' | 'edit'
  activityId?: string
  initialData?: {
    title: string
    description: string
    questions: ActivityQuestion[]
    settings: ActivitySettings
  }
}

export function ActivityBuilder({ mode, activityId, initialData }: ActivityBuilderProps) {
  const router = useRouter()
  const { data: session } = useSession()

  // Activity data
  const [title, setTitle] = useState(initialData?.title || '')
  const [questions, setQuestions] = useState<ActivityQuestion[]>(
    initialData?.questions || []
  )
  const [settings, setSettings] = useState<ActivitySettings>(
    initialData?.settings || DEFAULT_ACTIVITY_SETTINGS
  )

  // UI State
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Add a new question
  const handleAddQuestion = useCallback((type: QuestionType = 'multiple_choice') => {
    const newQuestion = createDefaultQuestion(type, questions.length)
    setQuestions((prev) => [...prev, newQuestion])
  }, [questions.length])

  // Update a question
  const handleUpdateQuestion = useCallback((updatedQuestion: ActivityQuestion) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === updatedQuestion.id ? updatedQuestion : q))
    )
  }, [])

  // Delete a question
  const handleDeleteQuestion = useCallback((questionId: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== questionId))
  }, [])

  // Duplicate a question
  const handleDuplicateQuestion = useCallback((question: ActivityQuestion) => {
    const duplicated: ActivityQuestion = {
      ...question,
      id: `q-${Date.now()}-dup`,
      order: questions.length,
    }
    setQuestions((prev) => [...prev, duplicated])
  }, [questions.length])

  // Change question type
  const handleTypeChange = useCallback((questionId: string, newType: QuestionType) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === questionId) {
          return createDefaultQuestion(newType, q.order)
        }
        return q
      })
    )
  }, [])

  // Save activity
  const handleSave = async (publish: boolean = false) => {
    if (!title.trim()) {
      toast.error('Por favor, ingresa un nombre para la actividad')
      return
    }

    if (questions.length === 0) {
      toast.error('Por favor, agrega al menos una pregunta')
      return
    }

    setIsSaving(true)

    try {
      const activityData = {
        title,
        description: settings.description,
        activityType: 'VOCABULARY', // Default type
        level: settings.difficulty === 'beginner' ? 1 : settings.difficulty === 'intermediate' ? 2 : 3,
        points: questions.length * 10,
        duration: Math.max(5, questions.length * 2),
        isPublished: publish,
        tags: settings.tags,
        questions: questions.map((q, index) => ({
          ...q,
          order: index,
        })),
        createdById: session?.user?.id,
      }

      const response = await fetch(
        mode === 'create' ? '/api/activities' : `/api/activities/${activityId}`,
        {
          method: mode === 'create' ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(activityData),
        }
      )

      if (!response.ok) {
        throw new Error('Error al guardar la actividad')
      }

      setLastSaved(new Date())
      toast.success(
        publish
          ? 'Actividad publicada exitosamente'
          : mode === 'create'
            ? 'Actividad creada exitosamente'
            : 'Actividad actualizada exitosamente'
      )

      router.push('/admin/activities')
    } catch (error) {
      console.error('Error saving activity:', error)
      toast.error('Error al guardar la actividad')
    } finally {
      setIsSaving(false)
    }
  }

  const formatLastSaved = () => {
    if (!lastSaved) return 'Borrador'
    const diff = Math.floor((Date.now() - lastSaved.getTime()) / 60000)
    if (diff < 1) return 'Guardado hace un momento'
    return `Guardado hace ${diff} min`
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10 text-primary">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight tracking-tight text-slate-900 dark:text-white">
                Constructor de Actividades
              </h1>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>{formatLastSaved()}</span>
                <span className="size-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                <span>{questions.length} pregunta(s)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="size-10 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Vista Previa"
            >
              <Play className="h-5 w-5" />
            </Button>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

            <Button
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={isSaving}
              className="hidden sm:flex"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar Borrador
            </Button>

            <Button
              onClick={() => handleSave(true)}
              disabled={isSaving}
              className="bg-primary hover:bg-primary/90 text-white shadow-md shadow-blue-500/20"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Publicar Actividad
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Sidebar: Settings */}
          <ActivitySettingsSidebar
            settings={settings}
            onUpdateSettings={setSettings}
          />

          {/* Main Canvas: Question Builder */}
          <main className="lg:col-span-8 xl:col-span-9 space-y-6 order-1 lg:order-2">
            {/* Activity Title */}
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Nombre de la Actividad
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Actividad sin título"
                className="w-full text-2xl lg:text-3xl font-bold border-0 border-b-2 border-slate-100 dark:border-slate-800 focus:border-primary focus:ring-0 px-0 bg-transparent placeholder:text-slate-300 dark:placeholder:text-slate-700 transition-colors h-auto py-2"
              />
            </div>

            {/* Questions List */}
            <div className="space-y-6">
              {questions.map((question, index) => (
                <QuestionBlock
                  key={question.id}
                  question={question}
                  index={index}
                  onUpdate={handleUpdateQuestion}
                  onDelete={() => handleDeleteQuestion(question.id)}
                  onDuplicate={() => handleDuplicateQuestion(question)}
                  onTypeChange={(type) => handleTypeChange(question.id, type)}
                />
              ))}
            </div>

            {/* Add Block Action */}
            <div className="py-4">
              <button
                type="button"
                onClick={() => handleAddQuestion('multiple_choice')}
                className="w-full group relative flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:border-primary hover:bg-primary/5 transition-all"
              >
                <div className="size-12 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-primary group-hover:text-white text-slate-400 flex items-center justify-center mb-3 transition-colors">
                  <span className="text-3xl">+</span>
                </div>
                <h3 className="text-base font-bold text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">
                  Agregar Bloque de Pregunta
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {QUESTION_TYPES.map((t) => t.label).join(', ')}, etc.
                </p>
              </button>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
