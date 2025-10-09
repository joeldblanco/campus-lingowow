'use client'

import { CalendarApp } from '@/components/calendar/calendar-component'
import StudentDashboard from '@/components/dashboard/student-dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserRole } from '@prisma/client'
import { BookOpen, Calendar, DollarSign, Users, Video } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { getAdminDashboardStats, getTeacherDashboardStats } from '@/lib/actions/dashboard'
import type { AdminDashboardData, TeacherDashboardData } from '@/types/dashboard'
import { Button } from '@/components/ui/button'

const Dashboard = () => {
  const { data: session } = useSession()
  const [adminData, setAdminData] = useState<AdminDashboardData | null>(null)
  const [teacherData, setTeacherData] = useState<TeacherDashboardData | null>(null)

  // Cargar datos del dashboard según el rol
  useEffect(() => {
    const loadDashboardData = async () => {
      if (session?.user) {
        try {
          if (session.user.roles.includes(UserRole.ADMIN)) {
            const data = await getAdminDashboardStats()
            setAdminData(data)
          } else if (session.user.roles.includes(UserRole.TEACHER) && session.user.id) {
            const data = await getTeacherDashboardStats(session.user.id)
            setTeacherData(data)
          }
        } catch (error) {
          console.error('Error loading dashboard data:', error)
        }
      }
    }

    loadDashboardData()
  }, [session])

  const userRoles = session?.user?.roles

  // Renderizar el dashboard según el rol
  return (
    <div className="p-6">
      {userRoles?.includes(UserRole.ADMIN) && <AdminDashboard dashboardData={adminData} />}
      {userRoles?.includes(UserRole.TEACHER) && <TeacherDashboard dashboardData={teacherData} />}
      {userRoles?.includes(UserRole.STUDENT) && <StudentDashboard />}
      {userRoles?.includes(UserRole.GUEST) && <GuestDashboard />}
    </div>
  )
}

