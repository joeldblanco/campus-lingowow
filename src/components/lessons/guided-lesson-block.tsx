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
const SLATE_TEXT = 'text-[#506187]'
const GREEN_TEXT = 'text-[#08775E]'
const NEGATION_TEXT = 'text-[#C13E50]'
const GEORGIA_FONT = { fontFamily: 'Georgia, serif' }
const GUIDED_READING_CLASSES = `guided-reading text-base leading-6 ${NAVY_TEXT} [&_a]:text-[#10245C] [&_a]:underline [&_blockquote]:my-6 [&_blockquote]:rounded-[16px] [&_blockquote]:border-l-4 [&_blockquote]:border-[#08775E] [&_blockquote]:bg-[#EEE8FA] [&_blockquote]:px-4 [&_blockquote]:py-4 [&_strong]:font-bold [&_strong]:text-[#10245C] [&_h1]:font-serif [&_h1]:text-xl [&_h1]:font-bold [&_h2]:font-serif [&_h2]:text-xl [&_h2]:font-bold [&_h3]:font-serif [&_h3]:text-lg [&_h3]:font-bold [&_h4]:font-serif [&_h4]:text-lg [&_h4]:font-bold [&_li]:mb-2 [&_ol]:my-6 [&_ol]:pl-6 [&_p]:mb-6 [&_p:last-child]:mb-0 [&_ul]:my-6 [&_ul]:list-disc [&_ul]:pl-6`

