'use client'

import AuthCard from '@/components/auth/auth-card'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { reset } from '@/lib/actions/auth'
import { ResetSchema } from '@/schemas/auth'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'

export function ResetForm() {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const resetForm = useForm<z.infer<typeof ResetSchema>>({
    resolver: zodResolver(ResetSchema),
    defaultValues: {
      email: '',
    },
  })

  const onSubmit = async (data: z.infer<typeof ResetSchema>) => {
    startTransition(() => {
      reset(data).then((data) => {
        if ('error' in data) {
          toast.error((data.error as string) || 'Ocurrió un error al enviar el correo')
        } else {
          toast.success('Correo de recuperación enviado')
          // Redirigir a signin después de enviar el correo de recuperación
          setTimeout(() => {
            router.push('/auth/signin')
          }, 2000)
        }
      })
    })
  }

  return (
    <AuthCard>
      <div className="relative hidden bg-muted md:block">
        <Image
          src="/media/images/auth_banner.jpeg"
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
          width={1280}
          height={720}
        />
      </div>
      <div className="p-6 md:p-8 flex flex-col justify-center">
        <Form {...resetForm}>
          <form onSubmit={resetForm.handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold">Recupera tu contraseña</h1>
                <p className="text-balance text-muted-foreground">Escribe tu correo electrónico</p>
              </div>
              <div className="grid gap-2">
                <FormField
                  control={resetForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo electrónico</FormLabel>
                      <FormControl>
                        <Input disabled={isPending} placeholder="usuario@ejemplo.com" data-testid="email-input" {...field} />
                      </FormControl>
                      <FormMessage data-testid="email-error" />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" className="w-full" data-testid="reset-button">
                {isPending ? <Loader2 className="animate-spin" /> : 'Enviar correo de recuperación'}
              </Button>
              <div className="text-center text-sm">
                ¿Recordaste tu contraseña?{' '}
                <Link href="/signin" className="underline underline-offset-4">
                  Inicia sesión
                </Link>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </AuthCard>
  )
}
