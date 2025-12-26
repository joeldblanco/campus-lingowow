'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  addMinutes,
  differenceInSeconds,
  format,
  isAfter,
  isBefore,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { Play, BookOpen } from 'lucide-react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { getStudentDashboardStats } from '@/lib/actions/dashboard'
import { useCurrentClass } from '@/context/current-class'
import type { StudentDashboardData } from '@/types/dashboard'
import { PendingScheduleBanner } from '@/components/enrollments/pending-schedule-banner'

export default function Dashboard() {
  const { data: session } = useSession()
  const user = session?.user
  const router = useRouter()
  const { setCurrentClass } = useCurrentClass()
  const [nextClassLink, setNextClassLink] = useState<string | null>(null)
  const [dashboardData, setDashboardData] = useState<StudentDashboardData | null>(null)

  useEffect(() => {
    const loadDashboardData = async () => {
      if (session?.user?.id) {
        try {
          const data = await getStudentDashboardStats(session.user.id)
          setDashboardData(data)

          console.log(data)

          // Set next class link if there are upcoming classes
          if (data.upcomingClasses.length > 0) {
            setNextClassLink(data.upcomingClasses[0].link)
          }
        } catch (error) {
          console.error('Error loading dashboard data:', error)
        }
      }
    }

    loadDashboardData()
  }, [session])

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">
          Bienvenido de nuevo, {user?.name ?? 'Usuario'}
        </h1>
        <p className="text-muted-foreground">Mira cómo vas y tus próximas clases.</p>
      </div>

      {/* Notification for students with no active enrollments */}
      {dashboardData?.enrollments && dashboardData.enrollments.length === 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="text-yellow-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
              <div>
                <p className="font-medium text-yellow-800">No tienes cursos activos</p>
                <p className="text-sm text-yellow-700">
                  Para empezar a aprender, <Link href="/courses" className="underline font-medium">inscríbete en un curso</Link>.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Banner de horarios pendientes */}
      <PendingScheduleBanner />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Mi próxima clase</CardTitle>
            <CardDescription>
              Cuando tengas una clase, este botón se activará para que puedas entrar
            </CardDescription>
          </CardHeader>
          <CardContent>
            {nextClassLink ? (
              <Button variant="default" size="lg" asChild className="w-full">
                <Link href={nextClassLink} className="flex items-center justify-center gap-2">
                  <Play />
                  <span>Unirse a la Clase</span>
                </Link>
              </Button>
            ) : (
              <Button disabled variant="default" size="lg" className="w-full">
                <Play />
                <span>Unirse a la Clase</span>
              </Button>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle>¿Cómo voy?</CardTitle>
            <CardDescription>Mi nivel actual</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold">Nivel {dashboardData?.currentLevel || 1}</div>
            <Progress value={(dashboardData?.totalPoints || 0) % 100} className="h-2" />
            <p className="text-xs text-muted-foreground">{dashboardData?.totalPoints || 0} XP</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Mis próximas clases</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/classes">Ver Todas</Link>
            </Button>
          </CardHeader>
          <CardContent className="grid gap-4">
            {dashboardData?.upcomingClasses.length && dashboardData?.upcomingClasses.length > 0 ? (
              dashboardData.upcomingClasses.map((classItem, index: number) => (
                <UpcomingClassCard
                  key={index}
                  className={classItem.course}
                  startDate={new Date(`${classItem.date}T${classItem.time.split('-')[0]}:00`)}
                  endDate={new Date(`${classItem.date}T${classItem.time.split('-')[1]}:00`)}
                  instructor={classItem.teacher}
                  classLink={classItem.link}
                  onJoinClass={(classId: string) => {
                    setCurrentClass(classId)
                    router.push(classItem.link)
                  }}
                />
              ))
            ) : (
              <p className="text-muted-foreground">No tienes clases próximas.</p>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Mis Cursos</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[400px] overflow-y-auto pr-2">
            <div className="flex flex-col gap-4">
              {dashboardData?.enrollments && dashboardData.enrollments.length > 0 ? (
                dashboardData.enrollments.map((enrollment) => (
                  <div key={enrollment.id} className="flex flex-col gap-3 rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-sm line-clamp-2">{enrollment.title}</div>
                      {enrollment.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={enrollment.image}
                          alt={enrollment.title}
                          className="h-10 w-10 rounded object-cover"
                        />
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Progreso</span>
                        <span>{Math.round(enrollment.progress)}%</span>
                      </div>
                      <Progress value={enrollment.progress} className="h-2" />
                    </div>
                    <Button variant="secondary" size="sm" className="w-full" asChild>
                      <Link href={`/my-courses/${enrollment.courseId}`}>
                        {enrollment.progress > 0 ? 'Continuar' : 'Empezar'}
                      </Link>
                    </Button>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
                  <BookOpen className="h-8 w-8 opacity-50" />
                  <p>No estás inscrito en ningún curso.</p>
                  <Button variant="link" asChild>
                    <Link href="/courses">Explorar cursos</Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Mis clases esta semana</CardTitle>
          <CardDescription>Tus clases para los próximos 7 días</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(() => {
              const upcomingClasses = dashboardData?.upcomingClasses || []
              if (upcomingClasses.length === 0) {
                return <p className="text-muted-foreground">No tienes clases para esta semana.</p>
              }

              // Get current week dates
              const today = new Date()
              const currentWeek = []
              for (let i = 0; i < 7; i++) {
                const date = new Date(today)
                date.setDate(today.getDate() - today.getDay() + i)
                currentWeek.push(date)
              }

              // Filter classes for current week and group by day
              const weekDays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
              const classesByDay = currentWeek.map((date, index) => {
                const dateStr = format(date, 'yyyy-MM-dd')
                const dayClasses = upcomingClasses.filter(cls => cls.date === dateStr)
                return {
                  dayName: weekDays[index],
                  date: format(date, 'dd/MM'),
                  classes: dayClasses
                }
              })

              return (
                <div className="grid grid-cols-7 gap-2">
                  {classesByDay.map(({ dayName, date, classes }) => (
                    <div key={dayName} className="text-center">
                      <div className="font-medium text-sm mb-2">
                        <div>{dayName}</div>
                        <div className="text-xs text-muted-foreground">{date}</div>
                      </div>
                      <div className="space-y-1">
                        {classes.length > 0 ? (
                          classes.map((cls, idx) => (
                            <div key={idx} className="bg-muted rounded p-2 text-xs">
                              <div className="font-medium">{cls.course}</div>
                              <div className="text-muted-foreground">{cls.time.split('-')[0]}</div>
                              <div className="text-muted-foreground">{cls.teacher}</div>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-muted-foreground">Libre</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function UpcomingClassCard({
  className,
  startDate,
  endDate,
  instructor,
  classLink,
  onJoinClass,
}: {
  className: string
  startDate: Date
  endDate: Date
  instructor: string
  classLink: string
  onJoinClass?: (classId: string) => void
}) {
  const [currentTime, setCurrentTime] = useState(new Date())

  // Actualiza el tiempo actual cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])
  const timeRemaining = useMemo(() => {
    const isPastClass = isAfter(currentTime, endDate)
    const isInProgress = !isBefore(currentTime, startDate) && !isAfter(currentTime, endDate)

    if (isPastClass) return 'Esta clase ya terminó'
    if (isInProgress) return 'La clase está ahora'

    // Calcular tiempo total en segundos
    const totalSeconds = Math.max(0, differenceInSeconds(startDate, currentTime))

    // Calcular días, horas, minutos y segundos
    const days = Math.floor(totalSeconds / (24 * 60 * 60))
    const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60))
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60)
    const seconds = totalSeconds % 60

    // Construir mensaje según el tiempo restante
    if (days > 0) {
      return `Empieza en ${days} días, ${hours} horas y ${minutes} minutos`
    } else if (hours > 0) {
      return `Empieza en ${hours} horas y ${minutes} minutos`
    } else if (minutes > 0) {
      return `Empieza en ${minutes} minutos`
    } else {
      return `Empieza en ${seconds} segundos`
    }
  }, [startDate, currentTime, endDate])

  const getStatus = () => {
    if (isBefore(currentTime, startDate)) return 'upcoming'
    if (isBefore(currentTime, endDate)) return 'in-progress'
    return 'completed'
  }

  const canJoinClass = useMemo(() => {
    const fiveMinutesBefore = addMinutes(startDate, -5)
    return !isAfter(currentTime, endDate) && !isBefore(currentTime, fiveMinutesBefore)
  }, [startDate, endDate, currentTime])

  const status = getStatus()

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-4 md:flex-row md:items-center">
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{className}</span>
          {status === 'in-progress' && <Badge className="bg-destructive">Ahora</Badge>}
          {status === 'completed' && <Badge variant="secondary">Terminada</Badge>}
          {status === 'upcoming' && <Badge variant="default">Pronto</Badge>}
        </div>
        <div className="text-sm text-muted-foreground">
          <span>{format(startDate, 'dd/MM/yyyy HH:mm', { locale: es })}</span> •{' '}
          <span>{timeRemaining}</span>
        </div>
        <div className="text-sm text-muted-foreground">
          <span>Profesor/a: {instructor}</span>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          size="sm"
          disabled={!canJoinClass || isAfter(currentTime, endDate)}
          onClick={() => {
            if (onJoinClass && canJoinClass && !isAfter(currentTime, endDate)) {
              // Extraer classId del link
              const urlParams = new URLSearchParams(classLink.split('?')[1])
              const classId = urlParams.get('classId')
              if (classId) {
                onJoinClass(classId)
              }
            }
          }}
          asChild={!onJoinClass && !isAfter(currentTime, endDate) && canJoinClass}
        >
          {!onJoinClass && !isAfter(currentTime, endDate) && canJoinClass ? (
            <Link href={classLink} className="flex items-center gap-2">
              <Play size={16} />
              <span>Unirse a la Clase</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Play size={16} />
              <span>Unirse a la Clase</span>
            </div>
          )}
        </Button>
      </div>
    </div>
  )
}
