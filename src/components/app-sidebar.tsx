'use client'

import {
  BarChart3,
  Bell,
  Book,
  BookOpenText,
  Calendar,
  CalendarCog,
  ClipboardList,
  CreditCard,
  DollarSign,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Library,
  LineChart,
  Package,
  PieChart,
  Receipt,
  ScrollText,
  Shapes,
  ShoppingCart,
  Store,
  Tag,
  TrendingUp,
  Trophy,
  UserCheck,
  Users,
  UserCog,
  Wallet,
  Zap,
  FolderOpen,
  Video,
} from 'lucide-react'
import * as React from 'react'

import { NavAdmin } from '@/components/nav-admin'
import { NavClasses } from '@/components/nav-classes'
import { NavMain } from '@/components/nav-main'
import { NavUser } from '@/components/nav-user'
import { NavStudent } from '@/components/nav-student'
import CompanySidebarHeader from '@/components/sidebar/company-sidebar-header'
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from '@/components/ui/sidebar'
import { NavMessages } from '@/components/nav-messages'
import { hasRole } from '@/lib/utils/roles'
import { UserRole } from '@prisma/client'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

const data = {
  navMain: [
    {
      title: 'Panel de Control',
      url: '/dashboard',
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: 'Tienda',
      url: '/shop',
      icon: Store,
    },
    {
      title: 'Actividades',
      url: '/activities',
      icon: Shapes,
    },
    {
      title: 'Biblioteca',
      url: '/library',
      icon: Library,
    },
    {
      title: 'Grabaciones',
      url: '/recordings',
      icon: Video,
    },
  ],
  navStudent: [
    {
      title: 'Mis Exámenes',
      url: '/student/exams',
      icon: ClipboardList,
    },
  ],
  navTeacher: [
    {
      title: 'Mis Ganancias',
      url: '/teacher/earnings',
      icon: DollarSign,
    },
  ],
  navAdmin: [
    {
      title: 'Gestión de Usuarios',
      icon: Users,
      subItems: [
        {
          title: 'Usuarios',
          url: '/admin/users',
          icon: Users,
        },
        {
          title: 'Inscripciones',
          url: '/admin/enrollments',
          icon: UserCheck,
        },
      ],
    },
    {
      title: 'Gestión Académica',
      icon: Book,
      subItems: [
        {
          title: 'Períodos Académicos',
          url: '/admin/academic-periods',
          icon: Calendar,
        },
        {
          title: 'Profesores',
          url: '/admin/teachers',
          icon: UserCog,
        },
        {
          title: 'Cursos',
          url: '/admin/courses',
          icon: BookOpenText,
        },
        {
          title: 'Clases',
          url: '/admin/classes',
          icon: GraduationCap,
        },
        {
          title: 'Calificaciones',
          url: '/admin/grades',
          icon: Trophy,
        },
        {
          title: 'Exámenes',
          url: '/admin/exams',
          icon: FileText,
        },
        {
          title: 'Actividades',
          url: '/admin/activities',
          icon: Shapes,
        },
        {
          title: 'Biblioteca',
          url: '/admin/library',
          icon: Library,
        },
        {
          title: 'Calendario',
          url: '/admin/calendar-settings',
          icon: CalendarCog,
        },
      ],
    },
    {
      title: 'Gestión Comercial',
      icon: ShoppingCart,
      subItems: [
        {
          title: 'Facturas',
          url: '/admin/invoices',
          icon: Receipt,
        },
        {
          title: 'Productos',
          url: '/admin/products',
          icon: Package,
        },
        {
          title: 'Planes',
          url: '/admin/plans',
          icon: CreditCard,
        },
        {
          title: 'Categorías',
          url: '/admin/categories',
          icon: Tag,
        },
        {
          title: 'Características',
          url: '/admin/features',
          icon: Zap,
        },
        {
          title: 'Cupones',
          url: '/admin/coupons',
          icon: Tag,
        },
        {
          title: 'Pagos a Profesores',
          url: '/admin/payments/teachers',
          icon: DollarSign,
        },
        {
          title: 'Finanzas',
          url: '/admin/finance',
          icon: Wallet,
        },
      ],
    },
    {
      title: 'Gestión de Archivos',
      icon: FolderOpen,
      url: '/admin/files',
    },
    {
      title: 'Analytics',
      icon: BarChart3,
      subItems: [
        {
          title: 'Dashboard',
          url: '/admin/analytics',
          icon: LayoutDashboard,
        },
        {
          title: 'Ingresos',
          url: '/admin/analytics/revenue',
          icon: TrendingUp,
        },
        {
          title: 'Gastos',
          url: '/admin/analytics/expenses',
          icon: Wallet,
        },
        {
          title: 'Productos',
          url: '/admin/analytics/products',
          icon: PieChart,
        },
        {
          title: 'Profesores',
          url: '/admin/analytics/teachers',
          icon: GraduationCap,
        },
        {
          title: 'Estudiantes',
          url: '/admin/analytics/students',
          icon: Users,
        },
        {
          title: 'Proyecciones',
          url: '/admin/analytics/projections',
          icon: LineChart,
        },
        {
          title: 'Avanzado',
          url: '/admin/analytics/advanced',
          icon: BarChart3,
        },
      ],
    },
    {
      title: 'Comunicaciones',
      icon: Bell,
      subItems: [
        {
          title: 'Notificaciones Masivas',
          url: '/admin/notifications',
          icon: Bell,
        },
      ],
    },
    {
      title: 'Registro de Actividad',
      icon: ScrollText,
      url: '/admin/audit-logs',
    },
  ],
  navEditor: [
    {
      title: 'Gestión de Contenido',
      icon: Book,
      subItems: [
        {
          title: 'Biblioteca',
          url: '/admin/library',
          icon: Library,
        },
      ],
    },
  ],
}

