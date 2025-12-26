'use client'

import { ChevronRight, X } from 'lucide-react'
import Link from 'next/link'

interface LessonHeaderProps {
    title: string
    subtitle?: string | null
    courseTitle: string
    moduleTitle: string
    courseId: string
    progress: number
}

export function LessonHeader({
    title,
    subtitle,
    courseTitle,
    moduleTitle,
    courseId,
}: LessonHeaderProps) {
    return (
        <div className="bg-white border-b sticky top-0 z-50">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                    <Link href={`/my-courses/${courseId}`} className="text-gray-500 hover:text-gray-900">
                        <X className="w-6 h-6" />
                    </Link>

                    <div className="flex flex-col">
                        <nav className="flex items-center gap-1 text-xs text-gray-500 mb-0.5">
                            <span>{courseTitle}</span>
                            <ChevronRight className="w-3 h-3" />
                            <span>{moduleTitle}</span>
                        </nav>
                        <h1 className="text-lg font-bold text-gray-900 leading-none truncate max-w-xl">
                            {title}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-4 w-1/3 justify-end">
                    {/* Progress and Save & Exit removed */}
                </div>
            </div>

            {subtitle && (
                <div className="bg-gray-50 border-b py-4">
                    <div className="container mx-auto px-4">
                        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
                        <p className="text-gray-600">{subtitle}</p>
                    </div>
                </div>
            )}
        </div>
    )
}
