import type { ReactNode } from 'react'
import {
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Globe2,
  HeartHandshake,
  MapPin,
  Phone,
  SpellCheck2,
  UserRound,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import type { Block, SentenceVariant } from '@/types/course-builder'
import { sanitizeHtml } from '@/lib/sanitize-html'

const NAVY_TEXT = 'text-[#10245C]'
const IVORY_BACKGROUND = 'bg-[#FAF8F4]'
const SLATE_TEXT = 'text-[#506187]'
const GREEN_TEXT = 'text-[#08775E]'
const NEGATION_TEXT = 'text-[#C13E50]'
const IVORY_TEXT = `${IVORY_BACKGROUND} ${NAVY_TEXT}`
const GEORGIA_FONT = { fontFamily: 'Georgia, serif' }
const GUIDED_READING_CLASSES = `guided-reading text-base leading-6 ${IVORY_TEXT} [&_a]:text-[#10245C] [&_a]:underline [&_blockquote]:my-6 [&_blockquote]:rounded-[16px] [&_blockquote]:border-l-4 [&_blockquote]:border-[#08775E] [&_blockquote]:bg-[#EEE8FA] [&_blockquote]:px-4 [&_blockquote]:py-4 [&_strong]:font-bold [&_strong]:text-[#10245C] [&_h1]:font-serif [&_h1]:text-xl [&_h1]:font-bold [&_h2]:font-serif [&_h2]:text-xl [&_h2]:font-bold [&_h3]:font-serif [&_h3]:text-lg [&_h3]:font-bold [&_h4]:font-serif [&_h4]:text-lg [&_h4]:font-bold [&_li]:mb-2 [&_ol]:my-6 [&_ol]:pl-6 [&_p]:mb-6 [&_p:last-child]:mb-0 [&_ul]:my-6 [&_ul]:list-disc [&_ul]:pl-6`

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

const VOCABULARY_ICON_RULES: Array<{ terms: string[]; icon: LucideIcon }> = [
  { terms: ['marital status', 'maritalstatus', 'estado civil'], icon: HeartHandshake },
  { terms: ['occupation', 'profesion', 'profesión', 'trabajo'], icon: BriefcaseBusiness },
  { terms: ['spelling', 'deletreo', 'deletrear'], icon: SpellCheck2 },
  { terms: ['address', 'direccion', 'dirección', 'domicilio'], icon: MapPin },
  { terms: ['phone', 'telefono', 'teléfono', 'telephone', 'mobile'], icon: Phone },
  { terms: ['origin', 'origen', 'from', 'nationality', 'nacionalidad'], icon: Globe2 },
  { terms: ['family', 'familia', 'relatives', 'parientes'], icon: UsersRound },
  { terms: ['age', 'edad', 'years old'], icon: CalendarDays },
  { terms: ['name', 'nombre'], icon: UserRound },
]

const VOCABULARY_CARD_LAYOUT = [
  'w-full sm:w-[54%]',
  'w-full sm:w-[42%] sm:ml-auto sm:mt-4',
  'w-full sm:w-[50%] sm:ml-[6%] sm:mt-2',
]

function normalizeVocabularyTerm(term: string): string {
  return term
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('en-US')
}

function getVocabularyIcon(term: string): LucideIcon {
  const normalizedTerm = normalizeVocabularyTerm(term)
  const match = VOCABULARY_ICON_RULES.find(({ terms }) =>
    terms.some((candidate) => normalizedTerm.includes(normalizeVocabularyTerm(candidate)))
  )

  return match?.icon || BookOpen
}

function renderVocabularyValue(value: string) {
  return <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }} />
}

function renderVocabularyCard(
  item: Extract<Block, { type: 'vocabulary' }>['items'][number],
  index: number
) {
  const Icon = getVocabularyIcon(item.term)

  return (
    <div
      key={item.id}
      data-guided-vocabulary-card={item.id}
      className={`min-w-0 max-w-full rounded-[24px] border border-[#EEE8FA] bg-white px-5 py-5 shadow-[0_12px_28px_rgba(16,36,92,0.08)] sm:px-6 ${VOCABULARY_CARD_LAYOUT[index % VOCABULARY_CARD_LAYOUT.length]}`}
    >
      <dt
        className={`flex items-center gap-3 font-sans text-base font-semibold leading-6 ${SLATE_TEXT}`}
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EEE8FA] text-[#10245C]"
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <span>{item.term}</span>
      </dt>
      <dd
        className={`mt-4 font-serif text-xl font-normal leading-7 ${NAVY_TEXT} sm:text-2xl sm:leading-8`}
        style={GEORGIA_FONT}
      >
        {renderVocabularyValue(item.definition)}
      </dd>
      {item.pronunciation && (
        <dd className={`mt-4 font-sans text-base leading-6 ${SLATE_TEXT}`}>{item.pronunciation}</dd>
      )}
      {item.example && (
        <dd
          className={`mt-4 font-sans text-base leading-6 ${NAVY_TEXT}`}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.example) }}
        />
      )}
      {item.examples?.map((example, exampleIndex) => (
        <dd
          key={`${item.id}-example-${exampleIndex}`}
          className={`mt-4 font-sans text-base leading-6 ${NAVY_TEXT}`}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(example) }}
        />
      ))}
    </div>
  )
}

