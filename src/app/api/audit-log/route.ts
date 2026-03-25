import { auth } from '@/auth'
import { createAuditLog } from '@/lib/audit-log'
import { AuditAction, AuditCategory } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

const VALID_ACTIONS: AuditAction[] = [
  'CLASSROOM_LEAVE',
  'PAGE_LEAVE',
  'PAGE_ENTER',
]

const VALID_CATEGORIES: AuditCategory[] = ['CLASSROOM', 'SESSION']

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { action, category, description, metadata } = body

    if (!action || !category || !description) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    // Solo permitir acciones de tracking del lado del cliente
    if (!VALID_ACTIONS.includes(action) || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'Acción no permitida' }, { status: 403 })
    }

    // Limitar tamaño de metadata para evitar abuso
    const sanitizedMetadata = typeof metadata === 'object' && metadata !== null
      ? JSON.stringify(metadata).length <= 5000 ? metadata : {}
      : {}

    await createAuditLog({
      userId: session.user.id,
      action,
      category,
      description: String(description).slice(0, 500),
      metadata: {
        ...sanitizedMetadata,
        email: session.user.email,
        roles: session.user.roles,
      },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
