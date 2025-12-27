'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { BLOCK_TEMPLATES } from '@/types/course-builder'
import {
  FileText,
  HelpCircle,
  ImageIcon,
  Link,
  Music,
  Paperclip,
  Plus,
  Search,
  Type,
  Video,
  Table,
} from 'lucide-react'
import { useState } from 'react'

interface BlockToolbarProps {
  onAddBlock: (template: (typeof BLOCK_TEMPLATES)[0]) => void
}

const getBlockIcon = (type: string) => {
  switch (type) {
    case 'text':
      return <Type className="h-4 w-4" />
    case 'video':
      return <Video className="h-4 w-4" />
    case 'image':
      return <ImageIcon className="h-4 w-4" />
    case 'audio':
      return <Music className="h-4 w-4" />
    case 'quiz':
      return <HelpCircle className="h-4 w-4" />
    case 'assignment':
      return <FileText className="h-4 w-4" />
    case 'file':
      return <Paperclip className="h-4 w-4" />
    case 'embed':
      return <Link className="h-4 w-4" />
    case 'structured-content':
      return <Table className="h-4 w-4" />
    default:
      return <Plus className="h-4 w-4" />
  }
}

export function BlockToolbar({ onAddBlock }: BlockToolbarProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredTemplates = BLOCK_TEMPLATES.filter(
    (template) =>
      template.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Card className="sticky top-6 border-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center justify-between">
          <span>Add Content</span>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <Plus className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar bloques..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Block Categories */}
        <div className="space-y-4">
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-3">Content</div>
            <div className="grid grid-cols-3 gap-2">
              {filteredTemplates
                .filter((t) => ['text', 'video', 'image', 'structured-content'].includes(t.type))
                .map((template) => (
                  <BlockTemplateCard
                    key={template.type}
                    template={template}
                    onAdd={onAddBlock}
                  />
                ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-3">Media</div>
            <div className="grid grid-cols-3 gap-2">
              {filteredTemplates
                .filter((t) => ['audio', 'file'].includes(t.type))
                .map((template) => (
                  <BlockTemplateCard
                    key={template.type}
                    template={template}
                    onAdd={onAddBlock}
                  />
                ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-3">Educational Tools</div>
            <div className="grid grid-cols-3 gap-2">
              {filteredTemplates
                .filter((t) => ['quiz', 'assignment'].includes(t.type))
                .map((template) => (
                  <BlockTemplateCard
                    key={template.type}
                    template={template}
                    onAdd={onAddBlock}
                  />
                ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-3">Advanced</div>
            <div className="grid grid-cols-3 gap-2">
              {filteredTemplates
                .filter((t) => ['embed'].includes(t.type))
                .map((template) => (
                  <BlockTemplateCard
                    key={template.type}
                    template={template}
                    onAdd={onAddBlock}
                  />
                ))}
            </div>
          </div>
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            No se encontraron bloques que coincidan con &quot;{searchTerm}&quot;
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface BlockTemplateCardProps {
  template: (typeof BLOCK_TEMPLATES)[0]
  onAdd: (template: (typeof BLOCK_TEMPLATES)[0]) => void
}

function BlockTemplateCard({ template, onAdd }: BlockTemplateCardProps) {
  const handleClick = () => {
    onAdd(template)
  }

  return (
    <Button
      variant="outline"
      className="h-20 flex flex-col items-center justify-center gap-2 hover:bg-primary/5 hover:border-primary transition-all group"
      onClick={handleClick}
    >
      <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
        {getBlockIcon(template.type)}
      </div>
      <div className="text-xs font-medium">{template.label}</div>
    </Button>
  )
}
