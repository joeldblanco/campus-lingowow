'use client'

import { Button } from '@/components/ui/button'
import { getGuestDashboardStats } from '@/lib/actions/dashboard'
import type { GuestDashboardData } from '@/types/dashboard'
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Calendar,
  Clock,
  FileText,
  Globe,
  Headphones,
  Languages,
  Sparkles,
  Star,
  Ticket,
  Users,
  Video,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const languageGradients: Record<string, string> = {
  'Español': 'from-yellow-400 to-orange-500',
  'Inglés': 'from-blue-500 to-indigo-600',
  'English': 'from-blue-500 to-indigo-600',
  'Portugués': 'from-green-500 to-emerald-600',
  'Portuguese': 'from-green-500 to-emerald-600',
  'Francés': 'from-purple-500 to-pink-600',
  'French': 'from-purple-500 to-pink-600',
  'Alemán': 'from-teal-400 to-emerald-600',
  'German': 'from-teal-400 to-emerald-600',
  'Italiano': 'from-red-500 to-pink-600',
  'Italian': 'from-red-500 to-pink-600',
  'Japonés': 'from-red-500 to-rose-600',
  'Japanese': 'from-red-500 to-rose-600',
  'default': 'from-slate-500 to-slate-700',
}

const getGradient = (language: string) => {
  return languageGradients[language] || languageGradients['default']
}

