import type { ReactNode } from 'react'
import type { Block } from '@/types/course-builder'
import { sanitizeHtml } from '@/lib/sanitize-html'

/** Presentation-only blocks use real authored content; exercises keep their existing renderer. */
export function GuidedLessonBlock({ block, children, enabled = true }: { block: Block; children: ReactNode; enabled?: boolean }) {
  if (!enabled) return children
  switch (block.type) {
    case 'title':
      return <p className="font-serif text-xl text-[#10245c]">{block.title}</p>
    case 'text':
      return block.format === 'plain' ? (
        <p className="whitespace-pre-wrap text-lg leading-relaxed text-[#10245c]">{block.content}</p>
      ) : (
        <div className="guided-reading text-lg leading-relaxed text-[#10245c] [&_p]:mb-4 [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.content) }} />
      )
    case 'vocabulary':
      // Rich item media keeps its established controls and playback semantics.
      if (block.items.some((item) => item.image || item.audioUrl)) return children
      return (
        <dl className="flex flex-wrap gap-x-8 gap-y-5">
          {block.items.map((item) => (
            <div key={item.id} className="min-w-0 basis-full sm:basis-[calc(50%-1rem)]">
              <dt className="text-sm font-semibold text-[#08775e]">{item.term}</dt>
              <dd className="mt-1 font-serif text-2xl leading-snug text-[#10245c]">{item.definition}</dd>
              {item.pronunciation && <dd className="mt-1 text-sm">{item.pronunciation}</dd>}
              {item.example && <dd className="mt-2 text-base" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.example) }} />}
              {item.examples?.map((example, index) => <dd key={index} className="mt-2 text-base" dangerouslySetInnerHTML={{ __html: sanitizeHtml(example) }} />)}
            </div>
          ))}
        </dl>
      )
    case 'grammar-visualizer':
      return (
        <div className="space-y-8">
          {block.description && <p className="text-base leading-relaxed">{block.description}</p>}
          {block.sets.map((set) => (
            <div key={set.id} className="space-y-4">
              {block.sets.length > 1 && <h3 className="font-serif text-2xl">{set.title}</h3>}
              {set.hint && <p className="whitespace-pre-line text-base">{set.hint}</p>}
              {set.variants.map((variant, index) => (
                <div key={variant.id} className={index % 2 ? 'ml-4 sm:ml-10' : 'mr-4 sm:mr-10'}>
                  <p className="mb-1 text-sm font-semibold text-[#506187]">{variant.label}</p>
                  <div className="rounded-[2rem_2rem_2rem_0.4rem] bg-white px-5 py-4 font-serif text-2xl leading-relaxed text-[#10245c] sm:text-3xl">
                    {variant.tokens.length ? variant.tokens.map((token, tokenIndex) => (
                      <span key={token.id} className={token.grammarType === 'negation' ? 'text-[#dc5968]' : token.grammarType === 'linking-verb' || token.grammarType === 'auxiliary-verb' ? 'text-[#08775e]' : undefined}>
                        {tokenIndex > 0 && token.grammarType !== 'punctuation' ? ' ' : ''}{token.content}
                      </span>
                    )) : variant.rawSentence}
                  </div>
                  {variant.hint && <p className="mt-2 whitespace-pre-line text-base leading-relaxed text-[#506187]">{variant.hint}</p>}
                </div>
              ))}
            </div>
          ))}
        </div>
      )
    case 'structured-content':
      return block.content ? (
        <div className="overflow-x-auto">
          {block.subtitle && <p className="mb-3 text-base text-[#506187]">{block.subtitle}</p>}
          <table className="w-full text-left text-base text-[#10245c]">
            <caption className="sr-only">{block.title || 'Tabla de referencia'}</caption>
            <thead><tr>{block.content.headers.map((header, index) => <th key={index} scope="col" className="border-b border-[#d9d0e5] py-3 pr-5 text-sm font-semibold text-[#506187]">{header}</th>)}</tr></thead>
            <tbody>{block.content.rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex} className="border-b border-[#e8e2ef] py-3 pr-5">{cell}</td>)}</tr>)}</tbody>
          </table>
        </div>
      ) : children
    default:
      return children
  }
}