// Componente para el dashboard de administradores
const AdminDashboard = ({ dashboardData }: { dashboardData: AdminDashboardData | null }) => {
  if (!dashboardData) return <div>Cargando datos...</div>
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Panel de Administrador</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Estudiantes</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.totalStudents}</div>
            <p className="text-xs text-gray-500">Total de estudiantes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Clases Impartidas</CardTitle>
            <BookOpen className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.totalClasses}</div>
            <p className="text-xs text-gray-500">Clases completadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$19,000</div>
            <p className="text-xs text-gray-500">Próximamente</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="ingresos">
        <TabsList>
          <TabsTrigger value="ingresos">Ingresos</TabsTrigger>
          <TabsTrigger value="clases">Clases por Idioma</TabsTrigger>
        </TabsList>
        <TabsContent value="ingresos" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Ingresos Mensuales</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[{ name: 'Próximamente', income: 0 }]}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Bar dataKey="income" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="clases" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Clases por Idioma</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dashboardData.languageStats}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Bar dataKey="classes" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Últimas Inscripciones</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estudiante</TableHead>
                <TableHead>Curso</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dashboardData.recentEnrollments.map((enrollment, index: number) => (
                <TableRow key={index}>
                  <TableCell>{enrollment.studentName}</TableCell>
                  <TableCell>{enrollment.courseName}</TableCell>
                  <TableCell>{enrollment.date}</TableCell>
                  <TableCell>{enrollment.amount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

// Componente para el dashboard de profesores
const TeacherDashboard = ({ dashboardData }: { dashboardData: TeacherDashboardData | null }) => {
  const router = useRouter()
  
  if (!dashboardData) return <div>Cargando datos...</div>
  
  const handleJoinClass = (classId: string) => {
    router.push(`/classroom?classId=${classId}`)
  }
  
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Panel de Profesor</h2>

      <CalendarApp />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Mis Estudiantes</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.totalStudents}</div>
            <p className="text-xs text-gray-500">Estudiantes activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Clases Impartidas</CardTitle>
            <Calendar className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.classesThisMonth}</div>
            <p className="text-xs text-gray-500">En este mes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
            <DollarSign className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${dashboardData.monthlyRevenue}</div>
            <p className="text-xs text-gray-500">Este mes</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mis Ingresos</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dashboardData.revenueData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Bar dataKey="income" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Próximas Clases</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estudiante</TableHead>
                <TableHead>Curso</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Hora</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dashboardData.upcomingClasses.map((classItem, index: number) => (
                <TableRow key={index}>
                  <TableCell>{classItem.studentName}</TableCell>
                  <TableCell>{classItem.course}</TableCell>
                  <TableCell>{classItem.date}</TableCell>
                  <TableCell>{classItem.time}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={() => handleJoinClass(classItem.id)}
                      className="gap-2"
                    >
                      <Video className="h-4 w-4" />
                      Entrar al aula
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

// Componente para el dashboard de estudiantes
// const StudentDashboard = () => {
//   return (
//     <div className="space-y-6">
//       <h2 className="text-3xl font-bold">Mi Aprendizaje</h2>
//       {/* <CalendarApp /> */}
//       <AcademicCalendar />
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between pb-2">
//             <CardTitle className="text-sm font-medium">Cursos Activos</CardTitle>
//             <BookOpen className="h-4 w-4 text-gray-500" />
//           </CardHeader>
//           <CardContent>
//             <div className="text-2xl font-bold">2</div>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between pb-2">
//             <CardTitle className="text-sm font-medium">Clases Completadas</CardTitle>
//             <Calendar className="h-4 w-4 text-gray-500" />
//           </CardHeader>
//           <CardContent>
//             <div className="text-2xl font-bold">24</div>
//             <p className="text-xs text-gray-500">En total</p>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between pb-2">
//             <CardTitle className="text-sm font-medium">Grabaciones</CardTitle>
//             <FileText className="h-4 w-4 text-gray-500" />
//           </CardHeader>
//           <CardContent>
//             <div className="text-2xl font-bold">18</div>
//             <p className="text-xs text-gray-500">Disponibles</p>
//           </CardContent>
//         </Card>
//       </div>

//       <Card>
//         <CardHeader>
//           <CardTitle>Mis Próximas Clases</CardTitle>
//         </CardHeader>
//         <CardContent>
//           <Table>
//             <TableHeader>
//               <TableRow>
//                 <TableHead>Curso</TableHead>
//                 <TableHead>Profesor</TableHead>
//                 <TableHead>Fecha</TableHead>
//                 <TableHead>Hora</TableHead>
//               </TableRow>
//             </TableHeader>
//             <TableBody>
//               <TableRow>
//                 <TableCell>Inglés Avanzado</TableCell>
//                 <TableCell>Sarah Johnson</TableCell>
//                 <TableCell>29/03/2025</TableCell>
//                 <TableCell>16:00</TableCell>
//               </TableRow>
//               <TableRow>
//                 <TableCell>Inglés Avanzado</TableCell>
//                 <TableCell>Sarah Johnson</TableCell>
//                 <TableCell>01/04/2025</TableCell>
//                 <TableCell>16:00</TableCell>
//               </TableRow>
//             </TableBody>
//           </Table>
//         </CardContent>
//       </Card>

//       <Card>
//         <CardHeader>
//           <CardTitle>Mis Cursos</CardTitle>
//         </CardHeader>
//         <CardContent>
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <Card>
//               <CardHeader>
//                 <CardTitle>Inglés Avanzado</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <p>Progreso: 65%</p>
//                 <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
//                   <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '65%' }}></div>
//                 </div>
//                 <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
//                   Continuar
//                 </button>
//               </CardContent>
//             </Card>

//             <Card>
//               <CardHeader>
//                 <CardTitle>Francés Básico</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <p>Progreso: 30%</p>
//                 <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
//                   <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '30%' }}></div>
//                 </div>
//                 <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
//                   Continuar
//                 </button>
//               </CardContent>
//             </Card>
//           </div>
//         </CardContent>
//       </Card>
//     </div>
//   )
// }

// Componente para el dashboard de invitados
const GuestDashboard = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Bienvenido a Lingowow</h2>

      <Card>
        <CardHeader>
          <CardTitle>Descubre Nuestros Cursos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Inglés</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Desde nivel básico hasta avanzado</p>
                <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                  Ver Más
                </button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Español</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Aprende español con profesores expertos</p>
                <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                  Ver Más
                </button>
              </CardContent>
            </Card>

            <Card className="opacity-60">
              <CardHeader>
                <CardTitle>Francés</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Próximamente - Cursos de francés</p>
                <button className="mt-4 px-4 py-2 bg-gray-400 text-white rounded cursor-not-allowed" disabled>
                  Próximamente
                </button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>¿Por qué elegirnos?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center text-center">
              <Users className="h-12 w-12 text-blue-500 mb-2" />
              <h3 className="font-bold">Profesores Expertos</h3>
              <p>Aprende con profesores experimentados</p>
            </div>

            <div className="flex flex-col items-center text-center">
              <Calendar className="h-12 w-12 text-blue-500 mb-2" />
              <h3 className="font-bold">Horarios Flexibles</h3>
              <p>Programa tus clases cuando más te convenga</p>
            </div>

            <div className="flex flex-col items-center text-center">
              <BookOpen className="h-12 w-12 text-blue-500 mb-2" />
              <h3 className="font-bold">Materiales Exclusivos</h3>
              <p>Accede a contenido desarrollado por expertos</p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold">
              Registrarse Ahora
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Dashboard
