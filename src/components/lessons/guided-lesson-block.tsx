import type { ReactNode } from 'react'
import type { Block } from '@/types/course-builder'
import { sanitizeHtml } from '@/lib/sanitize-html'

const NAVY_TEXT = 'text-[#10245C]'
const IVORY_BACKGROUND = 'bg-[#FAF8F4]'
const SLATE_TEXT = 'text-[#506187]'
const GREEN_TEXT = 'text-[#08775E]'
const NEGATION_TEXT = 'text-[#C13E50]'
const IVORY_TEXT = `${IVORY_BACKGROUND} ${NAVY_TEXT}`
const GEORGIA_FONT = { fontFamily: 'Georgia, serif' }
const GUIDED_READING_CLASSES = `guided-reading text-base leading-6 ${IVORY_TEXT} [&_a]:text-[#10245C] [&_a]:underline [&_h1]:font-serif [&_h1]:text-xl [&_h1]:font-bold [&_h2]:font-serif [&_h2]:text-xl [&_h2]:font-bold [&_h3]:font-serif [&_h3]:text-lg [&_h3]:font-bold [&_h4]:font-serif [&_h4]:text-lg [&_h4]:font-bold [&_li]:mb-2 [&_ol]:my-6 [&_ol]:pl-6 [&_p]:mb-6 [&_p:last-child]:mb-0 [&_ul]:my-6 [&_ul]:list-disc [&_ul]:pl-6`

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
        <h2 className={`font-serif text-3xl font-bold leading-8 ${NAVY_TEXT}`} style={GEORGIA_FONT}>
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
        <dl className={`grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 ${IVORY_BACKGROUND}`}>
          {block.items.map((item) => (
            <div key={item.id} className="min-w-0 space-y-2">
              <dt className={`font-sans text-base font-semibold leading-6 ${SLATE_TEXT}`}>
                {item.term}
              </dt>
              <dd className={`font-serif text-xl font-normal leading-7 ${NAVY_TEXT}`} style={GEORGIA_FONT}>
                {item.definition}
              </dd>
              {item.pronunciation && (
                <dd className={`pt-2 font-sans text-base leading-6 ${SLATE_TEXT}`}>
                  {item.pronunciation}
                </dd>
              )}
              {item.example && (
                <dd
                  className={`pt-2 font-sans text-base leading-6 ${NAVY_TEXT}`}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.example) }}
                />
              )}
              {item.examples?.map((example, index) => (
                <dd
                  key={`${item.id}-example-${index}`}
                  className={`pt-2 font-sans text-base leading-6 ${NAVY_TEXT}`}
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
              {set.title &&
                (suppressHeading && block.sets.length === 1 ? (
                  <p
                    id={`guided-grammar-set-${set.id}`}
                    className={`text-base leading-6 ${SLATE_TEXT}`}
                  >
                    {set.title}
                  </p>
                ) : (
                  <h3
                    id={`guided-grammar-set-${set.id}`}
                    className={`font-sans text-base font-semibold leading-6 ${SLATE_TEXT}`}
                  >
                    {set.title}
                  </h3>
                ))}
              {set.hint && (
                <p className={`whitespace-pre-line text-base leading-6 ${SLATE_TEXT}`}>
                  {set.hint}
                </p>
              )}
              {set.variants.map((variant, index) => (
                <div
                  key={variant.id}
                  className={`${index % 2 === 0 ? 'mr-4 sm:mr-8' : 'ml-4 sm:ml-8'} ${index === set.variants.length - 1 ? 'pb-2' : 'pb-6'}`}
                >
                  <p className={`mb-2 font-sans text-base font-semibold leading-6 ${SLATE_TEXT}`}>
                    {variant.label}
                  </p>
                  <p
                    className={`rounded-[2rem_2rem_2rem_0.4rem] border border-[#506187] bg-[#EEE8FA] px-4 py-3 font-serif text-2xl font-normal leading-8 ${NAVY_TEXT}`}
                    style={GEORGIA_FONT}
                  >
                    {variant.tokens.length
                      ? variant.tokens.map((token, index) => renderToken(token, index))
                      : variant.rawSentence}
                  </p>
                  {variant.hint && (
                    <p className={`mt-2 whitespace-pre-line font-sans text-base leading-6 ${SLATE_TEXT}`}>
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
                    className={`whitespace-pre-wrap border-b border-[#506187] py-3 pr-6 font-sans text-base font-semibold leading-6 ${SLATE_TEXT}`}
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
                    <td
                      key={cellIndex}
                      className={`whitespace-pre-wrap border-b border-[#EEE8FA] py-3 pr-6 font-sans text-base leading-6 ${NAVY_TEXT}`}
                    >
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
