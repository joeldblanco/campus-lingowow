'use client'

import React from 'react'
import { 
  ArticleBlock, 
  ArticleContent,
  TextBlock,
  HeadingBlock,
  KeyRuleBlock,
  GrammarTableBlock,
  ExamplesInContextBlock,
  VideoBlock,
  ImageBlock,
  CalloutBlock,
} from '@/lib/types/article-blocks'
import { cn } from '@/lib/utils'
import { 
  Lightbulb, 
  AlertTriangle, 
  Sparkles, 
  Info,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react'

// Parse basic markdown: **bold**, *italic*, [link](url)
function parseMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0

  // Regex patterns for markdown
  const patterns = [
    // Links: [text](url)
    { regex: /\[([^\]]+)\]\(([^)]+)\)/, render: (match: RegExpMatchArray) => (
      <a key={key++} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">
        {match[1]}
      </a>
    )},
    // Bold: **text**
    { regex: /\*\*([^*]+)\*\*/, render: (match: RegExpMatchArray) => (
      <strong key={key++} className="font-semibold text-foreground">{match[1]}</strong>
    )},
    // Italic: *text*
    { regex: /\*([^*]+)\*/, render: (match: RegExpMatchArray) => (
      <em key={key++}>{match[1]}</em>
    )},
  ]

  while (remaining.length > 0) {
    let earliestMatch: { index: number; match: RegExpMatchArray; pattern: typeof patterns[0] } | null = null

    for (const pattern of patterns) {
      const match = remaining.match(pattern.regex)
      if (match && match.index !== undefined) {
        if (!earliestMatch || match.index < earliestMatch.index) {
          earliestMatch = { index: match.index, match, pattern }
        }
      }
    }

    if (earliestMatch) {
      // Add text before the match
      if (earliestMatch.index > 0) {
        parts.push(remaining.slice(0, earliestMatch.index))
      }
      // Add the rendered match
      parts.push(earliestMatch.pattern.render(earliestMatch.match))
      // Continue with remaining text
      remaining = remaining.slice(earliestMatch.index + earliestMatch.match[0].length)
    } else {
      // No more matches, add remaining text
      parts.push(remaining)
      break
    }
  }

  return parts
}

interface ArticleBlockRendererProps {
  content: ArticleContent
  className?: string
}

export function ArticleBlockRenderer({ content, className }: ArticleBlockRendererProps) {
  if (!content.blocks || content.blocks.length === 0) {
    return null
  }

  return (
    <div className={cn("space-y-6", className)}>
      {content.blocks.map((block) => (
        <BlockRenderer key={block.id} block={block} />
      ))}
    </div>
  )
}

function BlockRenderer({ block }: { block: ArticleBlock }) {
  switch (block.type) {
    case 'text':
      return <TextBlockRenderer block={block} />
    case 'heading':
      return <HeadingBlockRenderer block={block} />
    case 'key-rule':
      return <KeyRuleBlockRenderer block={block} />
    case 'grammar-table':
      return <GrammarTableBlockRenderer block={block} />
    case 'examples-in-context':
      return <ExamplesBlockRenderer block={block} />
    case 'video':
      return <VideoBlockRenderer block={block} />
    case 'image':
      return <ImageBlockRenderer block={block} />
    case 'callout':
      return <CalloutBlockRenderer block={block} />
    case 'divider':
      return <hr className="my-8 border-t-2 border-muted" />
    default:
      return null
  }
}

