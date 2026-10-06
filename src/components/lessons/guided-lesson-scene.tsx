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

export interface LessonSceneBackdropProps {
  /** The grammar plate uses a slightly quieter balance of the same broad forms. */
  variant?: GuidedLessonSceneVariant | 'plain'
  className?: string
}

/**
 * Full-shell editorial backdrop for the pilot lesson.
 *
 * This layer belongs beside the viewer's progress/content/footer rows rather
 * than inside the portrait aside. Keeping it absolute and pointer-free lets
 * the lilac forms fill the composition without adding layout height or making
 * any authored control part of the decorative scene.
 */
export function LessonSceneBackdrop({ variant = 'portrait', className }: LessonSceneBackdropProps) {
  const isGrammar = variant === 'grammar'

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
      <span
        className={cn(
          'guided-lesson-scene-backdrop__band absolute left-[-17%] z-0 h-[36%] w-[136%] rotate-[-8deg] rounded-[46%_54%_48%_52%/58%_42%_56%_44%] bg-[#EEE8FA]/95',
          isGrammar ? 'top-[38%]' : 'top-[35%]'
        )}
        aria-hidden="true"
      />
      <span
        className={cn(
          'guided-lesson-scene-backdrop__band-edge absolute left-[-14%] z-0 h-[18%] w-[130%] rotate-[-8deg] rounded-[52%_48%_44%_56%/54%_46%_58%_42%] bg-[#E4DCF8]/65',
          isGrammar ? 'top-[53%]' : 'top-[50%]'
        )}
        aria-hidden="true"
      />
      <span
        className={cn(
          'guided-lesson-scene-backdrop__wash guided-lesson-scene-backdrop__wash--left absolute h-[52%] w-[78%] rounded-[42%_58%_50%_50%/52%_42%_58%_48%] bg-[#EEE8FA]/55',
          isGrammar ? 'left-[-26%] top-[13%]' : 'left-[-20%] top-[9%]'
        )}
        aria-hidden="true"
      />
      <span
        className={cn(
          'guided-lesson-scene-backdrop__wash guided-lesson-scene-backdrop__wash--right absolute h-[48%] w-[72%] rounded-[60%_40%_48%_52%/42%_56%_44%_58%] bg-[#E4DCF8]/55',
          isGrammar ? 'right-[-25%] top-[27%]' : 'right-[-18%] top-[22%]'
        )}
        aria-hidden="true"
      />
      <span
        className={cn(
          'guided-lesson-scene-backdrop__wash guided-lesson-scene-backdrop__wash--bottom absolute h-[44%] w-[72%] rounded-[56%_44%_42%_58%/44%_54%_46%_56%] bg-[#F0ECFB]/80',
          isGrammar ? 'bottom-[-20%] left-[9%]' : 'bottom-[-23%] left-[16%]'
        )}
        aria-hidden="true"
      />
      <span
        className={cn(
          'guided-lesson-scene-backdrop__stroke absolute h-px rotate-[-7deg] bg-[#C7BBE8]/60',
          isGrammar ? 'bottom-[21%] left-[20%] w-[38%]' : 'bottom-[17%] left-[13%] w-[44%]'
        )}
        aria-hidden="true"
      />
    </div>
  )
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
        'guided-lesson-art order-2 isolate flex self-start md:order-2',
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
