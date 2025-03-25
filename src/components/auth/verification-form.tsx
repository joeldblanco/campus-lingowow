import AuthCard from '@/components/auth/auth-card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { resendVerificationEmail } from '@/lib/actions/auth'
import { Loader2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

const VerificationForm = ({ email }: { email: string | null }) => {
  const [emailSent, setEmailSent] = useState<boolean>(false)
  const [isPending, startTransition] = useTransition()

  const resendVerification = () => {
    if (!email) {
      toast.error('Correo electrónico inválido')
      return
    }
    startTransition(() => {
      resendVerificationEmail(email).then((data) => {
        if ('error' in data) {
          toast.error((data.error as string) || 'Ocurrió un error al enviar el correo')
        } else {
          setEmailSent(true)
          toast.success('Correo de verificación reenviado')
        }
      })
    })
  }

  return (
    <AuthCard>
      <div className="p-6 md:p-8">
        <div className="flex flex-col space-y-10">
          <div className="flex flex-col items-center text-center">
            <h1 className="text-2xl font-bold">Verificación pendiente</h1>
            <p className="text-balance text-muted-foreground">
              Te hemos enviado un correo electrónico con las instrucciones para verificar tu cuenta
            </p>
          </div>
          <div className="w-full flex flex-col justify-center items-start space-y-4">
            {!emailSent && (
              <div className="flex flex-col space-y-2 w-full">
                <Label>¿No has recibido el correo electrónico?</Label>
                <Button
                  disabled={isPending}
                  className="w-full"
                  onClick={() => {
                    if (!email) {
                      toast.error('Correo electrónico requerido')
                      return
                    }

                    resendVerification()
                  }}
                >
                  {isPending ? <Loader2 className="animate-spin" /> : 'Reenviar correo'}
                </Button>
              </div>
            )}
            <div className="text-center text-sm w-full">
              ¿Ya tienes una cuenta?{' '}
              <Link href={'/auth/signin'} className="underline underline-offset-4">
                Inicia sesión
              </Link>
            </div>
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

export default VerificationForm
