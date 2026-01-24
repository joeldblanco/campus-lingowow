import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getActivity } from '@/lib/actions/activity'
import { format } from 'date-fns'
import {
  ArrowLeft,
  Award,
  BarChart,
  BookOpen,
  Clock,
  Edit,
  Headphones,
  Mic,
  PenTool,
  Users,
} from 'lucide-react'
import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { StudentAssignmentsTable } from '@/components/activities/student-assignments/student-assignments-table'

export const metadata: Metadata = {
  title: 'Detalle de Actividad | Lingowow',
  description: 'Ver detalles de una actividad específica',
}

interface ActivityDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function ActivityDetailPage({ params }: ActivityDetailPageProps) {
  const { id } = await params
  const activity = await getActivity(id)

  if (!activity) {
    notFound()
  }

  // Función para obtener el icono según el tipo de actividad
  const getActivityIcon = () => {
    switch (activity.activityType) {
      case 'READING':
        return <BookOpen className="h-5 w-5 text-green-500" />
      case 'LISTENING':
        return <Headphones className="h-5 w-5 text-blue-500" />
      case 'SPEAKING':
        return <Mic className="h-5 w-5 text-purple-500" />
      case 'WRITING':
        return <PenTool className="h-5 w-5 text-orange-500" />
      case 'VOCABULARY':
        return <BookOpen className="h-5 w-5 text-yellow-500" />
      default:
        return <BookOpen className="h-5 w-5" />
    }
  }

  // Función para obtener el label del tipo de actividad
  const getActivityTypeLabel = () => {
    switch (activity.activityType) {
      case 'READING':
        return 'Lectura'
      case 'LISTENING':
        return 'Escucha'
      case 'SPEAKING':
        return 'Habla'
      case 'WRITING':
        return 'Escritura'
      case 'VOCABULARY':
        return 'Vocabulario'
      default:
        return activity.activityType
    }
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/activities">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a actividades
          </Link>
        </Button>

        <Button asChild>
          <Link href={`/admin/activities/${id}/edit`}>
            <Edit className="h-4 w-4 mr-2" />
            Editar actividad
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    {getActivityIcon()}
                    <Badge variant="outline">{getActivityTypeLabel()}</Badge>
                    <Badge variant={activity.isPublished ? 'default' : 'outline'}>
                      {activity.isPublished ? 'Publicado' : 'Borrador'}
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl mt-2">{activity.title}</CardTitle>
                </div>
                <div className="text-right">
                  <div className="flex items-center text-yellow-500">
                    <Award className="h-5 w-5 mr-1" />
                    <span className="font-medium">{activity.points} XP</span>
                  </div>
                  <div className="flex items-center text-muted-foreground mt-1">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>{activity.duration} minutos</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Descripción</h3>
                  <p className="text-muted-foreground">{activity.description}</p>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">Detalles</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/50 p-3 rounded-md">
                      <div className="text-sm text-muted-foreground">Nivel</div>
                      <div className="font-medium">{activity.level}</div>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-md">
                      <div className="text-sm text-muted-foreground">Fecha de creación</div>
                      <div className="font-medium">{format(activity.createdAt, 'dd/MM/yyyy')}</div>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-md">
                      <div className="text-sm text-muted-foreground">Última actualización</div>
                      <div className="font-medium">{format(activity.updatedAt, 'dd/MM/yyyy')}</div>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-md">
                      <div className="text-sm text-muted-foreground">Creado por</div>
                      <div className="font-medium">
                        {activity.createdBy 
                          ? `${activity.createdBy.name}${activity.createdBy.lastName ? ' ' + activity.createdBy.lastName : ''}`
                          : 'Sistema'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estudiantes Asignados</CardTitle>
              <CardDescription>Gestiona los estudiantes que tienen esta actividad asignada</CardDescription>
            </CardHeader>
            <CardContent>
              <StudentAssignmentsTable activityId={id} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Estadísticas</CardTitle>
              <CardDescription>Desempeño y uso de esta actividad</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-blue-500 mr-2" />
                    <span>Estudiantes asignados</span>
                  </div>
                  <span className="font-medium">0</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <BarChart className="h-5 w-5 text-green-500 mr-2" />
                    <span>Tasa de finalización</span>
                  </div>
                  <span className="font-medium">0%</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Award className="h-5 w-5 text-yellow-500 mr-2" />
                    <span>Puntuación promedio</span>
                  </div>
                  <span className="font-medium">-</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
