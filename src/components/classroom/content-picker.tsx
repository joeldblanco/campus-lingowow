'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, BookOpen, FileText, GraduationCap, Clock, ArrowLeft, Share2, Loader2 } from 'lucide-react'
import { getShareableContent, ShareableContent } from '@/lib/actions/classroom'
import { cn } from '@/lib/utils'

interface ContentPickerProps {
  onSelect: (contentId: string, contentType: ShareableContent['type']) => void
  onCancel: () => void
}

export function ContentPicker({ onSelect, onCancel }: ContentPickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [content, setContent] = useState<ShareableContent[]>([])
  const [filteredContent, setFilteredContent] = useState<ShareableContent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<'all' | 'lesson' | 'student_lesson' | 'library_resource'>('all')

  const loadContent = useCallback(async () => {
    setIsLoading(true)
    const data = await getShareableContent()
    setContent(data)
    setFilteredContent(data)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    loadContent()
  }, [loadContent])

  useEffect(() => {
    let filtered = content

    // Apply type filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(item => item.type === activeFilter)
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query)
      )
    }

    setFilteredContent(filtered)
  }, [searchQuery, activeFilter, content])

  const getTypeIcon = (type: ShareableContent['type']) => {
    switch (type) {
      case 'lesson':
        return <BookOpen className="w-4 h-4" />
      case 'student_lesson':
        return <GraduationCap className="w-4 h-4" />
      case 'library_resource':
        return <FileText className="w-4 h-4" />
    }
  }

  const getTypeBadge = (type: ShareableContent['type']) => {
    switch (type) {
      case 'lesson':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700">Lección</Badge>
      case 'student_lesson':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-700">Personalizada</Badge>
      case 'library_resource':
        return <Badge variant="secondary" className="bg-green-100 text-green-700">Biblioteca</Badge>
    }
  }

  const handleShare = () => {
    if (selectedId) {
      const selected = content.find(c => c.id === selectedId)
      if (selected) {
        onSelect(selected.id, selected.type)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-500">Cargando contenido disponible...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-none pb-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Seleccionar Contenido</h2>
              <p className="text-sm text-gray-500">Elige un recurso para compartir con el estudiante</p>
            </div>
          </div>
          <Button 
            onClick={handleShare} 
            disabled={!selectedId}
            className="gap-2"
          >
            <Share2 className="w-4 h-4" />
            Compartir
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por título, descripción o categoría..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Button
            variant={activeFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter('all')}
          >
            Todos
          </Button>
          <Button
            variant={activeFilter === 'lesson' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter('lesson')}
            className="gap-1"
          >
            <BookOpen className="w-3 h-3" />
            Lecciones
          </Button>
          <Button
            variant={activeFilter === 'student_lesson' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter('student_lesson')}
            className="gap-1"
          >
            <GraduationCap className="w-3 h-3" />
            Mis Creaciones
          </Button>
          <Button
            variant={activeFilter === 'library_resource' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter('library_resource')}
            className="gap-1"
          >
            <FileText className="w-3 h-3" />
            Biblioteca
          </Button>
        </div>
      </div>

      {/* Content Grid */}
      <ScrollArea className="flex-1 pt-4">
        {filteredContent.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No se encontró contenido</p>
            {searchQuery && (
              <p className="text-sm mt-1">Intenta con otros términos de búsqueda</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filteredContent.map((item) => (
              <Card
                key={item.id}
                className={cn(
                  "p-3 cursor-pointer transition-all hover:shadow-md border-2",
                  selectedId === item.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-transparent hover:border-gray-200"
                )}
                onClick={() => setSelectedId(item.id)}
              >
                <div className="flex items-start gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-gray-100">
                    {getTypeIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm text-gray-900 truncate">
                      {item.title}
                    </h3>
                    {item.category && (
                      <p className="text-xs text-gray-500 truncate">{item.category}</p>
                    )}
                  </div>
                </div>

                {item.description && (
                  <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                    {item.description}
                  </p>
                )}

                <div className="flex items-center justify-between gap-2">
                  {getTypeBadge(item.type)}
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    {item.level && (
                      <span className="font-medium">{item.level}</span>
                    )}
                    {item.duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {item.duration}min
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
