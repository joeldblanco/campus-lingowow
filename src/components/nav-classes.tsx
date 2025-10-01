'use client'

import { ChevronRight, Laptop } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import { useCurrentClass } from '@/context/current-class'
import { getUserClasses } from '@/lib/actions/dashboard'
import { hasRole } from '@/lib/utils/roles'
import { UserRole } from '@prisma/client'

type UserClass = {
  id: string
  name: string
  course: string
  date: string
  time: string
  isStudent: boolean
}

export function NavClasses() {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { currentClassId, setCurrentClass } = useCurrentClass()
  const [classes, setClasses] = useState<UserClass[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadClasses = async () => {
      if (session?.user?.id) {
        setLoading(true)
        try {
          const userClasses = await getUserClasses(session.user.id)
          setClasses(userClasses)
        } catch (error) {
          console.error('Error loading classes:', error)
        } finally {
          setLoading(false)
        }
      }
    }

    loadClasses()
  }, [session?.user?.id])

  const handleClassClick = (classId: string) => {
    setCurrentClass(classId)
    router.push(`/classroom?classId=${classId}`)
  }

  // Verificar que el usuario tenga rol STUDENT
  const userRoles = session?.user?.roles ?? [UserRole.GUEST]
  if (!hasRole(userRoles, UserRole.STUDENT)) {
    return null
  }

  if (loading) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>Mis Clases</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton disabled>
              <Laptop />
              <span>Cargando clases...</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    )
  }

  if (classes.length === 0) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>Mis Clases</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton disabled>
              <Laptop />
              <span>No hay clases programadas</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    )
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Mis Clases</SidebarGroupLabel>
      <SidebarMenu>
        <Collapsible defaultOpen className="group/collapsible">
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton tooltip="Clases">
                <Laptop />
                <span>Aula Virtual</span>
                <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {classes.map((classItem) => (
                  <SidebarMenuSubItem key={classItem.id}>
                    <SidebarMenuSubButton
                      onClick={() => handleClassClick(classItem.id)}
                      isActive={currentClassId === classItem.id || pathname === `/classroom?classId=${classItem.id}`}
                    >
                      <span className="truncate">{classItem.name}</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      </SidebarMenu>
    </SidebarGroup>
  )
}
