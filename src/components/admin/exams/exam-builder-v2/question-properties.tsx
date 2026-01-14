'use client'

import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { FileUpload } from '@/components/ui/file-upload'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { ChevronDown, Music, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { ExamQuestion, QUESTION_TYPE_LABELS } from './types'

interface QuestionPropertiesProps {
  question: ExamQuestion | null
  onUpdate: (updates: Partial<ExamQuestion>) => void
  onClose: () => void
  onDelete?: () => void
}

export function QuestionProperties({
  question,
  onUpdate,
  onClose,
  onDelete,
}: QuestionPropertiesProps) {
  const [hintOpen, setHintOpen] = useState(false)

  if (!question) return null

  const typeLabel = QUESTION_TYPE_LABELS[question.type] || question.type

  return (
    <div className="w-80 border-l bg-background flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Propiedades</h2>
          <p className="text-xs text-muted-foreground">{typeLabel}</p>
        </div>
        <div className="flex items-center gap-1">
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:bg-destructive/10"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          {/* Question Text / Instruction */}
          <div className="space-y-2">
            <Label>Texto de la Pregunta / Instrucción</Label>
            <Textarea
              value={question.question || question.instruction || ''}
              onChange={(e) =>
                onUpdate(
                  question.type === 'fill_blanks' ||
                    question.type === 'matching' ||
                    question.type === 'ordering' ||
                    question.type === 'drag_drop'
                    ? { instruction: e.target.value }
                    : { question: e.target.value }
                )
              }
              placeholder="Escribe la pregunta o instrucción..."
              rows={3}
            />
            {question.type === 'fill_blanks' && (
              <p className="text-xs text-muted-foreground">
                Usa corchetes como [respuesta] para crear espacios en blanco.
              </p>
            )}
          </div>

          {/* Type-specific editors */}
          {question.type === 'multiple_choice' && (
            <MultipleChoiceEditor question={question} onUpdate={onUpdate} />
          )}

          {question.type === 'true_false' && (
            <TrueFalseEditor question={question} onUpdate={onUpdate} />
          )}

          {question.type === 'short_answer' && (
            <ShortAnswerEditor question={question} onUpdate={onUpdate} />
          )}

          {question.type === 'essay' && <EssayEditor question={question} onUpdate={onUpdate} />}

          {question.type === 'fill_blanks' && (
            <FillBlanksEditor question={question} onUpdate={onUpdate} />
          )}

          {question.type === 'matching' && (
            <MatchingEditor question={question} onUpdate={onUpdate} />
          )}

          {question.type === 'ordering' && (
            <OrderingEditor question={question} onUpdate={onUpdate} />
          )}

          {question.type === 'drag_drop' && (
            <DragDropEditor question={question} onUpdate={onUpdate} />
          )}

          {/* Audio/Image specific editors */}
          {question.type === 'audio_question' && (
            <AudioQuestionEditor question={question} onUpdate={onUpdate} />
          )}

          {question.type === 'image_question' && (
            <ImageQuestionEditor question={question} onUpdate={onUpdate} />
          )}

          {/* Points - Only show for non-informative question types */}
          {question.type !== 'audio_question' && question.type !== 'image_question' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Puntos</Label>
                <Input
                  type="number"
                  min={0}
                  value={question.points || 0}
                  onChange={(e) => onUpdate({ points: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Crédito Parcial</Label>
                <Select
                  value={question.partialCredit ? 'allow' : 'none'}
                  onValueChange={(v) => onUpdate({ partialCredit: v === 'allow' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="allow">Permitir</SelectItem>
                    <SelectItem value="none">No permitir</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Informative block notice */}
          {(question.type === 'audio_question' || question.type === 'image_question') && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Este es un bloque informativo. No requiere respuesta del estudiante ni otorga
                puntos.
              </p>
            </div>
          )}

          {/* Hint / Feedback */}
          <Collapsible open={hintOpen} onOpenChange={setHintOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:text-primary">
              Pista / Retroalimentación
              <ChevronDown
                className={cn('h-4 w-4 transition-transform', hintOpen && 'rotate-180')}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Pista (opcional)</Label>
                <Textarea
                  value={question.hint || ''}
                  onChange={(e) => onUpdate({ hint: e.target.value })}
                  placeholder="Pista para ayudar al estudiante..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Explicación (se muestra después)</Label>
                <Textarea
                  value={question.explanation || ''}
                  onChange={(e) => onUpdate({ explanation: e.target.value })}
                  placeholder="Explicación de la respuesta correcta..."
                  rows={2}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Case Sensitive (for applicable types) */}
          {(question.type === 'short_answer' || question.type === 'fill_blanks') && (
            <div className="flex items-center justify-between">
              <div>
                <Label>Sensible a Mayúsculas</Label>
                <p className="text-xs text-muted-foreground">
                  Distinguir entre mayúsculas y minúsculas
                </p>
              </div>
              <Switch
                checked={question.caseSensitive || false}
                onCheckedChange={(checked) => onUpdate({ caseSensitive: checked })}
              />
            </div>
          )}

          {/* Required Question */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Pregunta Requerida</Label>
              <p className="text-xs text-muted-foreground">El estudiante debe responder</p>
            </div>
            <Switch
              checked={question.required !== false}
              onCheckedChange={(checked) => onUpdate({ required: checked })}
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

// Multiple Choice Editor
function MultipleChoiceEditor({
  question,
  onUpdate,
}: {
  question: ExamQuestion
  onUpdate: (updates: Partial<ExamQuestion>) => void
}) {
  const options = question.options || []

  const addOption = () => {
    const newId = `opt${Date.now()}`
    onUpdate({
      options: [...options, { id: newId, text: `Opción ${options.length + 1}` }],
    })
  }

  const updateOption = (id: string, text: string) => {
    onUpdate({
      options: options.map((opt) => (opt.id === id ? { ...opt, text } : opt)),
    })
  }

  const removeOption = (id: string) => {
    const filteredOptions = options.filter((opt) => opt.id !== id)
    onUpdate({
      options: filteredOptions,
      correctOptionId:
        question.correctOptionId === id ? filteredOptions[0]?.id : question.correctOptionId,
    })
  }

  return (
    <div className="space-y-3">
      <Label>Constructor de Respuestas</Label>
      <p className="text-xs text-muted-foreground">
        Haz clic en el círculo para marcar la respuesta correcta.
      </p>

      <div className="space-y-2">
        {options.map((option, index) => (
          <div key={option.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onUpdate({ correctOptionId: option.id })}
              className={cn(
                'w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors',
                question.correctOptionId === option.id
                  ? 'border-green-500 bg-green-500'
                  : 'border-muted-foreground/30 hover:border-primary'
              )}
            />
            <Input
              value={option.text}
              onChange={(e) => updateOption(option.id, e.target.value)}
              placeholder={`Opción ${index + 1}`}
              className="flex-1"
            />
            {options.length > 2 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => removeOption(option.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={addOption} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Agregar Opción
      </Button>
    </div>
  )
}

// True/False Editor
function TrueFalseEditor({
  question,
  onUpdate,
}: {
  question: ExamQuestion
  onUpdate: (updates: Partial<ExamQuestion>) => void
}) {
  return (
    <div className="space-y-3">
      <Label>Respuesta Correcta</Label>
      <div className="flex gap-2">
        <Button
          variant={question.correctAnswer === true ? 'default' : 'outline'}
          className="flex-1"
          onClick={() => onUpdate({ correctAnswer: true })}
        >
          Verdadero
        </Button>
        <Button
          variant={question.correctAnswer === false ? 'default' : 'outline'}
          className="flex-1"
          onClick={() => onUpdate({ correctAnswer: false })}
        >
          Falso
        </Button>
      </div>
    </div>
  )
}

// Short Answer Editor
function ShortAnswerEditor({
  question,
  onUpdate,
}: {
  question: ExamQuestion
  onUpdate: (updates: Partial<ExamQuestion>) => void
}) {
  const answers = question.correctAnswers || []

  const addAnswer = () => {
    onUpdate({ correctAnswers: [...answers, ''] })
  }

  const updateAnswer = (index: number, value: string) => {
    const newAnswers = [...answers]
    newAnswers[index] = value
    onUpdate({ correctAnswers: newAnswers })
  }

  const removeAnswer = (index: number) => {
    onUpdate({ correctAnswers: answers.filter((_, i) => i !== index) })
  }

  return (
    <div className="space-y-3">
      <Label>Respuestas Aceptadas</Label>
      <p className="text-xs text-muted-foreground">
        Agrega todas las variaciones de respuestas correctas.
      </p>

      <div className="space-y-2">
        {answers.map((answer, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={answer}
              onChange={(e) => updateAnswer(index, e.target.value)}
              placeholder={`Respuesta ${index + 1}`}
              className="flex-1"
            />
            {answers.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => removeAnswer(index)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={addAnswer} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Agregar Respuesta Alternativa
      </Button>
    </div>
  )
}

// Essay Editor
function EssayEditor({
  question,
  onUpdate,
}: {
  question: ExamQuestion
  onUpdate: (updates: Partial<ExamQuestion>) => void
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Mínimo de Palabras</Label>
          <Input
            type="number"
            min={0}
            value={question.minWords || ''}
            onChange={(e) => onUpdate({ minWords: parseInt(e.target.value) || undefined })}
            placeholder="Ej: 50"
          />
        </div>
        <div className="space-y-2">
          <Label>Máximo de Palabras</Label>
          <Input
            type="number"
            min={0}
            value={question.maxWords || ''}
            onChange={(e) => onUpdate({ maxWords: parseInt(e.target.value) || undefined })}
            placeholder="Ej: 500"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Rúbrica de Evaluación (opcional)</Label>
        <Textarea
          value={question.rubric || ''}
          onChange={(e) => onUpdate({ rubric: e.target.value })}
          placeholder="Criterios para evaluar la respuesta..."
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          Esta rúbrica será visible solo para el evaluador.
        </p>
      </div>
    </div>
  )
}

// Fill Blanks Editor
function FillBlanksEditor({
  question,
  onUpdate,
}: {
  question: ExamQuestion
  onUpdate: (updates: Partial<ExamQuestion>) => void
}) {
  return (
    <div className="space-y-3">
      <Label>Contenido con Espacios</Label>
      <Textarea
        value={question.content || ''}
        onChange={(e) => onUpdate({ content: e.target.value })}
        placeholder="El cielo es [azul] y el pasto es [verde]."
        rows={4}
      />
      <p className="text-xs text-muted-foreground">
        Usa corchetes [respuesta] para crear espacios en blanco. El texto dentro de los corchetes
        será la respuesta correcta.
      </p>
    </div>
  )
}

// Matching Editor
function MatchingEditor({
  question,
  onUpdate,
}: {
  question: ExamQuestion
  onUpdate: (updates: Partial<ExamQuestion>) => void
}) {
  const pairs = question.pairs || []

  const addPair = () => {
    const newId = `pair${Date.now()}`
    onUpdate({
      pairs: [...pairs, { id: newId, left: '', right: '' }],
    })
  }

  const updatePair = (id: string, field: 'left' | 'right', value: string) => {
    onUpdate({
      pairs: pairs.map((pair) => (pair.id === id ? { ...pair, [field]: value } : pair)),
    })
  }

  const removePair = (id: string) => {
    onUpdate({ pairs: pairs.filter((pair) => pair.id !== id) })
  }

  return (
    <div className="space-y-3">
      <Label>Pares para Emparejar</Label>

      <div className="space-y-3">
        {pairs.map((pair, index) => (
          <div key={pair.id} className="space-y-2 p-3 border rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Par {index + 1}</span>
              {pairs.length > 2 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => removePair(pair.id)}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              )}
            </div>
            <Input
              value={pair.left}
              onChange={(e) => updatePair(pair.id, 'left', e.target.value)}
              placeholder="Elemento izquierdo"
            />
            <Input
              value={pair.right}
              onChange={(e) => updatePair(pair.id, 'right', e.target.value)}
              placeholder="Elemento derecho"
            />
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={addPair} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Agregar Par
      </Button>
    </div>
  )
}

// Ordering Editor
function OrderingEditor({
  question,
  onUpdate,
}: {
  question: ExamQuestion
  onUpdate: (updates: Partial<ExamQuestion>) => void
}) {
  const items = question.items || []

  const addItem = () => {
    const newId = `item${Date.now()}`
    onUpdate({
      items: [...items, { id: newId, text: '', correctPosition: items.length }],
    })
  }

  const updateItem = (id: string, text: string) => {
    onUpdate({
      items: items.map((item) => (item.id === id ? { ...item, text } : item)),
    })
  }

  const removeItem = (id: string) => {
    const newItems = items
      .filter((item) => item.id !== id)
      .map((item, index) => ({ ...item, correctPosition: index }))
    onUpdate({ items: newItems })
  }

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= items.length) return

    const newItems = [...items]
    const temp = newItems[index]
    newItems[index] = newItems[newIndex]
    newItems[newIndex] = temp

    onUpdate({
      items: newItems.map((item, i) => ({ ...item, correctPosition: i })),
    })
  }

  return (
    <div className="space-y-3">
      <Label>Elementos a Ordenar</Label>
      <p className="text-xs text-muted-foreground">
        El orden actual es el orden correcto. Usa las flechas para reordenar.
      </p>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={item.id} className="flex items-center gap-2">
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => moveItem(index, 'up')}
                disabled={index === 0}
                className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
              >
                <ChevronDown className="h-3 w-3 rotate-180" />
              </button>
              <button
                type="button"
                onClick={() => moveItem(index, 'down')}
                disabled={index === items.length - 1}
                className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
              >
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium flex-shrink-0">
              {index + 1}
            </span>
            <Input
              value={item.text}
              onChange={(e) => updateItem(item.id, e.target.value)}
              placeholder={`Elemento ${index + 1}`}
              className="flex-1"
            />
            {items.length > 2 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => removeItem(item.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={addItem} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Agregar Elemento
      </Button>
    </div>
  )
}

// Drag & Drop Editor
function DragDropEditor({
  question,
  onUpdate,
}: {
  question: ExamQuestion
  onUpdate: (updates: Partial<ExamQuestion>) => void
}) {
  const categories = question.categories || []
  const items = question.dragItems || []

  const addCategory = () => {
    const newId = `cat${Date.now()}`
    onUpdate({
      categories: [...categories, { id: newId, name: '' }],
    })
  }

  const updateCategory = (id: string, name: string) => {
    onUpdate({
      categories: categories.map((cat) => (cat.id === id ? { ...cat, name } : cat)),
    })
  }

  const removeCategory = (id: string) => {
    onUpdate({
      categories: categories.filter((cat) => cat.id !== id),
      dragItems: items.filter((item) => item.correctCategoryId !== id),
    })
  }

  const addItem = () => {
    const newId = `item${Date.now()}`
    onUpdate({
      dragItems: [...items, { id: newId, text: '', correctCategoryId: categories[0]?.id || '' }],
    })
  }

  const updateItem = (id: string, field: 'text' | 'correctCategoryId', value: string) => {
    onUpdate({
      dragItems: items.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    })
  }

  const removeItem = (id: string) => {
    onUpdate({ dragItems: items.filter((item) => item.id !== id) })
  }

  return (
    <div className="space-y-4">
      {/* Categories */}
      <div className="space-y-3">
        <Label>Categorías</Label>
        <div className="space-y-2">
          {categories.map((cat, index) => (
            <div key={cat.id} className="flex items-center gap-2">
              <Input
                value={cat.name}
                onChange={(e) => updateCategory(cat.id, e.target.value)}
                placeholder={`Categoría ${index + 1}`}
                className="flex-1"
              />
              {categories.length > 2 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => removeCategory(cat.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={addCategory} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Agregar Categoría
        </Button>
      </div>

      {/* Items */}
      <div className="space-y-3">
        <Label>Elementos a Clasificar</Label>
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={item.id} className="space-y-2 p-3 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Elemento {index + 1}
                </span>
                {items.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                )}
              </div>
              <Input
                value={item.text}
                onChange={(e) => updateItem(item.id, 'text', e.target.value)}
                placeholder="Texto del elemento"
              />
              <Select
                value={item.correctCategoryId}
                onValueChange={(v) => updateItem(item.id, 'correctCategoryId', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Categoría correcta" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name || 'Sin nombre'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={addItem} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Agregar Elemento
        </Button>
      </div>
    </div>
  )
}

// Audio Question Editor
function AudioQuestionEditor({
  question,
  onUpdate,
}: {
  question: ExamQuestion
  onUpdate: (updates: Partial<ExamQuestion>) => void
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Archivo de Audio</Label>
        <FileUpload
          fileType="audio"
          folder="exams"
          onUploadComplete={(result) => onUpdate({ audioUrl: result.secure_url })}
          onUploadError={(error) => {
            console.error('Upload error:', error)
          }}
        />
        {question.audioUrl && (
          <div className="mt-3 p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <Music className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Audio cargado</p>
                <p className="text-xs text-muted-foreground truncate">{question.audioUrl}</p>
              </div>
            </div>
            <audio src={question.audioUrl} controls className="w-full mt-2" />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Reproducciones Máximas</Label>
        <Input
          type="number"
          min={1}
          value={question.maxPlays || 3}
          onChange={(e) => onUpdate({ maxPlays: parseInt(e.target.value) || 3 })}
        />
        <p className="text-xs text-muted-foreground">
          Número máximo de veces que el estudiante puede reproducir el audio.
        </p>
      </div>
    </div>
  )
}

// Image Question Editor
function ImageQuestionEditor({
  question,
  onUpdate,
}: {
  question: ExamQuestion
  onUpdate: (updates: Partial<ExamQuestion>) => void
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>URL de la Imagen</Label>
        <Input
          value={question.imageUrl || ''}
          onChange={(e) => onUpdate({ imageUrl: e.target.value })}
          placeholder="https://ejemplo.com/imagen.jpg"
        />
        <p className="text-xs text-muted-foreground">
          Ingresa la URL de la imagen (JPG, PNG, GIF, etc.)
        </p>
      </div>

      {question.imageUrl && (
        <div className="space-y-2">
          <Label>Vista Previa</Label>
          <div className="border rounded-lg overflow-hidden bg-muted/30">
            <img
              src={question.imageUrl}
              alt="Vista previa"
              className="max-w-full h-auto max-h-48 mx-auto"
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
