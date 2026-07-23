import { NextRequest, NextResponse } from 'next/server'
import { sendTrialClassRequestEmail } from '@/lib/mail'
import { sendSlackNotification } from '@/lib/slack'
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limit'
import { checkForSpam } from '@/lib/utils/spam-protection'
import { verifyRecaptcha } from '@/lib/utils/recaptcha'
import * as z from 'zod'

const TrialClassSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Por favor ingresa un email válido'),
  countryCode: z.string().min(1, 'El código de país es requerido'),
  phone: z.string().min(1, 'El teléfono es requerido'),
  language: z.string().min(1, 'Por favor selecciona un idioma'),
  website: z.string().optional().nullable(),
  recaptchaToken: z.string().optional().nullable(),
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

    // 1. Verificación reCAPTCHA v3 si se proporciona el token
    if (validatedData.recaptchaToken) {
      const recaptchaResult = await verifyRecaptcha(validatedData.recaptchaToken, 'trial_class')
      if (!recaptchaResult.success) {
        console.log(`[RECAPTCHA BLOCKED] Reason: ${recaptchaResult.error}, Email: ${validatedData.email}`)
        return NextResponse.json({ 
          success: true, 
          message: 'Solicitud enviada exitosamente' 
        }, { headers: getRateLimitHeaders(rateLimitResult) })
      }
    }

    // 2. Verificación anti-spam (honeypot, nombre sospechoso, email desechable)
    const spamCheck = checkForSpam({
      name: validatedData.name,
      email: validatedData.email,
      honeypot: validatedData.website,
    })

    if (spamCheck.isSpam) {
      console.log(`[SPAM BLOCKED] Reason: ${spamCheck.reason}, Email: ${validatedData.email}`)
      return NextResponse.json({ 
        success: true, 
        message: 'Solicitud enviada exitosamente' 
      }, { headers: getRateLimitHeaders(rateLimitResult) })
    }
    
    const emailData = {
      name: validatedData.name,
      email: validatedData.email,
      countryCode: validatedData.countryCode,
      phone: `${validatedData.countryCode} ${validatedData.phone}`,
      language: validatedData.language,
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

