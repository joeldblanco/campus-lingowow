'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Check, AlertCircle } from 'lucide-react'

import { unsubscribeAbandonedCart } from '@/lib/actions/abandoned-cart'
import { Button } from '@/components/ui/button'

type Status = 'loading' | 'done' | 'error'

/**
 * Página de baja (opt-out) enlazada desde el pie del correo de recuperación.
 * Registra la baja por token y confirma; el cron deja de enviar a ese email.
 */
export default function UnsubscribeCartPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const ran = useRef(false)
  const [status, setStatus] = useState<Status>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    if (!token) {
      setStatus('error')
      setMessage('Este enlace no es válido. Falta el código.')
      return
    }

    unsubscribeAbandonedCart(token)
      .then((res) => {
        setStatus(res.success ? 'done' : 'error')
        setMessage(res.message)
      })
      .catch(() => {
        setStatus('error')
        setMessage('No pudimos procesar tu baja. Inténtalo de nuevo más tarde.')
      })
  }, [token])

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="max-w-md text-center">
        {status === 'loading' && (
          <div className="flex items-center justify-center gap-3 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="font-sans text-sm">Procesando tu baja…</p>
          </div>
        )}

        {status === 'done' && (
          <>
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
              <Check className="h-6 w-6" />
            </div>
            <h1 className="font-lexend text-2xl font-semibold text-slate-900">Listo</h1>
            <p className="mt-2 text-slate-600">{message}</p>
            <Button asChild variant="outline" className="mt-6">
              <Link href="/shop">Volver a la tienda</Link>
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h1 className="font-lexend text-2xl font-semibold text-slate-900">Algo salió mal</h1>
            <p className="mt-2 text-slate-600">{message}</p>
            <Button asChild className="mt-6">
              <Link href="/shop">Ir a la tienda</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
