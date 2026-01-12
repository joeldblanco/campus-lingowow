'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Block } from '@/types/course-builder'
import { generateBlocksWithAI } from '@/lib/services/ai-block-generator'
import { cn } from '@/lib/utils'
import { 
  Sparkles, 
  Send, 
  Loader2, 
  X, 
  MessageSquare,
  Plus,
  Wand2,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  blocks?: Block[]
  error?: boolean
  timestamp: Date
}

interface AIBlockChatProps {
  lessonTitle?: string
  lessonDescription?: string
  onAddBlocks: (blocks: Block[]) => void
  existingBlocksCount: number
}

const QUICK_PROMPTS = [
  { label: 'Vocabulario', prompt: 'Crea un bloque de vocabulario con 5 palabras relacionadas con' },
  { label: 'Gramática', prompt: 'Explica la regla gramatical de' },
  { label: 'Fill Blanks', prompt: 'Crea un ejercicio de rellenar espacios sobre' },
  { label: 'Quiz', prompt: 'Crea 3 preguntas de opción múltiple sobre' },
  { label: 'True/False', prompt: 'Crea 4 preguntas de verdadero o falso sobre' },
  { label: 'Matching', prompt: 'Crea un ejercicio de emparejar con 5 pares sobre' },
]

export function AIBlockChat({ 
  lessonTitle, 
  lessonDescription, 
  onAddBlocks,
  existingBlocksCount 
}: AIBlockChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const result = await generateBlocksWithAI({
        prompt: input.trim(),
        lessonTitle,
        lessonDescription,
        context: messages.length > 0 
          ? `Previous conversation context: ${messages.slice(-4).map(m => `${m.role}: ${m.content}`).join('\n')}`
          : undefined,
      })

      const assistantMessage: Message = {
        id: `msg_${Date.now()}_response`,
        role: 'assistant',
        content: result.success 
          ? `He generado ${result.blocks?.length || 0} bloque(s). Puedes agregarlos a tu lección o pedirme modificaciones.`
          : `Error: ${result.error}`,
        blocks: result.blocks,
        error: !result.success,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch {
      const errorMessage: Message = {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: 'Ocurrió un error al generar los bloques. Por favor, intenta de nuevo.',
        error: true,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddBlocks = (blocks: Block[]) => {
    const blocksWithOrder = blocks.map((block, index) => ({
      ...block,
      id: `block_${Date.now()}_${index}`,
      order: existingBlocksCount + index,
    }))
    onAddBlocks(blocksWithOrder)
  }

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt + ' ')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 z-50"
        size="icon"
      >
        <Sparkles className="h-6 w-6" />
      </Button>
    )
  }

  return (
    <Card className={cn(
      "fixed bottom-6 right-6 w-[420px] shadow-2xl z-50 border-violet-200 transition-all duration-300",
      isMinimized ? "h-14" : "h-[600px]"
    )}>
      <CardHeader className="p-3 border-b bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 rounded-t-lg cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 flex items-center justify-center">
              <Wand2 className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">AI Block Generator</CardTitle>
              <p className="text-xs text-muted-foreground">Crea bloques con lenguaje natural</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}>
              {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {!isMinimized && (
        <CardContent className="p-0 flex flex-col h-[calc(100%-56px)]">
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="space-y-4">
                <div className="text-center py-6">
                  <Sparkles className="h-12 w-12 mx-auto text-violet-400 mb-3" />
                  <h3 className="font-semibold text-lg">¡Hola! Soy tu asistente de contenido</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Describe qué tipo de contenido necesitas y lo crearé para ti.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Sugerencias rápidas
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_PROMPTS.map((qp, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="cursor-pointer hover:bg-violet-50 hover:border-violet-300 transition-colors"
                        onClick={() => handleQuickPrompt(qp.prompt)}
                      >
                        {qp.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-2">
                  <p className="font-medium">Ejemplos de prompts:</p>
                  <ul className="text-muted-foreground space-y-1 text-xs">
                    <li>• &quot;Crea vocabulario de comida con 8 palabras en inglés&quot;</li>
                    <li>• &quot;Explica el presente simple con 3 ejemplos&quot;</li>
                    <li>• &quot;Genera un quiz de 5 preguntas sobre verbos irregulares&quot;</li>
                    <li>• &quot;Crea ejercicios de fill in the blanks sobre preposiciones&quot;</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3",
                      message.role === 'user' ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.role === 'assistant' && (
                      <div className="h-8 w-8 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 flex items-center justify-center shrink-0">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <div className={cn(
                      "max-w-[85%] rounded-lg p-3",
                      message.role === 'user' 
                        ? "bg-primary text-primary-foreground" 
                        : message.error 
                          ? "bg-red-50 border border-red-200 text-red-700"
                          : "bg-muted"
                    )}>
                      <p className="text-sm">{message.content}</p>
                      
                      {message.blocks && message.blocks.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">
                              {message.blocks.length} bloque(s) generado(s)
                            </span>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-7 text-xs gap-1"
                              onClick={() => handleAddBlocks(message.blocks!)}
                            >
                              <Plus className="h-3 w-3" />
                              Agregar todos
                            </Button>
                          </div>
                          <div className="space-y-1">
                            {message.blocks.map((block, idx) => (
                              <div 
                                key={idx}
                                className="flex items-center justify-between bg-background/80 rounded px-2 py-1.5 text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-[10px] px-1.5">
                                    {block.type}
                                  </Badge>
                                  <span className="truncate max-w-[150px]">
                                    {getBlockPreviewText(block)}
                                  </span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={() => handleAddBlocks([block])}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {message.role === 'user' && (
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <MessageSquare className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 flex items-center justify-center shrink-0">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Generando bloques...</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          <div className="p-3 border-t bg-muted/30">
            <div className="flex gap-2">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe el contenido que necesitas..."
                className="min-h-[60px] max-h-[120px] resize-none text-sm"
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="h-auto bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              Presiona Enter para enviar, Shift+Enter para nueva línea
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

function getBlockPreviewText(block: Block): string {
  switch (block.type) {
    case 'title':
      return (block as { title?: string }).title || 'Título'
    case 'text':
      const content = (block as { content?: string }).content || ''
      return content.replace(/<[^>]*>/g, '').slice(0, 30) + '...'
    case 'vocabulary':
      const items = (block as { items?: { term: string }[] }).items || []
      return `${items.length} términos`
    case 'grammar':
      return (block as { title?: string }).title || 'Gramática'
    case 'fill_blanks':
      const fbItems = (block as { items?: unknown[] }).items || []
      return `${fbItems.length} ejercicio(s)`
    case 'match':
      const pairs = (block as { pairs?: unknown[] }).pairs || []
      return `${pairs.length} pares`
    case 'true_false':
      const tfItems = (block as { items?: unknown[] }).items || []
      return `${tfItems.length} pregunta(s)`
    case 'multiple_choice':
      return (block as { question?: string }).question?.slice(0, 25) + '...' || 'Pregunta'
    case 'multi_select':
      return (block as { title?: string }).title || 'Selección múltiple'
    default:
      return block.type
  }
}
