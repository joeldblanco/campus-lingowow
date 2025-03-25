'use client'

import { BookOpenText, Frame, Laptop, LayoutDashboard, Map, PieChart, Store } from 'lucide-react'
import * as React from 'react'

import { NavMain } from '@/components/nav-main'
import { NavProjects } from '@/components/nav-projects'
import { NavUser } from '@/components/nav-user'
import CompanySidebarHeader from '@/components/sidebar/company-sidebar-header'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { ROLES } from '@/lib/constants'
import { useSession } from 'next-auth/react'

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
  ],
  projects: [
    {
      name: 'Design Engineering',
      url: '#',
      icon: Frame,
    },
    {
      name: 'Sales & Marketing',
      url: '#',
      icon: PieChart,
    },
    {
      name: 'Travel',
      url: '#',
      icon: Map,
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
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
