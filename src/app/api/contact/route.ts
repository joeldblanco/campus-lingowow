import { NextRequest, NextResponse } from 'next/server'
import { sendContactFormEmail } from '@/lib/mail'
import { sendSlackNotification } from '@/lib/slack'
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limit'
import { checkForSpam } from '@/lib/utils/spam-protection'
import { verifyRecaptcha } from '@/lib/utils/recaptcha'
import * as z from 'zod'

const ContactSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Por favor ingresa un email válido'),
  countryCode: z.string().min(1, 'El código de país es requerido'),
  phone: z.string().min(1, 'El teléfono es requerido'),
  subject: z.string().min(1, 'Por favor selecciona un asunto'),
  message: z.string().min(10, 'El mensaje debe tener al menos 10 caracteres'),
  website: z.string().optional().nullable(),
  recaptchaToken: z.string().optional().nullable(),
})

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anonymous'
    const rateLimitResult = rateLimit(`contact:${ip}`, { windowMs: 60000, maxRequests: 3 })
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Por favor espera un momento.' },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      )
    }

    const body = await req.json()
    
    const validatedData = ContactSchema.parse(body)

    // 1. Verificación reCAPTCHA v3 si se proporciona el token o existe la clave secreta
    if (validatedData.recaptchaToken) {
      const recaptchaResult = await verifyRecaptcha(validatedData.recaptchaToken, 'contact')
      if (!recaptchaResult.success) {
        console.log(`[RECAPTCHA BLOCKED] Reason: ${recaptchaResult.error}, Email: ${validatedData.email}`)
        return NextResponse.json({ 
          success: true, 
          message: 'Mensaje enviado exitosamente' 
        }, { headers: getRateLimitHeaders(rateLimitResult) })
      }
    }

    // 2. Verificación anti-spam (honeypot, nombre sospechoso, email desechable, texto de spam)
    const spamCheck = checkForSpam({
      name: validatedData.name,
      email: validatedData.email,
      honeypot: validatedData.website,
      message: validatedData.message,
      subject: validatedData.subject,
    })

    if (spamCheck.isSpam) {
      console.log(`[SPAM BLOCKED] Reason: ${spamCheck.reason}, Email: ${validatedData.email}`)
      // Respuesta simulada para desarmar a los bots sin revelar la detección
      return NextResponse.json({ 
        success: true, 
        message: 'Mensaje enviado exitosamente' 
      }, { headers: getRateLimitHeaders(rateLimitResult) })
    }
    
    const emailData = {
      name: validatedData.name,
      email: validatedData.email,
      countryCode: validatedData.countryCode,
      phone: `${validatedData.countryCode} ${validatedData.phone}`,
      subject: validatedData.subject,
      message: validatedData.message,
    }
    
    await sendContactFormEmail(emailData)
    
    await sendSlackNotification({
      type: 'contact_form',
      name: validatedData.name,
      email: validatedData.email,
      phone: emailData.phone,
      subject: validatedData.subject,
      message: validatedData.message,
    })
    
    return NextResponse.json({ 
      success: true, 
      message: 'Mensaje enviado exitosamente' 
    }, { headers: getRateLimitHeaders(rateLimitResult) })
  } catch (error) {
    console.error('Error sending contact form:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Error al enviar el mensaje' },
      { status: 500 }
    )
  }
}

