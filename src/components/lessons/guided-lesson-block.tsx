import type { ReactNode } from 'react'
import type { Block } from '@/types/course-builder'
import { sanitizeHtml } from '@/lib/sanitize-html'

const NAVY_TEXT = 'text-[#10245C]'
const IVORY_BACKGROUND = 'bg-[#FAF8F4]'
const SLATE_TEXT = 'text-[#506187]'
const GREEN_TEXT = 'text-[#08775E]'
const NEGATION_TEXT = 'text-[#C13E50]'
const IVORY_TEXT = `${IVORY_BACKGROUND} ${NAVY_TEXT}`
const DIVIDED_CONTENT = `divide-y divide-[#506187]/20 ${IVORY_BACKGROUND}`
const GUIDED_READING_CLASSES = `guided-reading text-base leading-6 ${IVORY_TEXT} [&_a]:text-[#10245C] [&_a]:underline [&_h1]:font-serif [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:font-serif [&_h3]:text-xl [&_h3]:font-bold [&_li]:mb-2 [&_ol]:my-6 [&_ol]:pl-6 [&_p]:mb-6 [&_p:last-child]:mb-0 [&_ul]:my-6 [&_ul]:list-disc [&_ul]:pl-6`

/**
 * Titles such as these are editor defaults or block type labels. They are
 * useful in the builder, but do not add instructional meaning to a student
 * step that already has its own task heading.
 */
const TECHNICAL_TITLES = new Set([
  'tabla',
  'nueva tabla',
  'visualizador gramatical',
  'nuevo visualizador gramatical',
  'vocabulario',
  'nuevo vocabulario',
  'gramática',
  'gramatica',
  'nueva gramática',
  'nueva gramatica',
  'título',
  'titulo',
  'nuevo título',
  'nuevo titulo',
  'nueva sección',
  'nueva seccion',
])

export interface GuidedLessonBlockProps {
  block: Block
  children: ReactNode
  enabled?: boolean
  /** Hide a block heading when the viewer already renders the task heading. */
  suppressHeading?: boolean
}

export function isTechnicalGuidedTitle(title: string | undefined): boolean {
  if (!title) return false

  return TECHNICAL_TITLES.has(title.trim().toLocaleLowerCase('es-ES'))
}

function renderToken(token: { id: string; content: string; grammarType?: string }, index: number) {
  const tokenClass =
    token.grammarType === 'negation'
      ? NEGATION_TEXT
      : token.grammarType === 'action-verb' ||
          token.grammarType === 'auxiliary-verb' ||
          token.grammarType === 'linking-verb' ||
          token.grammarType === 'modal-verb'
        ? GREEN_TEXT
        : undefined

  return (
    <span key={token.id} className={tokenClass}>
      {index > 0 && token.grammarType !== 'punctuation' ? ' ' : null}
      {token.content}
    </span>
  )
}

/** Presentation-only blocks use real authored content; exercises keep their existing renderer. */
export function GuidedLessonBlock({
  block,
  children,
  enabled = true,
  suppressHeading = false,
}: GuidedLessonBlockProps) {
  if (!enabled) return children

  switch (block.type) {
    case 'title':
      if (suppressHeading || isTechnicalGuidedTitle(block.title) || !block.title.trim()) return null

      return (
        <h2 className={`font-serif text-3xl font-bold leading-8 ${NAVY_TEXT}`}>
          {block.title}
        </h2>
      )

    case 'text':
      return block.format === 'plain' ? (
        <p className={`whitespace-pre-wrap text-base leading-6 ${IVORY_TEXT}`}>
          {block.content}
        </p>
      ) : (
        <div
          className={GUIDED_READING_CLASSES}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.content) }}
        />
      )

    case 'vocabulary':
      // Rich item media keeps its established controls and playback semantics.
      if (!block.items.length || block.items.some((item) => item.image || item.audioUrl)) {
        return children
      }

      return (
        <dl className={DIVIDED_CONTENT}>
          {block.items.map((item) => (
            <div key={item.id} className="py-6 first:pt-0 last:pb-0">
              <dt className={`font-serif text-2xl font-bold leading-8 ${NAVY_TEXT}`}>
                {item.term}
              </dt>
              <dd className={`mt-2 text-base leading-6 ${NAVY_TEXT}`}>{item.definition}</dd>
              {item.pronunciation && (
                <dd className={`mt-2 text-base leading-6 ${SLATE_TEXT}`}>
                  {item.pronunciation}
                </dd>
              )}
              {item.example && (
                <dd
                  className={`mt-4 text-base leading-6 ${NAVY_TEXT}`}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.example) }}
                />
              )}
              {item.examples?.map((example, index) => (
                <dd
                  key={`${item.id}-example-${index}`}
                  className={`mt-4 text-base leading-6 ${NAVY_TEXT}`}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(example) }}
                />
              ))}
            </div>
          ))}
        </dl>
      )

    case 'grammar-visualizer':
      return (
        <div className={`space-y-8 text-base leading-6 ${IVORY_TEXT}`}>
          {block.description && <p className="whitespace-pre-line">{block.description}</p>}
          {block.sets.map((set) => (
            <section
              key={set.id}
              className="space-y-4"
              aria-labelledby={set.title ? `guided-grammar-set-${set.id}` : undefined}
            >
              {set.title && (
                <h3
                  id={`guided-grammar-set-${set.id}`}
                  className={`font-serif text-2xl font-bold leading-8 ${NAVY_TEXT}`}
                >
                  {set.title}
                </h3>
              )}
              {set.hint && (
                <p className={`whitespace-pre-line text-base leading-6 ${SLATE_TEXT}`}>
                  {set.hint}
                </p>
              )}
              {set.variants.map((variant) => (
                <div key={variant.id} className="border-b border-[#EEE8FA] pb-6 last:border-b-0">
                  <p className={`mb-2 text-base font-semibold leading-6 ${SLATE_TEXT}`}>
                    {variant.label}
                  </p>
                  <p className={`font-serif text-2xl leading-8 ${NAVY_TEXT}`}>
                    {variant.tokens.length
                      ? variant.tokens.map((token, index) => renderToken(token, index))
                      : variant.rawSentence}
                  </p>
                  {variant.hint && (
                    <p className={`mt-2 whitespace-pre-line text-base leading-6 ${SLATE_TEXT}`}>
                      {variant.hint}
                    </p>
                  )}
                </div>
              ))}
            </section>
          ))}
        </div>
      )

    case 'structured-content':
      return block.content ? (
        <div className={`overflow-x-auto ${IVORY_BACKGROUND}`}>
          {block.subtitle && (
            <p className={`mb-6 text-base leading-6 ${SLATE_TEXT}`}>{block.subtitle}</p>
          )}
          <table
            aria-label={block.title || 'Tabla de referencia'}
            className={`w-full text-left text-base leading-6 ${NAVY_TEXT}`}
          >
            <thead>
              <tr>
                {block.content.headers.map((header, index) => (
                  <th
                    key={index}
                    scope="col"
                    className={`border-b border-[#506187] py-3 pr-6 text-base font-semibold leading-6 ${SLATE_TEXT}`}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.content.rows.map((row, index) => (
                <tr key={index}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="border-b border-[#EEE8FA] py-3 pr-6">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )

    default:
      return children
  }
}