function VocabularyPresentation({ block }: { block: Extract<Block, { type: 'vocabulary' }> }) {
  return (
    <section
      data-guided-vocabulary
      className="relative isolate overflow-hidden rounded-[24px] bg-[#FAF8F4] px-2 py-2 sm:px-4"
      aria-label={block.title || 'Vocabulario'}
    >
      <div
        className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#EEE8FA]/70"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-28 left-1/4 h-56 w-72 -rotate-6 rounded-[48%] bg-[#EEE8FA]/45"
        aria-hidden="true"
      />
      <dl className="relative flex flex-wrap items-start gap-4 sm:gap-6">
        {block.items.map(renderVocabularyCard)}
      </dl>
    </section>
  )
}

function normalizeGrammarLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-US')
}

function isNegativeVariant(variant: SentenceVariant): boolean {
  const label = normalizeGrammarLabel(`${variant.label} ${variant.rawSentence}`)
  return label.includes('negative') || label.includes('negativo') || label.includes('not ')
}

function isQuestionVariant(variant: SentenceVariant): boolean {
  const label = normalizeGrammarLabel(`${variant.label} ${variant.rawSentence}`)
  return (
    label.includes('question') ||
    label.includes('interrogative') ||
    label.includes('interrogativo') ||
    label.includes('pregunta') ||
    variant.rawSentence.trim().endsWith('?')
  )
}

function isAffirmativeVariant(variant: SentenceVariant): boolean {
  const label = normalizeGrammarLabel(`${variant.label} ${variant.rawSentence}`)
  return label.includes('affirmative') || label.includes('afirmativo') || label.includes('positive')
}

function getGrammarVariantGroups(variants: SentenceVariant[]) {
  const negatives = variants.filter(isNegativeVariant)
  const candidates = variants.filter((variant) => !negatives.includes(variant))
  const affirmative = candidates.find(isAffirmativeVariant) || candidates[0]
  const question =
    candidates.find((variant) => variant !== affirmative && isQuestionVariant(variant)) ||
    candidates.find((variant) => variant !== affirmative)
  const transition = [affirmative, question].filter((variant): variant is SentenceVariant =>
    Boolean(variant)
  )
  const used = new Set([...transition, ...negatives])

  return {
    transition,
    negatives,
    extras: variants.filter((variant) => !used.has(variant)),
  }
}

function GrammarVariantPresentation({ variant }: { variant: SentenceVariant }) {
  return (
    <article data-guided-grammar-variant={variant.id} className="min-w-0 flex-1">
      <p className={`mb-2 font-sans text-base font-semibold leading-6 ${SLATE_TEXT}`}>
        {variant.label}
      </p>
      <p
        data-guided-grammar-sentence
        aria-label={variant.rawSentence}
        className={`rounded-[24px] border border-[#EEE8FA] bg-white px-5 py-4 font-serif text-2xl font-normal leading-8 shadow-[0_10px_24px_rgba(16,36,92,0.07)] ${NAVY_TEXT}`}
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
    </article>
  )
}

