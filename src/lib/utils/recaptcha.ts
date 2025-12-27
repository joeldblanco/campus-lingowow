/**
 * Verificación de reCAPTCHA v3 en el servidor
 */

interface ReCaptchaVerifyResponse {
  success: boolean
  score?: number
  action?: string
  challenge_ts?: string
  hostname?: string
  'error-codes'?: string[]
}

export interface ReCaptchaResult {
  success: boolean
  score?: number
  error?: string
}

const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify'
const MIN_SCORE_THRESHOLD = 0.5

/**
 * Verifica un token de reCAPTCHA v3 con el servidor de Google
 * @param token - Token generado por el cliente
 * @param expectedAction - Acción esperada (ej: 'register', 'login')
 * @returns Resultado de la verificación
 */
export async function verifyRecaptcha(
  token: string,
  expectedAction?: string
): Promise<ReCaptchaResult> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY

  if (!secretKey) {
    console.warn('ReCaptcha secret key not configured - skipping verification')
    return { success: true }
  }

  if (!token) {
    return { success: false, error: 'Token de verificación no proporcionado' }
  }

  try {
    const response = await fetch(RECAPTCHA_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    })

    const data: ReCaptchaVerifyResponse = await response.json()

    if (!data.success) {
      console.error('ReCaptcha verification failed:', data['error-codes'])
      return { 
        success: false, 
        error: 'Verificación de seguridad fallida' 
      }
    }

    if (expectedAction && data.action !== expectedAction) {
      console.error(`ReCaptcha action mismatch: expected ${expectedAction}, got ${data.action}`)
      return { 
        success: false, 
        error: 'Verificación de seguridad fallida' 
      }
    }

    if (data.score !== undefined && data.score < MIN_SCORE_THRESHOLD) {
      console.warn(`ReCaptcha low score: ${data.score}`)
      return { 
        success: false, 
        score: data.score,
        error: 'Actividad sospechosa detectada' 
      }
    }

    return { 
      success: true, 
      score: data.score 
    }
  } catch (error) {
    console.error('ReCaptcha verification error:', error)
    return { 
      success: false, 
      error: 'Error al verificar seguridad' 
    }
  }
}
