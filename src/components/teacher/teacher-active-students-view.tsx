'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getUserAvatarUrl } from '@/lib/utils'
import { BookOpen, Calendar, Mail, MessageSquare, Search, Users } from 'lucide-react'

interface Course {
  id: string
  title: string
  language: string
  level: string
}

interface Student {
  id: string
  name: string | null
  lastName: string | null
  email: string | null
  image: string | null
  courses: Course[]
  totalClasses: number
  lastClassDate: string
}

interface TeacherActiveStudentsViewProps {
  students: Student[]
}

const languageFlags: Record<string, string> = {
  en: '🇺🇸',
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
  pt: '🇧🇷',
  it: '🇮🇹',
}

export function TeacherActiveStudentsView({ students }: TeacherActiveStudentsViewProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredStudents = students.filter((student) => {
    const fullName = `${student.name || ''} ${student.lastName || ''}`.toLowerCase()
    const email = (student.email || '').toLowerCase()
    const query = searchQuery.toLowerCase()
    return fullName.includes(query) || email.includes(query)
  })

  if (students.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Sin estudiantes activos</h3>
          <p className="text-muted-foreground">
            No has tenido clases con estudiantes en los últimos 60 días.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar estudiante..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Estudiante</TableHead>
              <TableHead>Cursos</TableHead>
              <TableHead className="text-center">Clases</TableHead>
              <TableHead>Última Clase</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.map((student) => (
              <TableRow key={student.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={getUserAvatarUrl(student.id, student.image)} />
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {(student.name || 'S')[0]}
                        {(student.lastName || '')[0] || ''}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {student.name} {student.lastName}
                      </p>
                      {student.email && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {student.email}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {student.courses.slice(0, 3).map((course) => (
                      <Badge key={course.id} variant="outline" className="text-xs">
                        {languageFlags[course.language] || '🌐'} {course.title}
                      </Badge>
                    ))}
                    {student.courses.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{student.courses.length - 3}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <BookOpen className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{student.totalClasses}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {formatDate(student.lastClassDate)}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/messages?userId=${student.id}`}>
                      <Button variant="ghost" size="icon" title="Enviar mensaje">
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Link href={`/teacher/students/${student.id}`}>
                      <Button variant="outline" size="sm">
                        Ver Lecciones
                      </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {filteredStudents.length === 0 && searchQuery && (
        <div className="text-center py-8 text-muted-foreground">
          No se encontraron estudiantes que coincidan con &quot;{searchQuery}&quot;
        </div>
      )}
    </div>
  )
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