const EMPTY_GUIDED_PARAGRAPH = /<p\b[^>]*>(?:(?:\s|&nbsp;|&#160;)|<br\s*\/?>)*<\/p>/gi

function sanitizeGuidedReadingHtml(content: string): string {
  return sanitizeHtml(content).replace(EMPTY_GUIDED_PARAGRAPH, '')
}

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
  'w-full sm:w-[52%]',
  'w-full sm:w-[40%] sm:ml-auto sm:mt-2',
  'w-full sm:w-[90%] sm:ml-[6%] sm:mt-1',
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
      className={`min-w-0 max-w-full rounded-[24px] border border-[#EEE8FA] bg-white px-3 py-3 shadow-[0_12px_28px_rgba(16,36,92,0.08)] sm:px-4 ${VOCABULARY_CARD_LAYOUT[index % VOCABULARY_CARD_LAYOUT.length]}`}
    >
      <dt
        className={`flex items-center gap-3 font-sans text-base font-semibold leading-6 ${SLATE_TEXT}`}
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EEE8FA] text-[#10245C]"
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <span>{item.term}</span>
      </dt>
      <dd
        className={`mt-1 font-serif text-xl font-normal leading-7 ${NAVY_TEXT}`}
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
      className="relative px-2 py-2 sm:px-4"
      aria-label={block.title || 'Vocabulario'}
    >
      <dl className="relative flex flex-wrap items-start gap-4 sm:gap-4">
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

function GrammarVariantPresentation({ variant, deferHint = false }: { variant: SentenceVariant; deferHint?: boolean }) {
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
      {variant.hint && !deferHint && (
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
          d="M54.4 18.2L66 19L61.2 8.4"
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
          <GrammarVariantPresentation variant={transition[0]} deferHint />
          {transition.length > 1 && <GrammarTransformationArrow />}
          {transition.slice(1).map((variant) => (
            <GrammarVariantPresentation key={variant.id} variant={variant} deferHint />
          ))}
        </div>
      )}
      {transition.filter((variant) => variant.hint).map((variant) => (
        <p key={`${variant.id}-hint`} className={`whitespace-pre-line font-sans text-base leading-6 ${SLATE_TEXT}`}>
          {variant.hint}
        </p>
      ))}
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

type GuidedTableCell = {
  text: string
  colSpan?: number
  rowSpan?: number
}

type GuidedTableGroup = {
  id: string
  label: string
  headers: GuidedTableCell[]
  rows: GuidedTableCell[][]
  notes: string[]
  indexColumn?: number
}

function tableSpan(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 2) return undefined
  return value
}

function guidedTableCell(value: unknown): GuidedTableCell | undefined {
  if (typeof value === 'string') return { text: value }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined

  const cell = value as Record<string, unknown>
  const text = typeof cell.text === 'string'
    ? cell.text
    : typeof cell.value === 'string'
      ? cell.value
      : typeof cell.content === 'string'
        ? cell.content
        : undefined
  if (text === undefined) return undefined

  return {
    text,
    colSpan: tableSpan(cell.colSpan),
    rowSpan: tableSpan(cell.rowSpan),
  }
}

function guidedTableCells(value: unknown): GuidedTableCell[] | undefined {
  if (!Array.isArray(value)) return undefined
  const cells = value.map(guidedTableCell)
  return cells.every((cell): cell is GuidedTableCell => Boolean(cell)) ? cells : undefined
}

function numericIndexColumn(headers: GuidedTableCell[], rows: GuidedTableCell[][]): number | undefined {
  const candidate = headers.findIndex((header) => header.text.trim() === '')
  if (candidate < 0 || rows.length < 2) return undefined
  const values = rows.map((row) => row[candidate]?.text.trim() || '')
  return values.every((value) => /^\d{1,3}[.)]?$/.test(value)) ? candidate : undefined
}

function explicitIndexColumn(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : undefined
}

/**
 * Builder-authored groups are the only opt-in path for splitting a source table.
 * Invalid or absent metadata falls back to the original table unchanged.
 */
function getGuidedTableGroups(block: Extract<Block, { type: 'structured-content' }>): GuidedTableGroup[] | undefined {
  const rawGroups = block.data?.tableGroups
  if (!Array.isArray(rawGroups) || rawGroups.length === 0) return undefined

  const groups = rawGroups.map((rawGroup, index): GuidedTableGroup | undefined => {
    if (!rawGroup || typeof rawGroup !== 'object' || Array.isArray(rawGroup)) return undefined
    const group = rawGroup as Record<string, unknown>
    const headers = guidedTableCells(group.headers)
    const rawRows = Array.isArray(group.rows) ? group.rows : undefined
    if (!headers || !rawRows) return undefined

    const rows: GuidedTableCell[][] = []
    for (const rawRow of rawRows) {
      const cells = Array.isArray(rawRow)
        ? guidedTableCells(rawRow)
        : rawRow && typeof rawRow === 'object' && !Array.isArray(rawRow)
          ? guidedTableCells((rawRow as Record<string, unknown>).cells)
          : undefined
      if (!cells) return undefined
      rows.push(cells)
    }

    const id = typeof group.key === 'string' && group.key.trim()
      ? group.key.trim()
      : typeof group.id === 'string' && group.id.trim()
        ? group.id.trim()
        : `group-${index + 1}`
    const label = typeof group.sourceHeader === 'string' && group.sourceHeader.trim()
      ? group.sourceHeader.trim()
      : typeof group.title === 'string' && group.title.trim()
        ? group.title.trim()
        : `${block.title || 'Tabla de referencia'} ${index + 1}`
    const notes = Array.isArray(group.notes)
      ? group.notes.filter((note): note is string => typeof note === 'string')
      : []
    const indexColumn = explicitIndexColumn(group.indexColumn) ?? numericIndexColumn(headers, rows)

    return { id, label, headers, rows, notes, indexColumn }
  })

  return groups.every((group): group is GuidedTableGroup => Boolean(group)) ? groups : undefined
}

function GuidedTableCellContent({ cell }: { cell: GuidedTableCell }) {
  return <>{cell.text}</>
}

function GuidedTablePanel({
  id,
  label,
  headers,
  rows,
  notes,
  indexColumn,
}: {
  id: string
  label: string
  headers: GuidedTableCell[]
  rows: GuidedTableCell[][]
  notes: string[]
  indexColumn?: number
}) {
  return (
    <section data-guided-table-group={id} className="overflow-x-auto rounded-[20px] border border-[#EEE8FA] bg-white p-2 sm:p-3">
      <table
        aria-label={label}
        className={`w-full min-w-[240px] table-fixed border-separate border-spacing-0 text-left text-base leading-6 ${NAVY_TEXT}`}
      >
        <caption className="sr-only">{label}</caption>
        <thead className="bg-[#EEE8FA]">
          <tr>
            {headers.map((header, index) => (
              <th
                key={index}
                scope="col"
                colSpan={header.colSpan}
                rowSpan={header.rowSpan}
                className={`whitespace-pre-wrap break-words border-b border-[#EEE8FA] px-3 py-2.5 align-top font-sans text-base font-semibold leading-6 ${SLATE_TEXT} ${index === 0 ? 'rounded-tl-[16px]' : ''} ${index === headers.length - 1 ? 'rounded-tr-[16px]' : ''} ${index === indexColumn ? 'w-12 min-w-12' : ''}`}
              >
                <GuidedTableCellContent cell={header} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className={rowIndex % 2 === 1 ? 'bg-[#FAF8F4]' : 'bg-white'}>
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  colSpan={cell.colSpan}
                  rowSpan={cell.rowSpan}
                  className={`whitespace-pre-wrap break-words border-b border-[#EEE8FA] px-3 py-2 align-top font-serif text-lg leading-6 ${NAVY_TEXT} ${rowIndex === rows.length - 1 ? 'border-b-0' : ''} ${cellIndex === indexColumn ? 'w-12 min-w-12' : ''}`}
                  style={GEORGIA_FONT}
                >
                  <GuidedTableCellContent cell={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {notes.length > 0 && (
        <div data-guided-table-notes className={`space-y-3 px-3 pt-3 text-base leading-6 ${NAVY_TEXT}`}>
          {notes.map((note, index) => <p key={index} className="whitespace-pre-wrap">{note}</p>)}
        </div>
      )}
    </section>
  )
}

function StructuredContentPresentation({
  block,
}: {
  block: Extract<Block, { type: 'structured-content' }>
}) {
  const content = block.content
  if (!content) return null

  const groups = getGuidedTableGroups(block)
  if (groups) {
    return (
      <div
        data-guided-table
        data-guided-table-grouped
        className="rounded-[24px] border border-[#EEE8FA] bg-white p-2 shadow-[0_12px_28px_rgba(16,36,92,0.07)] sm:p-3"
      >
        {block.subtitle && (
          <p className={`px-3 pb-3 pt-2 text-base leading-6 ${SLATE_TEXT}`}>{block.subtitle}</p>
        )}
        <div data-guided-table-panels className="space-y-4">
          {groups.map((group) => (
            <GuidedTablePanel
              key={group.id}
              id={group.id}
              label={group.label}
              headers={group.headers}
              rows={group.rows}
              notes={group.notes}
              indexColumn={group.indexColumn}
            />
          ))}
        </div>
      </div>
    )
  }

  const headers = content.headers.map((text) => ({ text }))
  const rows = content.rows.map((row) => row.map((text) => ({ text })))
  const indexColumn = numericIndexColumn(headers, rows)

  return (
    <div
      data-guided-table
      className="overflow-x-auto rounded-[24px] border border-[#EEE8FA] bg-white p-2 shadow-[0_12px_28px_rgba(16,36,92,0.07)] sm:p-3"
    >
      {block.subtitle && (
        <p className={`px-3 pb-3 pt-2 text-base leading-6 ${SLATE_TEXT}`}>{block.subtitle}</p>
      )}
      <table
        aria-label={block.title || 'Tabla de referencia'}
        className={`w-full min-w-[240px] table-fixed border-separate border-spacing-0 text-left text-base leading-6 ${NAVY_TEXT}`}
      >
        <caption className="sr-only">{block.title || 'Tabla de referencia'}</caption>
        <thead className="bg-[#EEE8FA]">
          <tr>
            {headers.map((header, index) => (
              <th
                key={index}
                scope="col"
                className={`whitespace-pre-wrap break-words border-b border-[#EEE8FA] px-3 py-2.5 font-sans text-base font-semibold leading-6 ${SLATE_TEXT} ${index === 0 ? 'rounded-tl-[16px]' : ''} ${index === headers.length - 1 ? 'rounded-tr-[16px]' : ''} ${index === indexColumn ? 'w-12 min-w-12' : ''}`}
              >
                {header.text}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className={index % 2 === 1 ? 'bg-[#FAF8F4]' : 'bg-white'}>
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={`whitespace-pre-wrap break-words border-b border-[#EEE8FA] px-3 py-1 align-top font-serif text-lg leading-6 ${NAVY_TEXT} ${index === rows.length - 1 ? 'border-b-0' : ''} ${cellIndex === indexColumn ? 'w-12 min-w-12' : ''}`}
                  style={GEORGIA_FONT}
                >
                  {cell.text}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
        <p className={`whitespace-pre-wrap text-base leading-6 ${NAVY_TEXT}`}>{block.content}</p>
      ) : (
        <div
          className={GUIDED_READING_CLASSES}
          dangerouslySetInnerHTML={{ __html: sanitizeGuidedReadingHtml(block.content) }}
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
        <div className={`space-y-8 text-base leading-6 ${NAVY_TEXT}`}>
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
      return block.content ? <StructuredContentPresentation block={block} /> : children

    default:
      return children
  }
}
