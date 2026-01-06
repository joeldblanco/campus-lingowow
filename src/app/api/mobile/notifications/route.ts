import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser, unauthorizedResponse } from '@/lib/mobile-auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const user = await getMobileUser(req)

    if (!user) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    const whereClause: Record<string, unknown> = {
      userId: user.id,
    }

    if (unreadOnly) {
      whereClause.isRead = false
    }

    const notifications = await db.notification.findMany({
      where: whereClause,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        metadata: true,
        link: true,
        isRead: true,
        readAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const unreadCount = await db.notification.count({
      where: {
        userId: user.id,
        isRead: false,
      },
    })

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
    })
  } catch (error) {
    console.error('Error obteniendo notificaciones:', error)

    return NextResponse.json(
      { error: 'Error al obtener las notificaciones' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getMobileUser(req)

    if (!user) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(req.url)
    const notificationId = searchParams.get('id')
    const markAllRead = searchParams.get('markAllRead') === 'true'

    if (markAllRead) {
      await db.notification.updateMany({
        where: {
          userId: user.id,
          isRead: false,
        },
        data: { isRead: true, readAt: new Date() },
      })

      return NextResponse.json({
        success: true,
        message: 'Todas las notificaciones marcadas como leídas',
      })
    }

    if (notificationId) {
      await db.notification.update({
        where: { id: notificationId },
        data: { isRead: true, readAt: new Date() },
      })

      return NextResponse.json({
        success: true,
        message: 'Notificación marcada como leída',
      })
    }

    return NextResponse.json(
      { error: 'Se requiere id o markAllRead' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error actualizando notificaciones:', error)

    return NextResponse.json(
      { error: 'Error al actualizar las notificaciones' },
      { status: 500 }
    )
  }
}
