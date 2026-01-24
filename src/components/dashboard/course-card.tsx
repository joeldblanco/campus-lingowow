'use client'

import { Progress } from '@/components/ui/progress'
import Link from 'next/link'

interface CourseCardProps {
  id: string
  title: string
  image?: string | null
  progress?: number
  level?: string
  studentCount?: number
  href?: string
  role?: 'student' | 'teacher'
}

const levelColors: Record<string, string> = {
  A1: 'bg-yellow-100 text-yellow-800',
  A2: 'bg-orange-100 text-orange-800',
  B1: 'bg-blue-100 text-blue-800',
  B2: 'bg-indigo-100 text-indigo-800',
  C1: 'bg-purple-100 text-purple-800',
  C2: 'bg-pink-100 text-pink-800',
  default: 'bg-slate-100 text-slate-800',
}

const getLevelColor = (level?: string) => {
  if (!level) return levelColors['default']
  const upperLevel = level.toUpperCase()
  for (const key of Object.keys(levelColors)) {
    if (upperLevel.includes(key)) return levelColors[key]
  }
  return levelColors['default']
}

const getProgressLevel = (progress?: number) => {
  if (!progress) return 'Principiante'
  if (progress > 80) return 'Avanzado'
  if (progress > 40) return 'Intermedio'
  return 'Principiante'
}

export function CourseCard({
  id,
  title,
  image,
  progress,
  level,
  studentCount,
  href,
  role = 'student',
}: CourseCardProps) {
  const cardHref = href || `/my-courses/${id}`

  return (
    <Link
      href={cardHref}
      className="flex flex-col bg-white dark:bg-card-dark rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow"
    >
      <div
        className="h-32 w-full bg-cover bg-center"
        style={{
          backgroundImage: image
            ? `url("${image}")`
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      />
      <div className="p-4 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2">
          <span className={`text-xs font-bold px-2 py-1 rounded ${getLevelColor(level)}`}>
            {level || getProgressLevel(progress)}
          </span>
        </div>
        <h4 className="text-slate-900 dark:text-white font-bold text-lg mb-1 line-clamp-1">
          {title}
        </h4>

        {studentCount !== undefined && role === 'teacher' && (
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
            <span>{studentCount} Estudiantes</span>
          </div>
        )}

        {role === 'student' && progress !== undefined && (
          <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-500 dark:text-slate-400">
                {Math.round(progress)}% Completado
              </span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}
      </div>
    </Link>
  )
}