const GuestDashboard = () => {
  const [dashboardData, setDashboardData] = useState<GuestDashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getGuestDashboardStats()
        setDashboardData(data)
      } catch (error) {
        console.error('Error loading guest dashboard:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-blue-600 shadow-lg">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+CjxyZWN0IHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgZmlsbD0iIzAwMDAwMDA1Ij48L3JlY3Q+CjxwYXRoIGQ9Ik0wIDMwaDYwTTMwIDB2NjAiIHN0cm9rZT0iI2ZmZmZmZjEwIiBzdHJva2Utd2lkdGg9IjEiPjwvcGF0aD4KPC9zdmc+')] opacity-20"></div>
        <div className="relative p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 text-white">
          <div className="max-w-xl space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-medium border border-white/20 text-white">
              <Sparkles className="w-4 h-4" /> Nuevo: Inscripciones Abiertas
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Domina un nuevo idioma esta temporada
            </h2>
            <p className="text-blue-100 text-lg">
              Accede a clases en vivo con profesores certificados, explora nuestro catálogo de cursos 
              y comienza tu camino hacia la fluidez hoy.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/shop">
                <Button className="px-5 py-2.5 bg-white text-primary hover:bg-blue-50 font-semibold rounded-lg transition-colors shadow-sm">
                  Inscribirme Ahora
                </Button>
              </Link>
              <Link href="/shop">
                <Button
                  variant="ghost"
                  className="px-5 py-2.5 bg-blue-700/50 hover:bg-blue-700/70 text-white font-medium rounded-lg backdrop-blur-sm transition-colors border border-white/10"
                >
                  Explorar Cursos
                </Button>
              </Link>
            </div>
          </div>
          <div className="hidden md:block opacity-90">
            <Globe className="w-44 h-44 text-white/20" strokeWidth={0.5} />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-card-dark p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center shrink-0">
            <Languages className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {dashboardData?.stats.languagesAvailable || 0}+
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Idiomas Disponibles</p>
          </div>
        </div>
        <div className="bg-white dark:bg-card-dark p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center shrink-0">
            <BadgeCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {dashboardData?.stats.certifiedTeachers || 0}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Profesores Certificados</p>
          </div>
        </div>
        <div className="bg-white dark:bg-card-dark p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center shrink-0">
            <Ticket className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">Gratis</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Clases de Prueba</p>
          </div>
        </div>
      </div>

      {/* Popular Courses Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Cursos Populares</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Comienza a aprender los idiomas más demandados.
            </p>
          </div>
          <Link
            href="/shop"
            className="text-primary hover:text-primary-dark text-sm font-medium flex items-center gap-1"
          >
            Explorar Todos los Cursos <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        
        {dashboardData?.popularCourses && dashboardData.popularCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {dashboardData.popularCourses.map((course) => (
              <div
                key={course.id}
                className="group bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden hover:shadow-md transition-all"
              >
                <div
                  className={`h-32 bg-gradient-to-br ${getGradient(course.language)} relative p-4 flex items-end`}
                >
                  <span className="absolute top-3 right-3 bg-white/90 dark:bg-black/50 backdrop-blur px-2 py-0.5 rounded text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" /> {course.rating}
                  </span>
                  <h4 className="text-2xl font-bold text-white drop-shadow-md">{course.language}</h4>
                </div>
                <div className="p-4">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                    {course.level}
                  </p>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-primary transition-colors">
                    {course.title}
                  </h4>
                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-4">
                    <Users className="w-4 h-4" /> {course.studentCount} Estudiantes
                  </div>
                  <Link href="/shop">
                    <Button
                      variant="outline"
                      className="w-full py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      Ver Detalles
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
            <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">
              No hay cursos disponibles en este momento.
            </p>
          </div>
        )}
      </div>

      {/* Two Column Section: Webinars & Resources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upcoming Webinars */}
        <div className="bg-white dark:bg-card-dark p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Video className="w-5 h-5 text-primary" /> Próximos Webinars Gratuitos
            </h3>
            <Link href="/events" className="text-xs font-medium text-slate-500 hover:text-primary">
              Ver Calendario
            </Link>
          </div>
          
          {dashboardData?.upcomingWebinars && dashboardData.upcomingWebinars.length > 0 ? (
            <div className="space-y-4">
              {dashboardData.upcomingWebinars.map((webinar) => (
                <div
                  key={webinar.id}
                  className="flex gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center w-14 h-14 bg-white dark:bg-card-dark rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
                    <span className="text-xs font-bold text-red-500 uppercase">
                      {new Date(webinar.date).toLocaleDateString('es-ES', { month: 'short' })}
                    </span>
                    <span className="text-xl font-bold text-slate-900 dark:text-white">
                      {new Date(webinar.date).getDate()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 dark:text-white truncate">{webinar.title}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1">
                      <Clock className="w-3.5 h-3.5" /> {webinar.time}
                    </p>
                  </div>
                  <Button size="sm" className="self-center px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
                    Inscribirse
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No hay webinars programados próximamente.
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                ¡Vuelve pronto para ver nuevos eventos!
              </p>
            </div>
          )}
        </div>

        {/* Free Resources */}
        <div className="bg-white dark:bg-card-dark p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-500" /> Recursos Gratuitos
            </h3>
            <Link href="/resources" className="text-xs font-medium text-slate-500 hover:text-primary">
              Ver Biblioteca
            </Link>
          </div>
          
          {dashboardData?.freeResources && dashboardData.freeResources.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {dashboardData.freeResources.map((resource) => (
                <Link
                  key={resource.id}
                  href={resource.url}
                  className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary dark:hover:border-primary cursor-pointer transition-all group"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors ${
                    resource.type === 'PDF' ? 'bg-red-50 dark:bg-red-900/20 text-red-500 group-hover:bg-red-100 dark:group-hover:bg-red-900/40' :
                    resource.type === 'Audio' ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-500 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/40' :
                    'bg-blue-50 dark:bg-blue-900/20 text-blue-500 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40'
                  }`}>
                    {resource.type === 'PDF' ? <FileText className="w-5 h-5" /> :
                     resource.type === 'Audio' ? <Headphones className="w-5 h-5" /> :
                     <BookOpen className="w-5 h-5" />}
                  </div>
                  <h4 className="font-semibold text-slate-900 dark:text-white text-sm">{resource.title}</h4>
                  <p className="text-xs text-slate-500 mt-1">{resource.language} • {resource.type}</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No hay recursos disponibles en este momento.
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Pronto agregaremos materiales gratuitos.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-8 text-center">
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          ¿Listo para comenzar tu viaje?
        </h3>
        <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
          Inscríbete en un curso y accede a clases en vivo, materiales exclusivos y más.
        </p>
        <Link href="/shop">
          <Button className="px-8 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-colors shadow-md shadow-blue-500/30">
            Ver Cursos Disponibles
          </Button>
        </Link>
      </div>
    </div>
  )
}

export default GuestDashboard
