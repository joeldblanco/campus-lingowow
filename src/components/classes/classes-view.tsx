'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/ui/user-avatar'
import { Calendar, Clock, User, BookOpen } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Teacher {
  id: string
  name: string
  lastName: string | null
  image: string | null
}

interface ClassSchedule {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  teacher: Teacher
}

interface ClassBooking {
  id: string
  day: string
  timeSlot: string
  status: string
  teacher: Teacher
}

interface Enrollment {
  id: string
  status: string
  progress: number
  classesTotal: number
  classesAttended: number
  classesMissed: number
  course: {
    id: string
    title: string
    description: string
    level: string
    language: string
  }
  academicPeriod: {
    id: string
    name: string
    startDate: Date
    endDate: Date
    season: {
      name: string
      year: number
    }
  }
  schedules: ClassSchedule[]
  bookings: ClassBooking[]
}

interface ClassesViewProps {
  enrollments: Enrollment[]
  userId: string
}

const DAYS_OF_WEEK = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
]

export function ClassesView({ enrollments }: ClassesViewProps) {
  if (enrollments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No tienes clases activas</h3>
          <p className="text-muted-foreground">
            Inscríbete en un curso para comenzar a ver tus clases aquí
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {enrollments.map((enrollment) => (
        <Card key={enrollment.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{enrollment.course.title}</CardTitle>
                <CardDescription className="mt-2">
                  {enrollment.course.description}
                </CardDescription>
                <div className="flex gap-2 mt-3">
                  <Badge variant="outline">{enrollment.course.level}</Badge>
                  <Badge variant="outline">{enrollment.course.language}</Badge>
                  <Badge variant="secondary">
                    {enrollment.academicPeriod.season.name} {enrollment.academicPeriod.season.year}
                  </Badge>
                </div>
              </div>
              <Badge
                variant={enrollment.status === 'ACTIVE' ? 'default' : 'secondary'}
                className="ml-4"
              >
                {enrollment.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {/* Estadísticas de clases */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-muted rounded-lg p-4">
                <div className="text-sm text-muted-foreground mb-1">Clases Totales</div>
                <div className="text-2xl font-bold">{enrollment.classesTotal}</div>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <div className="text-sm text-muted-foreground mb-1">Asistidas</div>
                <div className="text-2xl font-bold text-green-600">
                  {enrollment.classesAttended}
                </div>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <div className="text-sm text-muted-foreground mb-1">Perdidas</div>
                <div className="text-2xl font-bold text-red-600">
                  {enrollment.classesMissed}
                </div>
              </div>
            </div>

            {/* Horario recurrente */}
            {enrollment.schedules.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Horario Semanal
                </h4>
                <div className="space-y-2">
                  {enrollment.schedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          userId={schedule.teacher.id}
                          userName={schedule.teacher.name}
                          userLastName={schedule.teacher.lastName}
                          userImage={schedule.teacher.image}
                          className="h-8 w-8"
                        />
                        <div>
                          <div className="font-medium">
                            {DAYS_OF_WEEK[schedule.dayOfWeek]}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {schedule.teacher.name} {schedule.teacher.lastName || ''}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4" />
                        {schedule.startTime} - {schedule.endTime}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Clases recientes */}
            {enrollment.bookings.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Clases Recientes
                </h4>
                <div className="space-y-2">
                  {enrollment.bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          userId={booking.teacher.id}
                          userName={booking.teacher.name}
                          userLastName={booking.teacher.lastName}
                          userImage={booking.teacher.image}
                          className="h-8 w-8"
                        />
                        <div>
                          <div className="font-medium">
                            {format(new Date(booking.day), 'PPP', { locale: es })}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <User className="h-3 w-3" />
                            {booking.teacher.name} {booking.teacher.lastName || ''}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-muted-foreground">
                          {booking.timeSlot}
                        </div>
                        <Badge
                          variant={
                            booking.status === 'COMPLETED'
                              ? 'default'
                              : booking.status === 'CONFIRMED'
                                ? 'secondary'
                                : 'outline'
                          }
                        >
                          {booking.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
