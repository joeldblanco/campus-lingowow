'use client'

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react'
import Link from 'next/link'

interface LessonNavigationProps {
    prevLessonId: string | null
    nextLessonId: string | null
    onComplete?: () => void
    disableComplete?: boolean
}

export function LessonNavigation({ prevLessonId, nextLessonId, onComplete, disableComplete }: LessonNavigationProps) {
    return (
        <div className="border-t bg-white p-4 shadow-sm rounded-lg mt-8 sticky bottom-4">
            <div className="flex items-center justify-between">
                <div>
                    {prevLessonId ? (
                        <Button variant="outline" asChild>
                            <Link href={`./${prevLessonId}`}>
                                <ChevronLeft className="w-4 h-4 mr-2" />
                                Lección Anterior
                            </Link>
                        </Button>
                    ) : (
                        <Button variant="ghost" disabled>
                            Lección Anterior
                        </Button>
                    )}
                </div>

                <div className="flex gap-2">
                    {/* Skip button removed */}

                    {nextLessonId ? (
                        <Button asChild>
                            <Link href={`./${nextLessonId}`}>
                                Siguiente Lección <ChevronRight className="w-4 h-4 ml-2" />
                            </Link>
                        </Button>
                    ) : (
                        <Button
                            className="bg-green-600 hover:bg-green-700"
                            onClick={onComplete}
                            disabled={disableComplete}
                        >
                            Completar Lección <CheckCircle className="w-4 h-4 ml-2" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
