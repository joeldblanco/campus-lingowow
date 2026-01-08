'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  ArrowLeft,
  BookOpen,
  Users,
  Layers,
  FileText,
  Video,
  Clock,
  User,
  Play,
} from 'lucide-react'

interface Content {
  id: string
  title: string
  description: string | null
  contentType: string
  order: number
}

interface Lesson {
  id: string
  title: string
  description: string
  order: number
  duration: number
  videoUrl: string | null
  summary: string | null
  contents: Content[]
}

interface Module {
  id: string
  title: string
  description: string | null
  level: string
  order: number
  lessons: Lesson[]
}

interface PersonalizedLesson {
  id: string
  title: string
  description: string | null
  order: number
  duration: number
  isPublished: boolean
  videoUrl: string | null
  summary: string | null
  studentName: string
  enrollmentId: string
}

interface Course {
  id: string
  title: string
  description: string
  language: string
  level: string
  image: string | null
  isPersonalized: boolean
  isSynchronous: boolean
  createdBy: { id: string; name: string | null }
  studentCount: number
  modules: Module[]
  personalizedLessons: PersonalizedLesson[]
}

interface TeacherCourseContentViewProps {
  course: Course
}

const languageNames: Record<string, string> = {
  en: 'Inglés',
  es: 'Español',
  fr: 'Francés',
  de: 'Alemán',
  pt: 'Portugués',
  it: 'Italiano',
}

const contentTypeIcons: Record<string, typeof FileText> = {
  VIDEO: Video,
  TEXT: FileText,
  AUDIO: Play,
}

export function TeacherCourseContentView({ course }: TeacherCourseContentViewProps) {
  const totalLessons = course.isPersonalized
    ? course.personalizedLessons.length
    : course.modules.reduce((acc, m) => acc + m.lessons.length, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/teacher/courses">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{course.title}</h1>
            {course.isPersonalized && (
              <Badge variant="outline" className="text-orange-600 border-orange-300">
                Personalizado
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">{course.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BookOpen className="w-4 h-4" />
              <span>Idioma</span>
            </div>
            <p className="text-lg font-semibold mt-1">
              {languageNames[course.language] || course.language}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Layers className="w-4 h-4" />
              <span>Nivel</span>
            </div>
            <p className="text-lg font-semibold mt-1">{course.level}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>Estudiantes</span>
            </div>
            <p className="text-lg font-semibold mt-1">{course.studentCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="w-4 h-4" />
              <span>Lecciones</span>
            </div>
            <p className="text-lg font-semibold mt-1">{totalLessons}</p>
          </CardContent>
        </Card>
      </div>

      {course.isPersonalized ? (
        <PersonalizedContent lessons={course.personalizedLessons} />
      ) : (
        <StandardContent modules={course.modules} />
      )}
    </div>
  )
}

function StandardContent({ modules }: { modules: Module[] }) {
  if (modules.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Layers className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Sin contenido disponible</h3>
          <p className="text-muted-foreground">
            Este curso aún no tiene módulos publicados.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Contenido del Curso</h2>
      <Accordion type="multiple" className="space-y-2">
        {modules.map((module) => (
          <AccordionItem
            key={module.id}
            value={module.id}
            className="border rounded-lg px-4"
          >
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                  {module.order + 1}
                </div>
                <div>
                  <h3 className="font-semibold">{module.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {module.lessons.length} lecciones
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pt-2 pb-4">
                {module.lessons.map((lesson) => (
                  <LessonCard key={lesson.id} lesson={lesson} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}

function LessonCard({ lesson }: { lesson: Lesson }) {
  return (
    <Card className="bg-muted/30">
      <CardHeader className="py-3 px-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-primary text-xs font-medium">
              {lesson.order + 1}
            </div>
            <div>
              <CardTitle className="text-sm font-medium">{lesson.title}</CardTitle>
              <CardDescription className="text-xs line-clamp-1">
                {lesson.description}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{lesson.duration} min</span>
          </div>
        </div>
      </CardHeader>
      {lesson.contents.length > 0 && (
        <CardContent className="py-2 px-4 border-t">
          <div className="flex flex-wrap gap-2">
            {lesson.contents.map((content) => {
              const Icon = contentTypeIcons[content.contentType] || FileText
              return (
                <Badge key={content.id} variant="outline" className="text-xs">
                  <Icon className="w-3 h-3 mr-1" />
                  {content.title}
                </Badge>
              )
            })}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

function PersonalizedContent({ lessons }: { lessons: PersonalizedLesson[] }) {
  if (lessons.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Sin lecciones personalizadas</h3>
          <p className="text-muted-foreground mb-4">
            Aún no has creado lecciones personalizadas para este curso.
          </p>
          <Link href="/teacher/students">
            <Button>Ir a Mis Estudiantes</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  const groupedByStudent = lessons.reduce(
    (acc, lesson) => {
      if (!acc[lesson.studentName]) {
        acc[lesson.studentName] = []
      }
      acc[lesson.studentName].push(lesson)
      return acc
    },
    {} as Record<string, PersonalizedLesson[]>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Lecciones Personalizadas</h2>
        <Link href="/teacher/students">
          <Button variant="outline" size="sm">
            Crear Nueva Lección
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedByStudent).map(([studentName, studentLessons]) => (
          <Card key={studentName}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-muted-foreground" />
                <CardTitle className="text-base">{studentName}</CardTitle>
                <Badge variant="secondary">{studentLessons.length} lecciones</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {studentLessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 text-xs font-medium">
                        {lesson.order + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{lesson.title}</p>
                        {lesson.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {lesson.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {lesson.videoUrl && (
                        <Badge variant="outline" className="text-xs">
                          <Video className="w-3 h-3 mr-1" />
                          Video
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {lesson.duration} min
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
