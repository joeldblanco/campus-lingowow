import Image from 'next/image'
import { Lightbulb, Mail, MapPin, Phone } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Block } from '@/types/course-builder'

export const UNIT1_TEACHING_ROLES = [
  'introductions',
  'contact',
  'questions',
  'transform',
  'possessives',
  'intro-audio-notes',
] as const

export type Unit1TeachingRole = (typeof UNIT1_TEACHING_ROLES)[number]

const NAVY_TEXT = 'text-[#10245C]'
const SLATE_TEXT = 'text-[#506187]'
const TEAL_TEXT = 'text-[#08775E]'
const NEGATION_TEXT = 'text-[#C13E50]'
const EXAMPLE_TEXT = `font-[Georgia,serif] text-[20px] leading-8 sm:text-[22px] sm:leading-9 ${NAVY_TEXT}`
const BODY_TEXT = `font-sans text-base leading-6 ${NAVY_TEXT}`

const TO_BE_ROWS = [
  ['I', 'am'],
  ['You', 'are'],
  ['He / She / It', 'is'],
  ['We', 'are'],
  ['They', 'are'],
] as const

const POSSESSIVE_ROWS = [
  ['I', 'My', 'mi'],
  ['You', 'Your', 'tu / su'],
  ['He', 'His', 'su (de él)'],
  ['She', 'Her', 'su (de ella)'],
  ['It', 'Its', 'su (de cosa o animal)'],
  ['We', 'Our', 'nuestro / nuestra'],
  ['You', 'Your', 'su (de ustedes)'],
  ['They', 'Their', 'sus (de ellos)'],
] as const

function isUnit1TeachingRole(value: unknown): value is Unit1TeachingRole {
  return typeof value === 'string' && (UNIT1_TEACHING_ROLES as readonly string[]).includes(value)
}

function getUnit1TeachingRole(block: Block): Unit1TeachingRole | undefined {
  const data = block.data
  if (!data || typeof data !== 'object') return undefined

  const role = (data as Record<string, unknown>).unit1Role
  return isUnit1TeachingRole(role) ? role : undefined
}

export function isUnit1TeachingBlock(block: Block): boolean {
  return getUnit1TeachingRole(block) !== undefined
}

interface Unit1TeachingProps {
  block: Block
}

function ExampleText({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={`${EXAMPLE_TEXT} ${className}`.trim()} data-unit1-example>
      {children}
    </p>
  )
}

function Teal({ children }: { children: ReactNode }) {
  return (
    <span className={`font-semibold ${TEAL_TEXT}`} data-unit1-teal>
      {children}
    </span>
  )
}

function Verb({ children }: { children: ReactNode }) {
  return <Teal>{children}</Teal>
}

function Translation({ children }: { children: ReactNode }) {
  return <p className={`mt-1 font-sans text-base leading-6 ${SLATE_TEXT}`}>{children}</p>
}

function Arrow({ id }: { id: string }) {
  return (
    <svg
      aria-hidden="true"
      className="h-10 w-14 shrink-0 self-center text-[#245CFF]"
      data-unit1-arrow="question"
      data-unit1-arrowhead-tangent="true"
      viewBox="0 0 56 40"
      fill="none"
      focusable="false"
    >
      <defs>
        <marker
          id={`unit1-arrowhead-${id}`}
          markerHeight="8"
          markerWidth="8"
          orient="auto"
          refX="6"
          refY="4"
          viewBox="0 0 8 8"
        >
          <path d="M0 0L8 4L0 8Z" fill="currentColor" />
        </marker>
      </defs>
      <path
        d="M5 4C5 16 27 17 48 32"
        markerEnd={`url(#unit1-arrowhead-${id})`}
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.5"
      />
    </svg>
  )
}

function TeachingTip({ children }: { children: ReactNode }) {
  return (
    <div className="mt-8 flex items-start gap-3" data-unit1-tip>
      <Lightbulb
        aria-hidden="true"
        className="mt-1 h-6 w-6 shrink-0 text-[#10245C]"
        strokeWidth={1.7}
      />
      <p className={`${BODY_TEXT} max-w-[34rem]`}>{children}</p>
    </div>
  )
}

