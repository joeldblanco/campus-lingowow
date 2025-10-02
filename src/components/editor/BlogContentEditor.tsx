'use client'

import { useState } from 'react'
import type { BlogContent, BlogContentSection } from '@/types/blog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { AlertCircle, ChevronDown, ChevronUp, Plus, Trash2, GripVertical } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface BlogContentEditorProps {
  value: BlogContent
  onChange: (content: BlogContent) => void
}

export function BlogContentEditor({ value, onChange }: BlogContentEditorProps) {
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]))

  const addSection = () => {
    const newSection: BlogContentSection = {
      type: 'section',
      title: 'Nueva Sección',
      content: '',
    }
    onChange({
      sections: [...value.sections, newSection],
    })
    setExpandedSections(new Set([...expandedSections, value.sections.length]))
  }

  const updateSection = (index: number, updates: Partial<BlogContentSection>) => {
    const newSections = [...value.sections]
    newSections[index] = { ...newSections[index], ...updates }
    onChange({ sections: newSections })
  }

  const deleteSection = (index: number) => {
    const newSections = value.sections.filter((_, i) => i !== index)
    onChange({ sections: newSections })
    const newExpanded = new Set(expandedSections)
    newExpanded.delete(index)
    setExpandedSections(newExpanded)
  }

  const moveSection = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === value.sections.length - 1)
    ) {
      return
    }

    const newSections = [...value.sections]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    ;[newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]]
    onChange({ sections: newSections })
  }

  const toggleSection = (index: number) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedSections(newExpanded)
  }

  const getTypeLabel = (type: BlogContentSection['type']) => {
    const labels = {
      paragraph: 'Párrafo',
      section: 'Sección',
      highlight: 'Destacado',
      list: 'Lista',
    }
    return labels[type]
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Editor de Contenido</h3>
          <p className="text-sm text-muted-foreground">
            Construye el contenido de tu artículo con bloques visuales
          </p>
        </div>
        <Button onClick={addSection} type="button" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Agregar Sección
        </Button>
      </div>

      {value.sections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              No hay secciones. Agrega tu primera sección para comenzar.
            </p>
            <Button onClick={addSection} type="button">
              <Plus className="mr-2 h-4 w-4" />
              Agregar Primera Sección
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {value.sections.map((section, index) => (
            <Card key={index} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                  <div className="flex-1 flex items-center gap-2">
                    <Badge variant="outline">{getTypeLabel(section.type)}</Badge>
                    {section.number && <Badge variant="secondary">#{section.number}</Badge>}
                    <span className="font-medium truncate">
                      {section.title || section.content?.substring(0, 50) || 'Sin título'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      onClick={() => moveSection(index, 'up')}
                      disabled={index === 0}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      onClick={() => moveSection(index, 'down')}
                      disabled={index === value.sections.length - 1}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      onClick={() => toggleSection(index)}
                    >
                      {expandedSections.has(index) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      onClick={() => deleteSection(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {expandedSections.has(index) && (
                <CardContent className="space-y-4 pt-0">
                  <div className="space-y-2">
                    <Label>Tipo de Bloque</Label>
                    <Select
                      value={section.type}
                      onValueChange={(value) =>
                        updateSection(index, {
                          type: value as BlogContentSection['type'],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paragraph">Párrafo</SelectItem>
                        <SelectItem value="section">Sección</SelectItem>
                        <SelectItem value="highlight">Destacado</SelectItem>
                        <SelectItem value="list">Lista</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(section.type === 'section' || section.type === 'highlight') && (
                    <>
                      {section.type === 'section' && (
                        <div className="space-y-2">
                          <Label>Número de Sección</Label>
                          <Input
                            value={section.number || ''}
                            onChange={(e) => updateSection(index, { number: e.target.value })}
                            placeholder="1, 2, 3..."
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Título</Label>
                        <Input
                          value={section.title || ''}
                          onChange={(e) => updateSection(index, { title: e.target.value })}
                          placeholder="Título de la sección"
                        />
                      </div>
                    </>
                  )}

                  {section.type === 'highlight' && (
                    <div className="space-y-2">
                      <Label>Variante</Label>
                      <Select
                        value={section.variant || 'info'}
                        onValueChange={(value) =>
                          updateSection(index, {
                            variant: value as 'info' | 'warning' | 'success',
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="info">Información</SelectItem>
                          <SelectItem value="warning">Advertencia</SelectItem>
                          <SelectItem value="success">Éxito</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {section.type === 'list' ? (
                    <>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`ordered-${index}`}
                          checked={section.ordered || false}
                          onChange={(e) => updateSection(index, { ordered: e.target.checked })}
                          className="rounded"
                        />
                        <Label htmlFor={`ordered-${index}`}>Lista ordenada</Label>
                      </div>

                      <div className="space-y-2">
                        <Label>Elementos (uno por línea)</Label>
                        <Textarea
                          value={(section.items || []).join('\n')}
                          onChange={(e) =>
                            updateSection(index, {
                              items: e.target.value.split('\n').filter(Boolean),
                            })
                          }
                          placeholder="Elemento 1&#10;Elemento 2&#10;Elemento 3"
                          rows={5}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <Label>Contenido</Label>
                      <Textarea
                        value={section.content || ''}
                        onChange={(e) => updateSection(index, { content: e.target.value })}
                        placeholder="Escribe el contenido aquí..."
                        rows={6}
                      />
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
