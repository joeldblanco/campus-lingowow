'use client'

import { useState } from 'react'
import { Search, Users, BookOpen, TrendingUp } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { StudentLessonsList } from './student-lessons-list'
import type { StudentWithLessons } from '@/types/student-lesson'

interface StudentsWithLessonsViewProps {
  students: StudentWithLessons[]
  teacherId: string
}

export function StudentsWithLessonsView({
  students,
  teacherId,
}: StudentsWithLessonsViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<StudentWithLessons | null>(
    students[0] || null
  )

  const filteredStudents = students.filter((s) => {
    const fullName = `${s.student.name} ${s.student.lastName}`.toLowerCase()
    const email = s.student.email.toLowerCase()
    const query = searchQuery.toLowerCase()
    return fullName.includes(query) || email.includes(query)
  })

  const totalStats = students.reduce(
    (acc, s) => ({
      totalLessons: acc.totalLessons + s.stats.totalLessons,
      publishedLessons: acc.publishedLessons + s.stats.publishedLessons,
      completedLessons: acc.completedLessons + s.stats.completedLessons,
      totalProgress: acc.totalProgress + s.stats.averageProgress,
    }),
    { totalLessons: 0, publishedLessons: 0, completedLessons: 0, totalProgress: 0 }
  )

  const averageProgress =
    students.length > 0 ? totalStats.totalProgress / students.length : 0

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estudiantes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}</div>
            <p className="text-xs text-muted-foreground">
              Con contenido personalizado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lecciones Creadas</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalLessons}</div>
            <p className="text-xs text-muted-foreground">
              {totalStats.publishedLessons} publicadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completadas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.completedLessons}</div>
            <p className="text-xs text-muted-foreground">
              Por los estudiantes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progreso Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(averageProgress)}%</div>
            <Progress value={averageProgress} className="h-2 mt-2" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Students List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Mis Estudiantes</CardTitle>
            <CardDescription>
              Estudiantes con programas personalizados
            </CardDescription>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar estudiante..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[600px] overflow-y-auto">
              {filteredStudents.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  No se encontraron estudiantes
                </div>
              ) : (
                filteredStudents.map((studentData) => (
                  <button
                    key={studentData.enrollment.id}
                    onClick={() => setSelectedStudent(studentData)}
                    className={`w-full p-4 text-left hover:bg-accent/50 transition-colors ${
                      selectedStudent?.enrollment.id === studentData.enrollment.id
                        ? 'bg-accent'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={studentData.student.image || undefined} />
                        <AvatarFallback>
                          {studentData.student.name[0]}
                          {studentData.student.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {studentData.student.name} {studentData.student.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {studentData.enrollment.courseName}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="mb-1">
                          {studentData.stats.totalLessons} lecciones
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          {Math.round(studentData.stats.averageProgress)}% progreso
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Selected Student Lessons */}
        <div className="lg:col-span-2">
          {selectedStudent ? (
            <StudentLessonsList
              studentId={selectedStudent.student.id}
              studentName={`${selectedStudent.student.name} ${selectedStudent.student.lastName}`}
              enrollmentId={selectedStudent.enrollment.id}
              courseName={selectedStudent.enrollment.courseName}
              lessons={selectedStudent.lessons}
              stats={selectedStudent.stats}
              teacherId={teacherId}
            />
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">
                  Selecciona un estudiante para ver sus lecciones
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
