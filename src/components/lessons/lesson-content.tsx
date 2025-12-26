'use client'

import { LessonForView } from '@/types/lesson'
import { BlockPreview } from '@/components/admin/course-builder/lesson-builder/block-preview'
import { mapContentToBlock } from '@/lib/content-mapper'
import { Block } from '@/types/course-builder'

interface LessonContentProps {
    lesson: LessonForView
}

export function LessonContent({ lesson }: LessonContentProps) {
    if (!lesson.contents || lesson.contents.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500">
                Esta lección no tiene contenido aún.
            </div>
        )
    }

    // Map Prisma contents to Blocks used by the preview component
    const blocks: Block[] = lesson.contents.map(content => mapContentToBlock(content as Parameters<typeof mapContentToBlock>[0]))

    return (
        <div className="space-y-8">
            {lesson.videoUrl && (
                <div className="w-full rounded-xl overflow-hidden shadow-lg">
                    {/* 
                  Quick check if it's a direct video file or embed. 
                  Implementation would need a proper player.
                */}
                    <div className="aspect-video bg-gray-900 text-white flex items-center justify-center">
                        Video Player: {lesson.title}
                    </div>
                </div>
            )}

            {blocks.map((block) => (
                <div key={block.id} className="scroll-mt-20">
                    <BlockPreview block={block} />
                </div>
            ))}
        </div>
    )
}
