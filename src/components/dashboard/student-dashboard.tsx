'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  addMinutes,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  format,
  isAfter,
  isBefore,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { Play } from 'lucide-react'
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
        <p className="text-muted-foreground">Ve tu progreso y tus próximas clases.</p>
      </div>
      
      {/* Banner de horarios pendientes */}
      <PendingScheduleBanner />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Próxima Clase</CardTitle>
            <CardDescription>
              Cuando tengas una clase, el botón se activará y podrás acceder a tu sala virtual
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Progreso</CardTitle>
            <CardDescription>Nivel Actual</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold">Nivel {dashboardData?.currentLevel || 1}</div>
            <Progress value={(dashboardData?.totalPoints || 0) % 100} className="h-2" />
            <p className="text-xs text-muted-foreground">{dashboardData?.totalPoints || 0} XP</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Asistencia</CardTitle>
            <CardDescription>Período actual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.attendanceRate || 0}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Racha</CardTitle>
            <CardDescription>Días consecutivos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.currentStreak || 0}</div>
            <p className="text-xs text-muted-foreground">
              Mejor: {dashboardData?.longestStreak || 0} días
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Próximas Clases</CardTitle>
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
              <p className="text-muted-foreground">No tienes clases programadas próximamente.</p>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Course Materials</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="#">Ver Todo</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="recent">Recent</TabsTrigger>
                <TabsTrigger value="bookmarks">Bookmarks</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-4 space-y-4">
                <p className="text-muted-foreground">
                  Los materiales del curso estarán disponibles próximamente.
                </p>
              </TabsContent>
              <TabsContent value="recent" className="mt-4 space-y-4">
                <p className="text-muted-foreground">No hay materiales recientes.</p>
              </TabsContent>
              <TabsContent value="bookmarks" className="mt-4 space-y-4">
                <p className="text-muted-foreground">No tienes materiales guardados.</p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Language Progress</CardTitle>
          <CardDescription>Track your proficiency across different languages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dashboardData?.enrollments.length && dashboardData?.enrollments.length > 0 ? (
              dashboardData.enrollments.map((enrollment, index: number) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{enrollment.title}</span>
                      <Badge>Activo</Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(enrollment.progress)}%
                    </span>
                  </div>
                  <Progress value={enrollment.progress} className="h-2" />
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No tienes cursos activos.</p>
            )}
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

  // Actualiza el tiempo actual cada 10 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 10000)

    return () => clearInterval(interval)
  }, [])
  const timeRemaining = useMemo(() => {
    const days = differenceInDays(startDate, currentTime)
    const isPastClass = isAfter(currentTime, endDate)

    if (isPastClass) return 'Esta clase ya pasó'

    // Calculamos los días completos
    const remainingDays = Math.max(0, days)

    // Para las horas, restamos los días completos y calculamos
    const hoursDate = new Date(currentTime)
    hoursDate.setDate(hoursDate.getDate() + remainingDays)
    const hours = Math.max(0, differenceInHours(startDate, hoursDate))

    // Para los minutos, restamos los días y horas completas y calculamos
    const minutesDate = new Date(hoursDate)
    minutesDate.setHours(minutesDate.getHours() + hours)
    const minutes = Math.max(0, differenceInMinutes(startDate, minutesDate))

    if (remainingDays + hours + minutes === 0) return 'Clase en progreso'

    return `Faltan ${remainingDays} días, ${hours} horas y ${minutes} minutos`
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
          {status === 'in-progress' && <Badge className="bg-destructive">En Progreso</Badge>}
          {status === 'completed' && <Badge variant="secondary">Completado</Badge>}
          {status === 'upcoming' && <Badge variant="default">Próximamente</Badge>}
        </div>
        <div className="text-sm text-muted-foreground">
          <span>{format(startDate, 'dd/MM/yyyy HH:mm', { locale: es })}</span> •{' '}
          <span>{timeRemaining}</span>
        </div>
        <div className="text-sm text-muted-foreground">
          <span>Instructor: {instructor}</span>
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