function TextBlockRenderer({ block }: { block: TextBlock }) {
  // Split by any line break to get all lines
  const lines = block.content.split('\n')
  
  // Group lines into paragraphs (empty lines separate paragraphs)
  const paragraphs: string[][] = []
  let currentParagraph: string[] = []
  
  for (const line of lines) {
    if (line.trim() === '') {
      if (currentParagraph.length > 0) {
        paragraphs.push(currentParagraph)
        currentParagraph = []
      }
    } else {
      currentParagraph.push(line)
    }
  }
  if (currentParagraph.length > 0) {
    paragraphs.push(currentParagraph)
  }
  
  return (
    <div className="prose prose-lg max-w-none space-y-4">
      {paragraphs.map((paragraphLines, index) => (
        <p key={index} className="text-muted-foreground leading-relaxed">
          {paragraphLines.map((line, lineIndex) => (
            <React.Fragment key={lineIndex}>
              {parseMarkdown(line)}
              {lineIndex < paragraphLines.length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>
      ))}
    </div>
  )
}

function HeadingBlockRenderer({ block }: { block: HeadingBlock }) {
  const Tag = block.level
  const styles = {
    h2: 'text-2xl md:text-3xl font-bold mt-8 mb-4',
    h3: 'text-xl md:text-2xl font-semibold mt-6 mb-3',
    h4: 'text-lg md:text-xl font-medium mt-4 mb-2',
  }
  
  return <Tag className={styles[block.level]}>{block.content}</Tag>
}

const KEY_RULE_VARIANTS = {
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    borderColor: 'border-l-blue-500',
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-900',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-amber-50',
    borderColor: 'border-l-amber-500',
    iconColor: 'text-amber-600',
    titleColor: 'text-amber-900',
  },
  tip: {
    icon: Sparkles,
    bgColor: 'bg-green-50',
    borderColor: 'border-l-green-500',
    iconColor: 'text-green-600',
    titleColor: 'text-green-900',
  },
  important: {
    icon: Lightbulb,
    bgColor: 'bg-purple-50',
    borderColor: 'border-l-purple-500',
    iconColor: 'text-purple-600',
    titleColor: 'text-purple-900',
  },
}

function KeyRuleBlockRenderer({ block }: { block: KeyRuleBlock }) {
  const config = KEY_RULE_VARIANTS[block.variant]
  const IconComponent = config.icon

  return (
    <div className={cn(
      "p-5 rounded-lg border-l-4",
      config.bgColor,
      config.borderColor
    )}>
      <div className="flex items-start gap-3">
        <IconComponent className={cn("h-6 w-6 mt-0.5 shrink-0", config.iconColor)} />
        <div className="flex-1">
          <h4 className={cn("font-bold text-lg mb-2", config.titleColor)}>
            {block.title}
          </h4>
          {block.description && (
            <p className="text-muted-foreground mb-3">{block.description}</p>
          )}
          {block.items.length > 0 && (
            <ul className="space-y-2">
              {block.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-muted-foreground">
                  <span className={cn("font-bold", config.iconColor)}>•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function GrammarTableBlockRenderer({ block }: { block: GrammarTableBlock }) {
  return (
    <div className="my-6">
      {block.title && (
        <h4 className="font-semibold text-lg mb-3">{block.title}</h4>
      )}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50">
              {block.columns.map((col) => (
                <th 
                  key={col.id} 
                  className="px-4 py-3 text-left font-semibold text-sm uppercase tracking-wide border-b"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row) => (
              <tr key={row.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                {block.columns.map((col, colIndex) => (
                  <td 
                    key={col.id} 
                    className={cn(
                      "px-4 py-3",
                      colIndex === 0 && block.highlightFirstColumn && "font-medium bg-muted/20"
                    )}
                  >
                    {row.cells[col.id] || ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {block.caption && (
        <p className="text-sm text-muted-foreground text-center mt-2 italic">
          {block.caption}
        </p>
      )}
    </div>
  )
}

const EXAMPLE_TYPE_CONFIG = {
  correct: {
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  incorrect: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  neutral: {
    icon: HelpCircle,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
}

function ExamplesBlockRenderer({ block }: { block: ExamplesInContextBlock }) {
  return (
    <div className="my-6">
      <h4 className="font-semibold text-lg mb-2">{block.title}</h4>
      {block.description && (
        <p className="text-muted-foreground mb-4">{block.description}</p>
      )}
      <div className="space-y-3">
        {block.examples.map((example) => {
          const config = EXAMPLE_TYPE_CONFIG[example.type]
          const IconComponent = config.icon
          
          return (
            <div 
              key={example.id}
              className={cn(
                "p-4 rounded-lg border flex items-start gap-3",
                config.bgColor,
                config.borderColor
              )}
            >
              <IconComponent className={cn("h-5 w-5 mt-0.5 shrink-0", config.color)} />
              <div className="flex-1">
                <p className="font-medium">{example.sentence}</p>
                {example.explanation && (
                  <p className="text-sm text-muted-foreground mt-1 italic">
                    {example.explanation}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function getVideoEmbedUrl(url: string, provider?: string): string | null {
  if (!url) return null
  
  if (provider === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be')) {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/)
    if (match) return `https://www.youtube.com/embed/${match[1]}`
  }
  
  if (provider === 'vimeo' || url.includes('vimeo.com')) {
    const match = url.match(/vimeo\.com\/(\d+)/)
    if (match) return `https://player.vimeo.com/video/${match[1]}`
  }
  
  return url
}

function VideoBlockRenderer({ block }: { block: VideoBlock }) {
  const embedUrl = getVideoEmbedUrl(block.url, block.provider)
  
  if (!embedUrl) return null

  return (
    <figure className="my-6">
      <div className="aspect-video rounded-xl overflow-hidden shadow-lg bg-muted">
        <iframe
          src={embedUrl}
          className="w-full h-full"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>
      {block.caption && (
        <figcaption className="text-sm text-muted-foreground text-center mt-3">
          {block.caption}
        </figcaption>
      )}
    </figure>
  )
}

function ImageBlockRenderer({ block }: { block: ImageBlock }) {
  if (!block.url) return null

  return (
    <figure className={cn(
      "my-6",
      block.alignment === 'left' && 'text-left',
      block.alignment === 'center' && 'text-center',
      block.alignment === 'right' && 'text-right',
    )}>
      <div className="inline-block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={block.url}
          alt={block.alt || ''}
          className="rounded-lg shadow-md max-w-full h-auto"
        />
      </div>
      {block.caption && (
        <figcaption className="text-sm text-muted-foreground mt-2 italic">
          {block.caption}
        </figcaption>
      )}
    </figure>
  )
}

const CALLOUT_VARIANTS = {
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-600',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    iconColor: 'text-amber-600',
  },
  success: {
    icon: CheckCircle2,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    iconColor: 'text-green-600',
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconColor: 'text-red-600',
  },
}

function CalloutBlockRenderer({ block }: { block: CalloutBlock }) {
  const config = CALLOUT_VARIANTS[block.variant]
  const IconComponent = config.icon

  return (
    <div className={cn(
      "p-4 rounded-lg border my-6",
      config.bgColor,
      config.borderColor
    )}>
      <div className="flex items-start gap-3">
        <IconComponent className={cn("h-5 w-5 mt-0.5 shrink-0", config.iconColor)} />
        <div className="flex-1">
          {block.title && (
            <h4 className="font-semibold text-sm mb-1">{block.title}</h4>
          )}
          <p className="text-sm">{block.content}</p>
        </div>
      </div>
    </div>
  )
}
