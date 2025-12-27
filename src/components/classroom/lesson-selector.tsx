'use client'

import React, { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronRight, Play } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getBookingCourseStructure } from '@/lib/actions/classroom'

interface LessonSelectorProps {
    bookingId: string
    onLessonSelect: (lessonId: string) => void
}

interface ModuleData {
    id: string
    title: string
    lessons: {
        id: string
        title: string
        description: string
        duration: number
    }[]
}

export function LessonSelector({ bookingId, onLessonSelect }: LessonSelectorProps) {
    const [modules, setModules] = useState<ModuleData[]>([])
    const [openModules, setOpenModules] = useState<Set<string>>(new Set())
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchStructure = async () => {
            const data = await getBookingCourseStructure(bookingId)
            setModules(data)
            setIsLoading(false)
            // Automatically open first module
            if (data.length > 0) {
                setOpenModules(new Set([data[0].id]))
            }
        }
        fetchStructure()
    }, [bookingId])

    const toggleModule = (moduleId: string) => {
        setOpenModules(prev => {
            const next = new Set(prev)
            if (next.has(moduleId)) {
                next.delete(moduleId)
            } else {
                next.add(moduleId)
            }
            return next
        })
    }

    if (isLoading) {
        return <div className="p-4 text-center text-gray-500">Cargando lecciones...</div>
    }

    return (
        <Card className="flex flex-col h-full bg-white border border-gray-100 shadow-sm rounded-xl overflow-hidden">
            <div className="p-3 border-b bg-gray-50">
                <h3 className="font-semibold text-gray-700">Contenido del Curso</h3>
            </div>
            <ScrollArea className="flex-1 p-2">
                <div className="space-y-2">
                    {modules.map(module => (
                        <div key={module.id} className="border rounded-lg overflow-hidden">
                            <button
                                onClick={() => toggleModule(module.id)}
                                className="w-full flex items-center p-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left font-medium text-sm text-gray-800"
                            >
                                {openModules.has(module.id) ? (
                                    <ChevronDown className="w-4 h-4 mr-2 text-gray-500" />
                                ) : (
                                    <ChevronRight className="w-4 h-4 mr-2 text-gray-500" />
                                )}
                                {module.title}
                            </button>

                            {openModules.has(module.id) && (
                                <div className="divide-y divide-gray-100 bg-white">
                                    {module.lessons.map(lesson => (
                                        <div key={lesson.id} className="p-3 flex items-center justify-between group hover:bg-blue-50 transition-colors">
                                            <div className="flex-1">
                                                <div className="font-medium text-sm text-gray-800">{lesson.title}</div>
                                                <div className="text-xs text-gray-500 line-clamp-1">{lesson.description}</div>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="opacity-0 group-hover:opacity-100 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                                                onClick={() => onLessonSelect(lesson.id)}
                                            >
                                                <Play className="w-4 h-4 mr-1" />
                                                Presentar
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </Card>
    )
}
