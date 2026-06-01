'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { Loader2, ShieldCheck, ShieldOff, Copy, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  getTwoFactorStatus,
  startTwoFactorSetup,
  enableTwoFactor,
  disableTwoFactor,
} from '@/lib/actions/two-factor'

type View = 'idle' | 'setup' | 'recovery' | 'disable'

export function TwoFactorSettings() {
  const [loading, setLoading] = useState(true)
  const [enabled, setEnabled] = useState(false)
  const [remaining, setRemaining] = useState(0)
  const [view, setView] = useState<View>('idle')
  const [setup, setSetup] = useState<{ secret: string; qrCodeDataUrl: string } | null>(null)
  const [code, setCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()

  const refresh = useCallback(() => {
    getTwoFactorStatus().then((res) => {
      if (res.success && res.data) {
        setEnabled(res.data.enabled)
        setRemaining(res.data.remainingRecoveryCodes)
      }
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const beginSetup = () => {
    startTransition(async () => {
      const res = await startTwoFactorSetup()
      if (res.success && res.data) {
        setSetup({ secret: res.data.secret, qrCodeDataUrl: res.data.qrCodeDataUrl })
        setCode('')
        setView('setup')
      } else {
        toast.error(res.message)
      }
    })
  }

  const confirmEnable = () => {
    if (!setup) return
    startTransition(async () => {
      const res = await enableTwoFactor(setup.secret, code)
      if (res.success && res.data) {
        setRecoveryCodes(res.data.recoveryCodes)
        setCode('')
        setView('recovery')
        toast.success(res.message)
      } else {
        toast.error(res.message)
      }
    })
  }

  const confirmDisable = () => {
    startTransition(async () => {
      const res = await disableTwoFactor(code)
      if (res.success) {
        toast.success(res.message)
        setCode('')
        setSetup(null)
        setView('idle')
        refresh()
      } else {
        toast.error(res.message)
      }
    })
  }

  const finishRecovery = () => {
    setRecoveryCodes([])
    setSetup(null)
    setView('idle')
    refresh()
  }

  const copyRecovery = () => {
    navigator.clipboard?.writeText(recoveryCodes.join('\n'))
    toast.success('Códigos copiados al portapapeles')
  }

  return (
    <Card data-testid="twofactor-settings">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {enabled ? (
            <ShieldCheck className="h-5 w-5 text-green-600" />
          ) : (
            <ShieldOff className="h-5 w-5 text-muted-foreground" />
          )}
          Autenticación de dos factores
        </CardTitle>
        <CardDescription>
          Añade una capa extra de seguridad pidiendo un código de tu app de autenticación al iniciar
          sesión.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
          </div>
        ) : view === 'recovery' ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-amber-600">
              Guarda estos códigos de recuperación en un lugar seguro. Cada uno sirve una sola vez y
              no volverás a verlos.
            </p>
            <div
              className="grid grid-cols-2 gap-2 rounded-md border bg-muted/40 p-3 font-mono text-sm"
              data-testid="recovery-codes"
            >
              {recoveryCodes.map((rc) => (
                <span key={rc}>{rc}</span>
              ))}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={copyRecovery}>
                <Copy className="mr-2 h-4 w-4" /> Copiar
              </Button>
              <Button type="button" onClick={finishRecovery}>
                He guardado mis códigos
              </Button>
            </div>
          </div>
        ) : view === 'setup' && setup ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              1. Escanea este código QR con tu app de autenticación (Google Authenticator, 1Password,
              etc.).
            </p>
            <Image
              src={setup.qrCodeDataUrl}
              alt="Código QR de autenticación de dos factores"
              width={180}
              height={180}
              unoptimized
              className="rounded-md border"
            />
            <p className="text-xs text-muted-foreground">
              ¿No puedes escanear? Ingresa esta clave manualmente:{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono">{setup.secret}</code>
            </p>
            <p className="text-sm text-muted-foreground">
              2. Ingresa el código de 6 dígitos que muestra la app:
            </p>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              disabled={isPending}
              data-testid="enable-code-input"
              className="max-w-[160px]"
            />
            <div className="flex gap-2">
              <Button type="button" onClick={confirmEnable} disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Activar'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setView('idle')
                  setSetup(null)
                  setCode('')
                }}
                disabled={isPending}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : view === 'disable' ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Ingresa un código actual de tu app (o un código de recuperación) para desactivar la
              autenticación de dos factores.
            </p>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              disabled={isPending}
              data-testid="disable-code-input"
              className="max-w-[160px]"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="destructive"
                onClick={confirmDisable}
                disabled={isPending}
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Desactivar 2FA'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setView('idle')
                  setCode('')
                }}
                disabled={isPending}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : enabled ? (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm font-medium text-green-600">
              <ShieldCheck className="h-4 w-4" /> Activada
            </p>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <KeyRound className="h-4 w-4" /> Te quedan {remaining} códigos de recuperación.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCode('')
                setView('disable')
              }}
            >
              Desactivar
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              La autenticación de dos factores está desactivada.
            </p>
            <Button type="button" onClick={beginSetup} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Activar 2FA'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
