'use client'

import { useState } from 'react'
import { Check, X, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { ActivitySettings, DIFFICULTY_LEVELS, DifficultyLevel } from './types'

interface ActivitySettingsSidebarProps {
  settings: ActivitySettings
  onUpdateSettings: (settings: ActivitySettings) => void
}

export function ActivitySettingsSidebar({
  settings,
  onUpdateSettings,
}: ActivitySettingsSidebarProps) {
  const [tagInput, setTagInput] = useState('')

  const handleDifficultyChange = (difficulty: DifficultyLevel) => {
    onUpdateSettings({ ...settings, difficulty })
  }

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      if (!settings.tags.includes(tagInput.trim())) {
        onUpdateSettings({
          ...settings,
          tags: [...settings.tags, tagInput.trim()],
        })
      }
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdateSettings({
      ...settings,
      tags: settings.tags.filter((tag) => tag !== tagToRemove),
    })
  }

  return (
    <aside className="lg:col-span-4 xl:col-span-3 space-y-6 lg:sticky lg:top-24 order-2 lg:order-1">
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-800">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
          Configuración
        </h3>

        {/* Selector de Dificultad */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
            Nivel de Dificultad
          </label>
          <div className="flex flex-col gap-2">
            {DIFFICULTY_LEVELS.map((level) => (
              <label
                key={level.value}
                className={cn(
                  'relative flex cursor-pointer rounded-lg border p-3 shadow-sm focus:outline-none transition-all',
                  settings.difficulty === level.value
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                )}
              >
                <input
                  type="radio"
                  name="difficulty"
                  value={level.value}
                  checked={settings.difficulty === level.value}
                  onChange={() => handleDifficultyChange(level.value)}
                  className="sr-only"
                />
                <span className="flex flex-1">
                  <span className="flex flex-col">
                    <span className="block text-sm font-medium text-slate-900 dark:text-white">
                      {level.label}
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      {level.sublabel}
                    </span>
                  </span>
                </span>
                {settings.difficulty === level.value && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Input de Etiquetas */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
            Etiquetas
          </label>
          <div className="min-h-[48px] p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex flex-wrap gap-2 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
            {settings.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-primary text-xs font-medium"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-red-500 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
            <Input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="Agregar etiqueta..."
              className="bg-transparent border-none text-sm focus:ring-0 p-0 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 w-full min-w-[80px] flex-1 h-auto"
            />
          </div>
          <p className="text-xs text-slate-500 mt-1.5">
            Presiona Enter para agregar una etiqueta.
          </p>
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
            Descripción
          </label>
          <Textarea
            value={settings.description}
            onChange={(e) =>
              onUpdateSettings({ ...settings, description: e.target.value })
            }
            placeholder="Describe el objetivo de aprendizaje..."
            className="w-full rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:ring-primary focus:border-primary min-h-[120px] resize-y"
          />
        </div>
      </div>

      {/* Tarjeta de Consejos */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-5 border border-blue-100 dark:border-blue-800/50">
        <div className="flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              Consejo
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Mezcla diferentes tipos de preguntas para mantener a los
              estudiantes comprometidos. Intenta agregar pares de emparejamiento
              después de preguntas de opción múltiple.
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
