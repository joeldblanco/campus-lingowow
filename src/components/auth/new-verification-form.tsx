'use client'

import AuthCard from '@/components/auth/auth-card'
import { Button } from '@/components/ui/button'
import { newVerification } from '@/lib/actions/auth'
import { Loader2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

export function NewVerificationForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const token = searchParams.get('token')

  const onSubmit = useCallback(() => {
    if (!token) {
      toast.error('Token no encontrado')
      return
    }

    newVerification(token)
      .then((data) => {
        if ('error' in data) {
          toast.error(data.error as string)
          setError(data.error as string)
          return
        }

        router.push(data.redirect)

        toast.success('Correo verificado exitosamente')
      })
      .catch((error) => {
        toast.error(error.message)
      })
  }, [router, token])

  useEffect(() => {
    onSubmit()
  }, [onSubmit])

  return (
    <AuthCard>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-2xl font-bold">Verificando...</h1>
          <p className="text-balance text-muted-foreground">Por favor, espera un momento</p>
          <div className="flex flex-col gap-4 w-full h-80 items-center justify-center">
            {(error && (
              <>
                <p className="text-sm text-gray-500 italic">{error}</p>
                <Link href={'/auth/login'}>
                  <Button>Volver</Button>
                </Link>
              </>
            )) || <Loader2 className="w-full h-1/6 animate-spin" />}
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted md:block">
        <Image
          src="/placeholder.svg"
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
          width={1280}
          height={720}
        />
      </div>
    </AuthCard>
  )
}