function IntroductionsTeaching() {
  return (
    <div className="max-w-[38rem] space-y-6" data-unit1-teaching-content="introductions">
      <p className={`font-sans text-base leading-6 ${NAVY_TEXT}`} data-unit1-practice-label>
        Ejemplos para practicar
      </p>
      <ul className="m-0 list-none space-y-5 p-0" data-unit1-examples="introductions">
        <li data-unit1-example-row>
          <ExampleText>
            My <Teal>name</Teal> is Peter.
          </ExampleText>
          <p className={`mt-1 ${BODY_TEXT} ${SLATE_TEXT}`}>→ Nombre</p>
        </li>
        <li data-unit1-example-row>
          <ExampleText>
            I am <Teal>20 years old</Teal>.
          </ExampleText>
          <p className={`mt-1 ${BODY_TEXT} ${SLATE_TEXT}`}>→ Edad</p>
        </li>
        <li data-unit1-example-row>
          <ExampleText>
            I am <Teal>from</Teal> the US.
          </ExampleText>
          <p className={`mt-1 ${BODY_TEXT} ${SLATE_TEXT}`}>→ Origen</p>
        </li>
        <li data-unit1-example-row>
          <ExampleText>
            She is <Teal>a teacher</Teal>.
          </ExampleText>
          <p className={`mt-1 ${BODY_TEXT} ${SLATE_TEXT}`}>→ Ocupación</p>
        </li>
      </ul>

      <TeachingTip>Ahora piensa en tus propios datos.</TeachingTip>
    </div>
  )
}

function ContactTeaching() {
  return (
    <div className="max-w-[38rem] space-y-8" data-unit1-teaching-content="contact">
      <p className={`font-sans text-sm leading-6 ${SLATE_TEXT}`} data-unit1-example-note>
        Ejemplo ficticio para practicar.
      </p>

      <div className="space-y-7" data-unit1-contact-examples>
        <div className="flex items-start gap-4" data-unit1-example-row>
          <MapPin
            aria-hidden="true"
            className="mt-1 h-6 w-6 shrink-0 text-[#10245C]"
            strokeWidth={1.7}
          />
          <div>
            <p className={`font-sans text-base leading-6 ${SLATE_TEXT}`}>Vivo en...</p>
            <ExampleText>
              I live in <Teal>New York</Teal>.
            </ExampleText>
          </div>
        </div>

        <div className="flex items-start gap-4" data-unit1-example-row>
          <Phone
            aria-hidden="true"
            className="mt-1 h-6 w-6 shrink-0 text-[#10245C]"
            strokeWidth={1.7}
          />
          <div>
            <p className={`font-sans text-base leading-6 ${SLATE_TEXT}`}>Mi teléfono...</p>
            <ExampleText>
              My phone number is
              <br />
              <span className="whitespace-nowrap">01 154 8593.</span>
            </ExampleText>
          </div>
        </div>

        <div className="flex items-start gap-4" data-unit1-example-row>
          <Mail
            aria-hidden="true"
            className="mt-1 h-6 w-6 shrink-0 text-[#10245C]"
            strokeWidth={1.7}
          />
          <div>
            <p className={`font-sans text-base leading-6 ${SLATE_TEXT}`}>Mi correo...</p>
            <ExampleText>
              My email is
              <br />
              <span className="whitespace-nowrap">peter@example.com.</span>
            </ExampleText>
          </div>
        </div>
      </div>

      <TeachingTip>
        Para decir dónde vives, usamos <Teal>live</Teal>.
      </TeachingTip>
    </div>
  )
}

function QuestionChain({
  affirmative,
  interrogative,
  negative,
  id,
}: {
  affirmative: ReactNode
  interrogative: ReactNode
  negative: ReactNode
  id: string
}) {
  return (
    <div className="space-y-1" data-unit1-question-chain={id}>
      <div className="flex items-center gap-2" data-unit1-grammar-row>
        <ExampleText className="min-w-0">{affirmative}</ExampleText>
      </div>
      <div className="flex items-center gap-2 pl-2 sm:pl-5">
        <Arrow id={`${id}-question`} />
        <ExampleText className="min-w-0">{interrogative}</ExampleText>
      </div>
      <div className="flex items-center gap-2 pl-2 sm:pl-5">
        <Arrow id={`${id}-negative`} />
        <ExampleText className="min-w-0">{negative}</ExampleText>
      </div>
    </div>
  )
}

function QuestionsTeaching() {
  return (
    <div className="max-w-[42rem] space-y-8" data-unit1-teaching-content="questions">
      <p className={BODY_TEXT}>El verbo va primero en preguntas.</p>
      <div className="space-y-8" data-unit1-question-examples>
        <QuestionChain
          id="student"
          affirmative={
            <>
              He <Verb>is</Verb> a student.
            </>
          }
          interrogative={
            <>
              <Verb>Is</Verb> he a student?
            </>
          }
          negative={
            <>
              He <Verb>is</Verb> <span className={NEGATION_TEXT}>not</span> a student.
            </>
          }
        />
        <div className="border-t border-[#506187]/20 pt-8">
          <QuestionChain
            id="age"
            affirmative={
              <>
                They <Verb>are</Verb> 20 years old.
              </>
            }
            interrogative={
              <>
                <Verb>Are</Verb> they 20 years old?
              </>
            }
            negative={
              <>
                They <Verb>are</Verb> <span className={NEGATION_TEXT}>not</span> 20 years old.
              </>
            }
          />
        </div>
      </div>
    </div>
  )
}

