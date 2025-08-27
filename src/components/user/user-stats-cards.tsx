import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RoleNames, UserStats } from '@/types/user'
import { User, UserRole, UserStatus } from '@prisma/client'
import { ArrowUpIcon, ArrowDownIcon, Users, UserCheck, PieChart } from 'lucide-react'

interface UserStatsCardsProps {
  users: User[]
}

export function UserStatsCards({ users }: UserStatsCardsProps) {
  const stats = calculateUserStats(users)

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Usuarios Nuevos (Último Mes)</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.newUsers.count}</div>
          <div className="flex items-center text-xs text-muted-foreground">
            {stats.newUsers.growthPercentage > 0 ? (
              <>
                <ArrowUpIcon className="mr-1 h-4 w-4 text-green-500" />
                <span className="text-green-500">
                  {stats.newUsers.growthPercentage}% incremento
                </span>
              </>
            ) : (
              <>
                <ArrowDownIcon className="mr-1 h-4 w-4 text-red-500" />
                <span className="text-red-500">
                  {Math.abs(stats.newUsers.growthPercentage)}% decremento
                </span>
              </>
            )}
            <span className="ml-1">desde el mes anterior</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
          <UserCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.activeUsers}</div>
          <div className="text-xs text-muted-foreground">
            {Math.round((stats.activeUsers / users.length) * 100)}% de los usuarios totales
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Distribución de Roles de Usuario</CardTitle>
          <PieChart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(stats.roleDistribution).map(([role, count]) => (
              <div key={role} className="flex items-center">
                <div className="flex flex-1 text-xs capitalize">{RoleNames[role as UserRole]}:</div>
                <div className="flex-1">
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full ${getRoleColor(role as UserRole)}`}
                      // className={`h-full bg-primary`}
                      style={{ width: `${(count / users.length) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="w-10 text-xs text-right">{count}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function calculateUserStats(users: User[]): UserStats {
  const now = new Date()
  const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate())

  const newUsersLastMonth = users.filter(
    (user) => user.createdAt >= oneMonthAgo && user.createdAt <= now
  ).length

  const newUsersPreviousMonth = users.filter(
    (user) => user.createdAt >= twoMonthsAgo && user.createdAt < oneMonthAgo
  ).length

  const growthPercentage =
    newUsersPreviousMonth === 0
      ? 100
      : Math.round(((newUsersLastMonth - newUsersPreviousMonth) / newUsersPreviousMonth) * 100)

  const activeUsers = users.filter((user) => user.status === UserStatus.ACTIVE).length

  const roleDistribution = users.reduce(
    (acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1
      return acc
    },
    {} as Record<UserRole, number>
  )

  // Ensure all roles are represented
  const allRoles: UserRole[] = [UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.GUEST]
  allRoles.forEach((role) => {
    if (!roleDistribution[role]) roleDistribution[role] = 0
  })

  return {
    newUsers: {
      count: newUsersLastMonth,
      growthPercentage,
    },
    activeUsers,
    roleDistribution,
  }
}

function getRoleColor(role: UserRole): string {
  switch (role) {
    // case UserRole.ADMIN:
    //   return 'bg-blue-500'
    // case UserRole.TEACHER:
    //   return 'bg-green-500'
    // case UserRole.STUDENT:
    //   return 'bg-yellow-500'
    // case UserRole.GUEST:
    //   return 'bg-gray-500'
    default:
      return 'bg-primary'
  }
}
