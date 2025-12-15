import { NextRequest, NextResponse } from 'next/server'
import { sendContactFormEmail } from '@/lib/mail'
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limit'
import * as z from 'zod'

const ContactSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Por favor ingresa un email válido'),
  countryCode: z.string().min(1, 'El código de país es requerido'),
  phone: z.string().min(1, 'El teléfono es requerido'),
  subject: z.string().min(1, 'Por favor selecciona un asunto'),
  message: z.string().min(10, 'El mensaje debe tener al menos 10 caracteres'),
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
    
    const emailData = {
      ...validatedData,
      phone: `${validatedData.countryCode} ${validatedData.phone}`,
    }
    
    await sendContactFormEmail(emailData)
    
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
