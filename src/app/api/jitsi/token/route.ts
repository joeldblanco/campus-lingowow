import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { generateJitsiJWT } from '@/lib/jitsi-jwt'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { roomName, bookingId } = await request.json()

    if (!roomName) {
      return NextResponse.json({ error: 'Nombre de sala requerido' }, { status: 400 })
    }

    // Obtener información del usuario
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        roles: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Verificar permisos si hay bookingId
    if (bookingId) {
      const booking = await db.classBooking.findUnique({
        where: { id: bookingId },
        select: {
          teacherId: true,
          studentId: true,
        },
      })

      if (!booking) {
        return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })
      }

      // Verificar que el usuario sea parte de la reserva
      if (booking.teacherId !== user.id && booking.studentId !== user.id) {
        return NextResponse.json({ error: 'Sin permisos para esta sala' }, { status: 403 })
      }
    }

    // Determinar si es moderador (solo TEACHER y ADMIN son anfitriones/moderadores)
    // STUDENT y GUEST son participantes regulares sin permisos de moderador
    // DEBUG: Force TRUE to test connection
    const isModerator = true // user.roles.includes('TEACHER') || user.roles.includes('ADMIN')

    // Usar clave privada desde variable de entorno (compatible con Vercel)
    let privateKey = process.env.JAAS_PRIVATE_KEY
    const privateKeyPath = process.env.JAAS_PRIVATE_KEY_PATH

    // Try reading from file path if direct key is missing
    if (!privateKey && privateKeyPath) {
      try {
        const fs = await import('fs')
        const path = await import('path')

        // Resolve path (handle relative vs absolute)
        const resolvedPath = path.isAbsolute(privateKeyPath)
          ? privateKeyPath
          : path.join(process.cwd(), privateKeyPath)

        if (fs.existsSync(resolvedPath)) {
          privateKey = fs.readFileSync(resolvedPath, 'utf8')
        } else {
          console.warn(`JAAS_PRIVATE_KEY_PATH provided but file not found at: ${resolvedPath}`)
        }
      } catch (error) {
        console.error('Error reading JAAS private key file:', error)
      }
    }

    // Fallback for Development: If STILL no private key, signal to use public Jitsi
    if (!privateKey) {
      console.warn('JAAS_PRIVATE_KEY missing. Falling back to public Jitsi.')
      return NextResponse.json({
        token: null,
        usePublicJitsi: true,
        user: {
          id: user.id,
          name: user.name,
          isModerator,
        },
      })
    }

    // Generar JWT
    // Debug logging for troubleshooting auth failures
    if (process.env.NODE_ENV === 'development') {
      const kid = process.env.JAAS_KID || ''
      console.log('[JaaS Debug] Generating token...')
      console.log('[JaaS Debug] AppID:', process.env.JAAS_APP_ID)
      console.log('[JaaS Debug] KID Prefix:', kid.substring(0, 25) + '...')
      console.log('[JaaS Debug] Key Length:', privateKey?.length)
    }

    const token = generateJitsiJWT(
      {
        id: user.id,
        name: user.name || 'Usuario',
        email: user.email || '',
        avatar: user.image || undefined,
        isModerator,
      },
      roomName,
      privateKey
    )

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        isModerator,
      },
    })
  } catch (error) {
    console.error('Error generando token JWT:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
