'use client'

import { Button } from '@/components/ui/button'
import { UserRole } from '@prisma/client'
import { UserIcon, Users } from 'lucide-react'

interface UserRoleToggleProps {
  userRole: UserRole
  setUserRole: (role: UserRole) => void
}

export function UserRoleToggle({ userRole, setUserRole }: UserRoleToggleProps) {
  return (
    <div className="flex items-center space-x-2">
      <Button
        variant={userRole === UserRole.STUDENT ? 'default' : 'outline'}
        size="sm"
        onClick={() => setUserRole(UserRole.STUDENT)}
        className="flex items-center gap-2"
      >
        <UserIcon className="h-4 w-4" />
        Estudiante
      </Button>
      <Button
        variant={userRole === UserRole.TEACHER ? 'default' : 'outline'}
        size="sm"
        onClick={() => setUserRole(UserRole.TEACHER)}
        className="flex items-center gap-2"
      >
        <Users className="h-4 w-4" />
        Profesor
      </Button>
    </div>
  )
}