function GrammarTransformationArrow() {
  return (
    <span
      data-guided-grammar-arrow
      className="flex shrink-0 items-center justify-center self-center text-[#245CFF] md:h-14 md:w-16"
      aria-hidden="true"
    >
      <svg viewBox="0 0 72 40" className="h-10 w-16 overflow-visible" fill="none">
        <path
          d="M3 29C18 4 43 3 66 19"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="m56 17 11 2-5 9"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

function GrammarSetPresentation({
  set,
  setIndex,
  setCount,
  suppressHeading,
}: {
  set: Extract<Block, { type: 'grammar-visualizer' }>['sets'][number]
  setIndex: number
  setCount: number
  suppressHeading: boolean
}) {
  const { transition, negatives, extras } = getGrammarVariantGroups(set.variants)

  return (
    <section
      key={set.id}
      data-guided-grammar-set={set.id}
      className="space-y-4"
      aria-labelledby={set.title ? `guided-grammar-set-${set.id}` : undefined}
    >
      {set.title &&
        (suppressHeading && setCount === 1 ? (
          <p id={`guided-grammar-set-${set.id}`} className={`text-base leading-6 ${SLATE_TEXT}`}>
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
        <p className={`whitespace-pre-line font-sans text-base leading-6 ${SLATE_TEXT}`}>
          {set.hint}
        </p>
      )}
      {transition.length > 0 && (
        <div
          data-guided-grammar-transition
          className="flex flex-col gap-4 md:flex-row md:items-center md:gap-3"
        >
          <GrammarVariantPresentation variant={transition[0]} />
          {transition.length > 1 && <GrammarTransformationArrow />}
          {transition.slice(1).map((variant) => (
            <GrammarVariantPresentation key={variant.id} variant={variant} />
          ))}
        </div>
      )}
      {negatives.length > 0 && (
        <div data-guided-grammar-negative className="flex flex-col gap-4 md:mx-auto md:max-w-[72%]">
          {negatives.map((variant) => (
            <GrammarVariantPresentation key={variant.id} variant={variant} />
          ))}
        </div>
      )}
      {extras.length > 0 && (
        <div data-guided-grammar-additional className="flex flex-col gap-4">
          {extras.map((variant) => (
            <GrammarVariantPresentation key={variant.id} variant={variant} />
          ))}
        </div>
      )}
      {setIndex < setCount - 1 && <div className="h-2" aria-hidden="true" />}
    </section>
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
        <p className={`whitespace-pre-wrap text-base leading-6 ${IVORY_TEXT}`}>{block.content}</p>
      ) : (
        <div
          className={GUIDED_READING_CLASSES}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.content) }}
        />
      )

    case 'vocabulary':
      // Rich item media keeps its established controls and playback semantics.
      if (
        !block.items.length ||
        block.items.some((item) => Boolean(item.image?.trim() || item.audioUrl?.trim()))
      ) {
        return children
      }

      return <VocabularyPresentation block={block} />

    case 'grammar-visualizer':
      return (
        <div className={`space-y-8 text-base leading-6 ${IVORY_TEXT}`}>
          {block.description && <p className="whitespace-pre-line">{block.description}</p>}
          {block.sets.map((set, setIndex) => (
            <GrammarSetPresentation
              key={set.id}
              set={set}
              setIndex={setIndex}
              setCount={block.sets.length}
              suppressHeading={suppressHeading}
            />
          ))}
        </div>
      )

    case 'structured-content':
      return block.content ? (
        <div
          data-guided-table
          className="overflow-x-auto rounded-[24px] border border-[#EEE8FA] bg-white p-2 shadow-[0_12px_28px_rgba(16,36,92,0.07)] sm:p-3"
        >
          {block.subtitle && (
            <p className={`px-3 pb-3 pt-2 text-base leading-6 ${SLATE_TEXT}`}>{block.subtitle}</p>
          )}
          <table
            aria-label={block.title || 'Tabla de referencia'}
            className={`w-full min-w-[360px] table-fixed border-separate border-spacing-0 text-left text-base leading-6 ${NAVY_TEXT}`}
          >
            <caption className="sr-only">{block.title || 'Tabla de referencia'}</caption>
            <thead className="bg-[#EEE8FA]">
              <tr>
                {block.content.headers.map((header, index) => (
                  <th
                    key={index}
                    scope="col"
                    className={`whitespace-pre-wrap border-b border-[#EEE8FA] px-3 py-2.5 font-sans text-base font-semibold leading-6 ${SLATE_TEXT} ${index === 0 ? 'rounded-tl-[16px]' : ''} ${index === block.content!.headers.length - 1 ? 'rounded-tr-[16px]' : ''}`}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.content.rows.map((row, index) => (
                <tr key={index} className={index % 2 === 1 ? 'bg-[#FAF8F4]' : 'bg-white'}>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={`whitespace-pre-wrap border-b border-[#EEE8FA] px-3 py-2 font-sans text-base leading-6 ${NAVY_TEXT} ${index === block.content!.rows.length - 1 ? 'border-b-0' : ''}`}
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
