'use client'

import Image from 'next/image'
import type { GuidedLessonStepKind } from '@/lib/guided-lesson'
import { cn } from '@/lib/utils'

export type GuidedLessonSceneVariant = 'portrait' | 'grammar'

interface GuidedLessonSceneProps {
  src: string
  kind: GuidedLessonStepKind
  variant: GuidedLessonSceneVariant
  subject?: string
  environment?: boolean
}

export interface LessonSceneBackdropProps {
  variant?: GuidedLessonSceneVariant | 'plain'
  className?: string
  src?: string
}

/** A complete painted setting stays behind live controls and never handles input. */
export function LessonSceneBackdrop({
  variant = 'portrait',
  className,
  src = '/images/lessons/this-is-me/study-room-v3.webp',
}: LessonSceneBackdropProps) {
  return (
    <div
      className={cn(
        'guided-lesson-scene-backdrop pointer-events-none absolute inset-0 z-0 overflow-hidden select-none',
        className
      )}
      data-guided-scene-backdrop
      data-guided-scene-variant={variant}
      aria-hidden="true"
    >
      <div
        data-illustrated-setting
        data-scene-src={src}
        className="absolute inset-0 bg-cover bg-right max-md:hidden"
        style={{
          backgroundImage: `url("${src}")`,
          maskImage: src.endsWith('study-room-v3.webp')
            ? 'linear-gradient(to right, transparent, black 38%)'
            : 'linear-gradient(to right, transparent, transparent 10%, black 55%)',
        }}
      />
    </div>
  )
}

/** Complete painted scenery, separate from authored HTML learning controls. */
export function GuidedLessonScene({
  src,
  kind,
  variant,
  subject,
  environment = false,
}: GuidedLessonSceneProps) {
  const isGrammar = variant === 'grammar'

  return (
    <aside
      className={cn(
        'guided-lesson-art pointer-events-none order-2 isolate flex self-start md:order-2',
        environment
          ? 'h-[320px] min-h-[320px] sm:h-[420px] sm:min-h-[420px]'
          : isGrammar
            ? 'h-[220px] min-h-[220px] sm:h-[248px] sm:min-h-[248px] md:h-[264px] md:min-h-[264px]'
            : 'h-[260px] min-h-[260px] sm:h-[300px] sm:min-h-[300px] md:h-[min(34vw,344px)] md:min-h-[300px]'
      )}
      data-guided-art
      data-guided-scene={kind}
      data-guided-scene-subject={subject || undefined}
      data-illustrated-environment={environment || undefined}
      aria-hidden="true"
    >
      <div className="guided-lesson-scene relative h-full w-full">
        {!environment && (
          <span
            className={cn(
              'guided-lesson-scene__accent absolute rounded-full bg-[#D5C8F1]',
              isGrammar ? 'right-[11%] top-[12%] h-12 w-12' : 'right-[8%] top-[9%] h-16 w-16'
            )}
            aria-hidden="true"
          />
        )}
        {!environment && (
          <span
            className={cn(
              'guided-lesson-scene__line absolute bottom-[15%] left-[10%] h-px rotate-[-8deg] bg-[#A89BCB]/70',
              isGrammar ? 'w-20' : 'w-28'
            )}
            aria-hidden="true"
          />
        )}
        <div
          className={cn(
            'guided-lesson-scene__figure absolute inset-x-0 z-10',
            environment ? 'inset-y-0' : isGrammar ? 'bottom-0 top-[5%]' : 'bottom-[-5%] top-[-5%]'
          )}
        >
          <Image
            src={src}
            alt=""
            aria-hidden="true"
            fill
            priority
            quality={environment ? 85 : 75}
            sizes={
              environment ? '(max-width: 1023px) 100vw, 75vw' : '(max-width: 767px) 80vw, 400px'
            }
            className={cn(
              environment
                ? 'object-cover object-center'
                : 'object-contain object-bottom drop-shadow-[0_18px_20px_rgba(16,36,92,0.14)]',
              isGrammar && !environment && 'scale-[0.88]'
            )}
          />
        </div>
      </div>
    </aside>
  )
}
