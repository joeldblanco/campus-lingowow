'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, BookOpen, FileText, GraduationCap, Clock, ArrowLeft, Share2, Loader2 } from 'lucide-react'
import { getShareableContent, ShareableContent } from '@/lib/actions/classroom'
import { cn } from '@/lib/utils'

interface ContentPickerProps {
  initialContent?: ShareableContent[] | null
  onSelect: (contentId: string, contentType: ShareableContent['type']) => void
  onCancel: () => void
}

export function ContentPicker({ initialContent, onSelect, onCancel }: ContentPickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [allContent, setAllContent] = useState<ShareableContent[]>(initialContent || [])
  const [isLoading, setIsLoading] = useState(!initialContent)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<'all' | 'lesson' | 'student_lesson' | 'library_resource'>('all')

  // Load ALL content once upfront
  useEffect(() => {
    if (initialContent) return
    
    const load = async () => {
      setIsLoading(true)
      const data = await getShareableContent()
      setAllContent(data)
      setIsLoading(false)
    }
    load()
  }, [initialContent])

  // Client-side filtering — instant, no server calls
  const filteredContent = useMemo(() => {
    let items = allContent

    // Filter by type
    if (activeFilter !== 'all') {
      items = items.filter(item => item.type === activeFilter)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      items = items.filter(item =>
        item.title.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q))
      )
    }

    return items
  }, [allContent, activeFilter, searchQuery])

  const getTypeIcon = (type: ShareableContent['type']) => {
    switch (type) {
      case 'lesson':
        return <BookOpen className="w-4 h-4 text-blue-400" />
      case 'student_lesson':
        return <GraduationCap className="w-4 h-4 text-purple-400" />
      case 'library_resource':
        return <FileText className="w-4 h-4 text-green-400" />
    }
  }

  const getTypeBadgeClass = (type: ShareableContent['type']) => {
    switch (type) {
      case 'lesson':
        return 'bg-blue-500/20 text-blue-300'
      case 'student_lesson':
        return 'bg-purple-500/20 text-purple-300'
      case 'library_resource':
        return 'bg-green-500/20 text-green-300'
    }
  }

  const getTypeLabel = (type: ShareableContent['type']) => {
    switch (type) {
      case 'lesson': return 'Lección'
      case 'student_lesson': return 'Personalizada'
      case 'library_resource': return 'Biblioteca'
    }
  }

  const handleShare = () => {
    if (selectedId) {
      const selected = allContent.find(c => c.id === selectedId)
      if (selected) {
        onSelect(selected.id, selected.type)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400 mb-4" />
        <p className="text-white/50">Cargando contenido disponible...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-none pb-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onCancel} className="text-white/70 hover:text-white hover:bg-white/10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-lg font-semibold text-white">Seleccionar Contenido</h2>
              <p className="text-sm text-white/50">Elige un recurso para compartir con el estudiante</p>
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            placeholder="Buscar por título o descripción..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/10 border-white/10 text-white placeholder:text-white/40 focus:border-white/20"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Button
            variant={activeFilter === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveFilter('all')}
            className={activeFilter !== 'all' ? 'text-white/60 hover:text-white hover:bg-white/10 border border-white/10' : ''}
          >
            Todos
          </Button>
          <Button
            variant={activeFilter === 'lesson' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveFilter('lesson')}
            className={cn("gap-1", activeFilter !== 'lesson' ? 'text-white/60 hover:text-white hover:bg-white/10 border border-white/10' : '')}
          >
            <BookOpen className="w-3 h-3" />
            Lecciones
          </Button>
          <Button
            variant={activeFilter === 'student_lesson' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveFilter('student_lesson')}
            className={cn("gap-1", activeFilter !== 'student_lesson' ? 'text-white/60 hover:text-white hover:bg-white/10 border border-white/10' : '')}
          >
            <GraduationCap className="w-3 h-3" />
            Mis Creaciones
          </Button>
          <Button
            variant={activeFilter === 'library_resource' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveFilter('library_resource')}
            className={cn("gap-1", activeFilter !== 'library_resource' ? 'text-white/60 hover:text-white hover:bg-white/10 border border-white/10' : '')}
          >
            <FileText className="w-3 h-3" />
            Biblioteca
          </Button>
        </div>
      </div>

      {/* Content Grid — scrollable, dark scrollbar, no horizontal scroll */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pt-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-white/30">
        {filteredContent.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No se encontró contenido</p>
            {searchQuery && (
              <p className="text-sm mt-1">Intenta con otros términos de búsqueda</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pb-4">
            {filteredContent.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "p-3 cursor-pointer transition-all rounded-xl border-2",
                  selectedId === item.id
                    ? "border-blue-500 bg-blue-500/15"
                    : "border-transparent bg-white/5 hover:bg-white/10 hover:border-white/10"
                )}
                onClick={() => setSelectedId(item.id)}
              >
                <div className="flex items-start gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-white/10">
                    {getTypeIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm text-white truncate">
                      {item.title}
                    </h3>
                    {item.category && (
                      <p className="text-xs text-white/40 truncate">{item.category}</p>
                    )}
                  </div>
                </div>

                {item.description && (
                  <p className="text-xs text-white/50 line-clamp-2 mb-2">
                    {item.description}
                  </p>
                )}

                <div className="flex items-center justify-between gap-2">
                  <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", getTypeBadgeClass(item.type))}>
                    {getTypeLabel(item.type)}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-white/30">
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