function BlueQRCode() {
  return (
    <svg width="52" height="52" viewBox="0 0 29 29" className="text-primary fill-current">
      {/* Position Detection Patterns */}
      {/* Top Left */}
      <path d="M0,0 h7 v7 h-7 z M1,1 h5 v5 h-5 z M2,2 h3 v3 h-3 z" />
      {/* Top Right */}
      <path d="M22,0 h7 v7 h-7 z M23,1 h5 v5 h-5 z M24,2 h3 v3 h-3 z" />
      {/* Bottom Left */}
      <path d="M0,22 h7 v7 h-7 z M1,23 h5 v5 h-5 z M2,24 h3 v3 h-3 z" />

      {/* Alignment Pattern */}
      <path d="M22,22 h5 v5 h-5 z M23,23 h3 v3 h-3 z M24,24 h1 v1 h-1 z" />

      {/* Timing Patterns */}
      <path d="M8,2 h1 v1 h-1 z M10,2 h1 v1 h-1 z M12,2 h1 v1 h-1 z M14,2 h1 v1 h-1 z M16,2 h1 v1 h-1 z M18,2 h1 v1 h-1 z M20,2 h1 v1 h-1 z" />
      <path d="M2,8 h1 v1 h-1 z M2,10 h1 v1 h-1 z M2,12 h1 v1 h-1 z M2,14 h1 v1 h-1 z M2,16 h1 v1 h-1 z M2,18 h1 v1 h-1 z M2,20 h1 v1 h-1 z" />

      {/* Fake Data Blocks */}
      <path d="M9,9 h2 v1 h-2 z M13,9 h1 v2 h-1 z M16,9 h3 v1 h-3 z M20,9 h1 v1 h-1 z" />
      <path d="M9,12 h1 v3 h-1 z M11,12 h3 v1 h-3 z M16,12 h1 v2 h-1 z M18,12 h2 v1 h-2 z" />
      <path d="M9,16 h3 v1 h-3 z M14,16 h1 v1 h-1 z M17,16 h2 v2 h-2 z M20,16 h1 v1 h-1 z" />
      <path d="M9,19 h1 v2 h-1 z M12,19 h2 v1 h-2 z M15,19 h1 v1 h-1 z M18,19 h3 v1 h-3 z" />
      <path d="M9,22 h1 v1 h-1 z M11,22 h2 v2 h-2 z M15,22 h3 v1 h-3 z" />
      <path d="M9,25 h3 v1 h-3 z M14,25 h2 v2 h-2 z M18,25 h1 v1 h-1 z" />

      <path d="M12,0 h1 v2 h-1 z M15,0 h2 v1 h-2 z M18,0 h1 v1 h-1 z M20,0 h1 v2 h-1 z" />
      <path d="M12,4 h2 v1 h-2 z M16,4 h1 v2 h-1 z M19,4 h2 v1 h-2 z" />
      <path d="M12,7 h1 v1 h-1 z M14,7 h3 v1 h-3 z M19,7 h1 v1 h-1 z" />

      <path d="M0,12 h2 v1 h-2 z M3,12 h1 v1 h-1 z M5,12 h2 v1 h-2 z" />
      <path d="M0,15 h1 v2 h-1 z M3,15 h3 v1 h-3 z" />
      <path d="M0,18 h2 v1 h-2 z M4,18 h1 v2 h-1 z M6,18 h1 v1 h-1 z" />
    </svg>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession()
  const placeholderUser = {
    id: 'guest',
    name: 'Anónimo',
    email: 'usuario@ejemplo.com',
    image: '',
    lastName: '',
    roles: [UserRole.GUEST] as UserRole[],
  }

  let user = placeholderUser

  if (session?.user) {
    user = {
      id: session.user.id ?? placeholderUser.id,
      name: session.user.name ?? placeholderUser.name,
      email: session.user.email ?? placeholderUser.email,
      image: session.user.image ?? placeholderUser.image,
      lastName: session.user.lastName || '',
      roles: session.user.roles ?? placeholderUser.roles,
    }
  }

  const isStudent = hasRole(user.roles, UserRole.STUDENT)
  const isAdmin = user.roles.includes(UserRole.ADMIN)
  const isTeacher = hasRole(user.roles, UserRole.TEACHER)
  const showStudentSidebar = isStudent && !isAdmin && !isTeacher

  return (
    <Sidebar collapsible="icon" {...props} data-tour="sidebar">
      <SidebarHeader>
        <CompanySidebarHeader />
      </SidebarHeader>
      <SidebarContent>
        {showStudentSidebar ? (
          <NavStudent />
        ) : (
          <>
            <NavMain items={data.navMain} />
            <NavMessages />
            {isStudent && <NavClasses />}
            {isStudent && <NavMain items={data.navStudent} />}
            {isTeacher && <NavMain items={data.navTeacher} />}
            {isAdmin && <NavAdmin sections={data.navAdmin} />}
            {hasRole(user.roles, UserRole.EDITOR) && !isAdmin && (
              <NavAdmin sections={data.navEditor} />
            )}
          </>
        )}
      </SidebarContent>
      <SidebarFooter>
        {showStudentSidebar && (
          <div className="group-data-[collapsible=icon]:hidden flex flex-col items-center p-2 mx-3 mb-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 font-nunito">
            <Link
              href="/download-app"
              className="flex items-center gap-2.5 text-left group/qr hover:opacity-90 transition-opacity w-full"
            >
              <div className="shrink-0 p-1.5 bg-white dark:bg-slate-950 rounded-lg border border-slate-200/60 dark:border-slate-800/60 shadow-sm group-hover/qr:border-primary/40 transition-colors">
                <BlueQRCode />
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                  Descarga la App
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-tight">
                  Escanea con tu celular
                </span>
              </div>
            </Link>
          </div>
        )}
        {!showStudentSidebar && <NavUser user={user} />}
      </SidebarFooter>
    </Sidebar>
  )
}
