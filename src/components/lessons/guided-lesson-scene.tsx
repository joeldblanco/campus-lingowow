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
}

/**
 * A small editorial scene behind the approved pilot cut-outs.
 *
 * The shapes intentionally stay decorative: authored lesson content remains
 * in the content column, while the scene supplies the lilac wash and a little
 * depth that the v3 language/multimedia plates use around their media.
 */
export function GuidedLessonScene({ src, kind, variant, subject }: GuidedLessonSceneProps) {
  const isGrammar = variant === 'grammar'

  return (
    <aside
      className={cn(
        'guided-lesson-art order-2 isolate flex self-start overflow-hidden rounded-[42%_58%_52%_48%/48%_40%_60%_52%] bg-[#EEE8FA] md:order-2',
        isGrammar
          ? 'h-[220px] min-h-[220px] sm:h-[248px] sm:min-h-[248px] md:h-[264px] md:min-h-[264px]'
          : 'h-[260px] min-h-[260px] sm:h-[300px] sm:min-h-[300px] md:h-[min(34vw,344px)] md:min-h-[300px]'
      )}
      data-guided-art
      data-guided-scene={kind}
      data-guided-scene-subject={subject || undefined}
      aria-hidden="true"
    >
      <div className="guided-lesson-scene relative h-full w-full">
        <span
          className="guided-lesson-scene__wash absolute -left-1/4 top-[18%] h-[62%] w-[136%] rounded-[48%_52%_58%_42%/52%_44%_56%_48%] bg-[#E2D9F8]"
          aria-hidden="true"
        />
        <span
          className={cn(
            'guided-lesson-scene__accent absolute rounded-full bg-[#D5C8F1]',
            isGrammar ? 'right-[11%] top-[12%] h-12 w-12' : 'right-[8%] top-[9%] h-16 w-16'
          )}
          aria-hidden="true"
        />
        <span
          className={cn(
            'guided-lesson-scene__line absolute bottom-[15%] left-[10%] h-px rotate-[-8deg] bg-[#A89BCB]/70',
            isGrammar ? 'w-20' : 'w-28'
          )}
          aria-hidden="true"
        />
        <div
          className={cn(
            'guided-lesson-scene__figure absolute inset-x-0 z-10',
            isGrammar ? 'bottom-0 top-[5%]' : 'bottom-[-5%] top-[-5%]'
          )}
        >
          <Image
            src={src}
            alt=""
            aria-hidden="true"
            fill
            priority
            sizes="(max-width: 767px) 100vw, 36vw"
            className={cn(
              'object-contain object-bottom drop-shadow-[0_18px_20px_rgba(16,36,92,0.14)]',
              isGrammar && 'scale-[0.88]'
            )}
          />
        </div>
      </div>
    </aside>
  )
}
