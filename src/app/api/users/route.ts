import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getAllUsers } from '@/lib/actions/user'
import { UserRole } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar que el usuario sea admin
    if (!session.user.roles?.includes(UserRole.ADMIN)) {
      return NextResponse.json({ error: 'Sin permisos de administrador' }, { status: 403 })
    }

    // Obtener parámetro de rol
    const searchParams = request.nextUrl.searchParams
    const role = searchParams.get('role')

    // Reutilizar Server Action existente
    const result = await getAllUsers()
    
    // Verificar si hubo error
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // Filtrar por rol si se especificó
    let users = result
    if (role) {
      users = users.filter(user => user.roles.includes(role as UserRole))
    }

    // Formatear nombres completos y ordenar
    const formattedUsers = users
      .map(user => ({
        id: user.id,
        name: `${user.name || ''} ${user.lastName || ''}`.trim(),
        email: user.email,
        roles: user.roles,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({
      success: true,
      users: formattedUsers,
    })
  } catch (error) {
    console.error('Error obteniendo usuarios:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
