import { NextRequest, NextResponse } from 'next/server'
import { sendTrialClassRequestEmail } from '@/lib/mail'
import { sendSlackNotification } from '@/lib/slack'
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limit'
import * as z from 'zod'

const TrialClassSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Por favor ingresa un email válido'),
  countryCode: z.string().min(1, 'El código de país es requerido'),
  phone: z.string().min(1, 'El teléfono es requerido'),
  language: z.string().min(1, 'Por favor selecciona un idioma'),
})

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anonymous'
    const rateLimitResult = rateLimit(`trial-class:${ip}`, { windowMs: 60000, maxRequests: 3 })
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Por favor espera un momento.' },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      )
    }

    const body = await req.json()
    
    const validatedData = TrialClassSchema.parse(body)
    
    const emailData = {
      ...validatedData,
      phone: `${validatedData.countryCode} ${validatedData.phone}`,
    }
    
    await sendTrialClassRequestEmail(emailData)
    
    await sendSlackNotification({
      type: 'trial_class',
      name: validatedData.name,
      email: validatedData.email,
      phone: emailData.phone,
      language: validatedData.language,
    })
    
    return NextResponse.json({ 
      success: true, 
      message: 'Solicitud enviada exitosamente' 
    }, { headers: getRateLimitHeaders(rateLimitResult) })
  } catch (error) {
    console.error('Error sending trial class request:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Error al enviar la solicitud' },
      { status: 500 }
    )
  }
}