function TransformTeaching() {
  return (
    <div className="max-w-[42rem] space-y-8" data-unit1-teaching-content="transform">
      <ol className="m-0 list-none space-y-1 p-0" data-unit1-transform-chain>
        <li>
          <ExampleText>
            I <Verb>am</Verb> Lucas.
          </ExampleText>
        </li>
        <li className="flex items-center gap-2 pl-2 sm:pl-5">
          <Arrow id="transform-question" />
          <ExampleText>
            <Verb>Are</Verb> you Lucas?
          </ExampleText>
        </li>
        <li className="flex items-center gap-2 pl-2 sm:pl-5">
          <Arrow id="transform-negative" />
          <ExampleText>
            I <Verb>am</Verb> <span className={NEGATION_TEXT}>not</span> Lucas.
          </ExampleText>
        </li>
      </ol>

      <TeachingTip>En preguntas, el verbo va primero.</TeachingTip>

      <p className={EXAMPLE_TEXT} data-unit1-example>
        He <Verb>is</Verb> a teacher. <span className="mx-2 text-[#506187]">→</span> <Verb>Is</Verb>{' '}
        he a teacher?
      </p>

      <details className="pt-2" data-unit1-reference="to-be">
        <summary
          className={`cursor-pointer list-none font-sans text-base font-semibold leading-6 ${NAVY_TEXT} underline decoration-[#506187]/40 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#10245C]`}
        >
          Ver las formas
        </summary>
        <div className="mt-5 overflow-x-auto" data-unit1-reference-content>
          <table
            className={`w-full table-fixed border-collapse text-left font-sans text-base leading-6 ${NAVY_TEXT}`}
          >
            <caption className="sr-only">Formas del verbo to be en presente simple</caption>
            <thead>
              <tr className={SLATE_TEXT}>
                <th className="w-1/2 break-words pb-2 pr-3 font-semibold sm:pr-8" scope="col">
                  Pronombre
                </th>
                <th className="w-1/2 break-words pb-2 font-semibold" scope="col">
                  Verbo
                </th>
              </tr>
            </thead>
            <tbody>
              {TO_BE_ROWS.map(([pronoun, form]) => (
                <tr key={`${pronoun}-${form}`} data-unit1-reference-row>
                  <th className="break-words py-2 pr-3 font-normal sm:pr-8" scope="row">
                    {pronoun}
                  </th>
                  <td className={`break-words py-2 font-semibold ${TEAL_TEXT}`}>{form}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}

const ANA_AVATAR_SRC = '/images/lessons/this-is-me/dual-mode/possessives.webp'

type PossessiveAvatarKind = 'peter' | 'ana' | 'pair'

function PossessiveAvatar({ kind }: { kind: PossessiveAvatarKind }) {
  if (kind === 'pair') {
    return (
      <span className="flex h-16 w-[6.5rem] shrink-0 items-end" data-unit1-avatar="pair">
        <span className="relative z-10 h-12 w-12 overflow-hidden rounded-full">
          <Image
            src="/images/lessons/this-is-me/peter-cutout-v2.webp"
            alt="Peter, clean-shaven, with a rust-colored shirt"
            fill
            sizes="48px"
            className="object-contain object-bottom"
          />
        </span>
        <span className="relative -ml-2 h-12 w-12 overflow-hidden rounded-full">
          <Image
            src={ANA_AVATAR_SRC}
            alt="Ana, with a striped sweater"
            fill
            sizes="48px"
            className="object-cover object-[85%_30%]"
          />
        </span>
      </span>
    )
  }

  const isAna = kind === 'ana'
  return (
    <span
      className="relative flex h-16 w-16 shrink-0 items-end overflow-hidden rounded-full"
      data-unit1-avatar={kind}
    >
      <Image
        src={isAna ? ANA_AVATAR_SRC : '/images/lessons/this-is-me/peter-cutout-v2.webp'}
        alt={
          isAna ? 'Ana, with a striped sweater' : 'Peter, clean-shaven, with a rust-colored shirt'
        }
        fill
        sizes="64px"
        className={isAna ? 'object-cover object-[85%_30%]' : 'object-contain object-bottom'}
      />
    </span>
  )
}

function PossessiveExample({
  children,
  translation,
  avatar,
}: {
  children: ReactNode
  translation: string
  avatar: PossessiveAvatarKind
}) {
  return (
    <li className="flex items-center gap-4" data-unit1-possessive-example>
      <PossessiveAvatar kind={avatar} />
      <div className="min-w-0">
        <ExampleText>{children}</ExampleText>
        <Translation>{translation}</Translation>
      </div>
    </li>
  )
}

function PossessivesTeaching() {
  return (
    <div className="max-w-[42rem] space-y-8" data-unit1-teaching-content="possessives">
      <ul className="m-0 list-none space-y-6 p-0" data-unit1-possessive-examples>
        <PossessiveExample avatar="peter" translation="mi">
          <Teal>My</Teal> name is Peter.
        </PossessiveExample>
        <PossessiveExample avatar="ana" translation="su (de ella)">
          <Teal>Her</Teal> name is Ana.
        </PossessiveExample>
        <PossessiveExample avatar="pair" translation="sus (de ellos)">
          <Teal>Their</Teal> names are Peter and Ana.
        </PossessiveExample>
      </ul>

      <details className="pt-1" data-unit1-reference="possessives">
        <summary
          className={`cursor-pointer list-none font-sans text-base font-semibold leading-6 ${NAVY_TEXT} underline decoration-[#506187]/40 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#10245C]`}
        >
          Ver todos los posesivos
        </summary>
        <div className="mt-5 overflow-x-auto" data-unit1-possessive-reference>
          <table
            className={`w-full table-fixed border-collapse text-left font-sans text-base leading-6 ${NAVY_TEXT}`}
          >
            <caption className="sr-only">Los ocho adjetivos posesivos</caption>
            <thead>
              <tr className={SLATE_TEXT}>
                <th className="w-1/4 break-words pb-2 pr-3 font-semibold sm:pr-8" scope="col">
                  Pronombre
                </th>
                <th className="w-1/4 break-words pb-2 pr-3 font-semibold sm:pr-8" scope="col">
                  Posesivo
                </th>
                <th className="w-1/2 break-words pb-2 font-semibold" scope="col">
                  Traducción
                </th>
              </tr>
            </thead>
            <tbody>
              {POSSESSIVE_ROWS.map(([pronoun, possessive, translation], index) => (
                <tr key={`${pronoun}-${possessive}-${index}`} data-unit1-possessive-row>
                  <th className="break-words py-2 pr-3 font-normal sm:pr-8" scope="row">
                    {pronoun}
                  </th>
                  <td className={`break-words py-2 pr-3 font-semibold sm:pr-8 ${TEAL_TEXT}`}>
                    {possessive}
                  </td>
                  <td className={`break-words py-2 ${SLATE_TEXT}`}>{translation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}

function IntroAudioNotesTeaching() {
  return (
    <div className="max-w-[42rem]" data-unit1-teaching-content="intro-audio-notes">
      <details data-unit1-audio-details>
        <summary
          className={`cursor-pointer list-none font-sans text-base font-semibold leading-6 ${NAVY_TEXT} underline decoration-[#506187]/40 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#10245C]`}
        >
          Lo que escuchas
        </summary>
        <ul className={`m-0 mt-5 list-disc space-y-3 pl-5 ${BODY_TEXT}`} data-unit1-audio-facts>
          <li data-unit1-audio-fact>Jake y Pete tienen 17 años.</li>
          <li data-unit1-audio-fact>
            Jake es un estudiante nuevo; el audio menciona Jackson Ave y 6th.
          </li>
          <li data-unit1-audio-fact>Pete está en la misma clase; el audio menciona 8th.</li>
        </ul>
      </details>
    </div>
  )
}

function renderTeaching(role: Unit1TeachingRole): ReactNode {
  switch (role) {
    case 'introductions':
      return <IntroductionsTeaching />
    case 'contact':
      return <ContactTeaching />
    case 'questions':
      return <QuestionsTeaching />
    case 'transform':
      return <TransformTeaching />
    case 'possessives':
      return <PossessivesTeaching />
    case 'intro-audio-notes':
      return <IntroAudioNotesTeaching />
  }
}

export function Unit1Teaching({ block }: Unit1TeachingProps) {
  const role = getUnit1TeachingRole(block)
  if (!role) return null

  return (
    <div
      className={`unit1-teaching w-full ${BODY_TEXT}`}
      data-unit1-teaching
      data-unit1-role={role}
    >
      {renderTeaching(role)}
    </div>
  )
}
