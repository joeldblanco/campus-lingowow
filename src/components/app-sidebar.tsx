'use client'

import {
  Book,
  BookOpenText,
  Calendar,
  CreditCard,
  FileText,
  GraduationCap,
  Laptop,
  LayoutDashboard,
  Package,
  Receipt,
  Shapes,
  ShoppingCart,
  Store,
  Tag,
  Trophy,
  UserCheck,
  Users,
  Zap,
} from 'lucide-react'
import * as React from 'react'

import { NavAdmin } from '@/components/nav-admin'
import { NavMain } from '@/components/nav-main'
import { NavUser } from '@/components/nav-user'
import CompanySidebarHeader from '@/components/sidebar/company-sidebar-header'
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from '@/components/ui/sidebar'
import { ROLES } from '@/lib/constants'
import { useSession } from 'next-auth/react'
import { UserRole } from '@prisma/client'

const data = {
  navMain: [
    {
      title: 'Panel de Control',
      url: '/dashboard',
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: 'Cursos',
      url: '/courses',
      icon: BookOpenText,
    },
    {
      title: 'Tienda',
      url: '/shop',
      icon: Store,
    },
    {
      title: 'Aula Virtual',
      url: '/classroom',
      icon: Laptop,
    },
    {
      title: 'Actividades',
      url: '/activities',
      icon: Shapes,
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
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession()
  const placeholderUser = {
    name: 'Anónimo',
    email: 'usuario@ejemplo.com',
    image: '/avatars/usuario.jpg',
    lastName: '',
    role: ROLES.GUEST,
  }

  let user = placeholderUser

  if (session?.user) {
    user = {
      name: session.user.name ?? placeholderUser.name,
      email: session.user.email ?? placeholderUser.email,
      image: session.user.image ?? placeholderUser.image,
      lastName: session.user.lastName,
      role: session.user.role ?? placeholderUser.role,
    }
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <CompanySidebarHeader />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {user.role === UserRole.ADMIN && <NavAdmin sections={data.navAdmin} />}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
