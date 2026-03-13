'use client'

import { useRef, useEffect } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/types/ai-chat'

const TOOL_LABELS: Record<string, string> = {
  check_teacher_availability: 'Verificando disponibilidad',
  get_upcoming_classes: 'Buscando tus clases',
  schedule_class: 'Agendando clase',
  schedule_recurring_classes: 'Agendando clases del período',
  reschedule_class: 'Reagendando clase',
  check_invoice_status: 'Verificando factura',
  create_payment_link: 'Generando link de pago',
  notify_admin_telegram: 'Notificando al equipo',
  admin_create_invoice: 'Preparando factura PayPal',
  admin_send_invoice: 'Enviando factura PayPal',
  admin_list_invoices: 'Buscando facturas del cliente',
  admin_check_invoice_payment: 'Verificando pago de factura',
  admin_schedule_class: 'Agendando clases del estudiante',
  admin_get_student_classes: 'Buscando clases del estudiante',
  admin_reschedule_class: 'Reagendando clase del estudiante',
  admin_calculate_class_dates: 'Calculando fechas de clases',
}

interface AiChatMessagesProps {
  messages: ChatMessage[]
  isLoading: boolean
  lastToolExecuted?: string
}

// ─── Inline markdown renderer ────────────────────────────────────────────────

type InlineToken =
  | { type: 'text'; content: string }
  | { type: 'bold'; content: string }
  | { type: 'italic'; content: string }
  | { type: 'strike'; content: string }
  | { type: 'code'; content: string }
  | { type: 'link'; content: string; href: string }

function tokenizeInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = []
  // Order matters: markdown links before raw URLs, ** before *, __ before _
  const re =
    /\*\*(.+?)\*\*|__(.+?)__|(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)|(?<!_)_(?!_)(.+?)(?<!_)_(?!_)|~~(.+?)~~|`(.+?)`|\[([^\]]+)\]\(([^)]+)\)|(https?:\/\/[^\s<>")\\]+)/g
  let lastIdx = 0

  for (const match of text.matchAll(re)) {
    if (match.index! > lastIdx) {
      tokens.push({ type: 'text', content: text.slice(lastIdx, match.index) })
    }
    const [full, bold1, bold2, italic1, italic2, strike, code, linkLabel, linkHref, rawUrl] = match

    if (bold1 !== undefined || bold2 !== undefined) {
      tokens.push({ type: 'bold', content: bold1 ?? bold2 })
    } else if (italic1 !== undefined || italic2 !== undefined) {
      tokens.push({ type: 'italic', content: italic1 ?? italic2 })
    } else if (strike !== undefined) {
      tokens.push({ type: 'strike', content: strike })
    } else if (code !== undefined) {
      tokens.push({ type: 'code', content: code })
    } else if (linkLabel !== undefined && linkHref !== undefined) {
      tokens.push({ type: 'link', content: linkLabel, href: linkHref })
    } else if (rawUrl !== undefined) {
      tokens.push({ type: 'link', content: rawUrl, href: rawUrl })
    }

    lastIdx = match.index! + full.length
  }

  if (lastIdx < text.length) {
    tokens.push({ type: 'text', content: text.slice(lastIdx) })
  }

  return tokens
}

function renderInline(text: string, isUser: boolean): React.ReactNode[] {
  return tokenizeInline(text).map((token, i) => {
    switch (token.type) {
      case 'bold':
        return <strong key={i} className="font-semibold">{token.content}</strong>
      case 'italic':
        return <em key={i}>{token.content}</em>
      case 'strike':
        return <del key={i}>{token.content}</del>
      case 'code':
        return (
          <code
            key={i}
            className={cn(
              'rounded px-1 font-mono text-xs',
              isUser ? 'bg-white/20' : 'bg-black/10 dark:bg-white/10'
            )}
          >
            {token.content}
          </code>
        )
      case 'link':
        return (
          <a
            key={i}
            href={token.href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'underline font-medium',
              isUser ? 'text-white/90 hover:text-white' : 'text-primary hover:text-primary/80'
            )}
          >
            {token.content}
          </a>
        )
      default:
        return token.content
    }
  })
}

// ─── Block-level markdown renderer ───────────────────────────────────────────

function renderMarkdown(content: string, isUser: boolean): React.ReactNode {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  const listItems: React.ReactNode[] = []
  let listType: 'ul' | 'ol' | null = null

  const flushList = (key: number) => {
    if (listItems.length === 0) return
    elements.push(
      listType === 'ul' ? (
        <ul key={`list-${key}`} className="list-disc list-inside space-y-0.5 my-1 ml-1">
          {[...listItems]}
        </ul>
      ) : (
        <ol key={`list-${key}`} className="list-decimal list-inside space-y-0.5 my-1 ml-1">
          {[...listItems]}
        </ol>
      )
    )
    listItems.length = 0
    listType = null
  }

  lines.forEach((line, i) => {
    const ulMatch = line.match(/^[-*•]\s+(.+)/)
    const olMatch = line.match(/^(\d+)[.)]\s+(.+)/)

    if (ulMatch) {
      if (listType === 'ol') flushList(i)
      listType = 'ul'
      listItems.push(<li key={i}>{renderInline(ulMatch[1], isUser)}</li>)
    } else if (olMatch) {
      if (listType === 'ul') flushList(i)
      listType = 'ol'
      listItems.push(<li key={i}>{renderInline(olMatch[2], isUser)}</li>)
    } else {
      flushList(i)
      if (line.trim()) {
        const needsBr = i < lines.length - 1
        elements.push(
          <span key={i}>
            {renderInline(line, isUser)}
            {needsBr && <br />}
          </span>
        )
      } else if (elements.length > 0 || listItems.length > 0) {
        elements.push(<br key={`blank-${i}`} />)
      }
    }
  })

  flushList(lines.length)

  return <>{elements}</>
}

// ─── Components ───────────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words',
          isUser
            ? 'bg-primary text-white rounded-tr-sm'
            : 'bg-muted text-foreground rounded-tl-sm'
        )}
      >
        {isUser ? message.content : renderMarkdown(message.content, isUser)}
      </div>
    </div>
  )
}

function LoadingDots() {
  return (
    <div className="flex justify-start">
      <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 items-center">
        <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  )
}

export function AiChatMessages({ messages, isLoading, lastToolExecuted }: AiChatMessagesProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll within the ScrollArea viewport only (never the page)
  useEffect(() => {
    if (!containerRef.current) return
    // Radix ScrollArea wraps content in a viewport element
    const viewport = containerRef.current.closest('[data-radix-scroll-area-viewport]')
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight
    }
  }, [messages, isLoading])

  return (
    <ScrollArea className="flex-1 min-h-0 px-4 py-3">
      <div ref={containerRef} className="flex flex-col gap-3">
        {messages.map((msg, idx) => (
          <MessageBubble key={idx} message={msg} />
        ))}

        {isLoading && lastToolExecuted && (
          <div className="flex justify-start">
            <span className="text-xs text-muted-foreground bg-muted/50 rounded-full px-3 py-1.5 flex items-center gap-1.5">
              <span className="w-1 h-1 bg-primary rounded-full animate-pulse" />
              {TOOL_LABELS[lastToolExecuted] ?? lastToolExecuted}...
            </span>
          </div>
        )}

        {isLoading && <LoadingDots />}
      </div>
    </ScrollArea>
  )
}

