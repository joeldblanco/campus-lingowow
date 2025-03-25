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
import { newPassword } from '@/lib/actions/auth'
import { NewPasswordSchema } from '@/schemas/auth'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'

export function NewPasswordForm() {
  const [isPending, startTransition] = useTransition()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const router = useRouter()

  const newPasswordForm = useForm<z.infer<typeof NewPasswordSchema>>({
    resolver: zodResolver(NewPasswordSchema),
    defaultValues: {
      password: '',
    },
  })

  const onSubmit = async (data: z.infer<typeof NewPasswordSchema>) => {
    startTransition(() => {
      newPassword(data, token)
        .then((data) => {
          if ('error' in data) {
            toast.error((data.error as string) || 'Ocurrió un error al enviar el correo')
          } else {
            toast.success('Contraseña actualizada correctamente')

            router.push('/signin')
          }
        })
        .catch((error) => {
          toast.error(error.message)
        })
    })
  }

  return (
    <AuthCard>
      <Form {...newPasswordForm}>
        <form onSubmit={newPasswordForm.handleSubmit(onSubmit)} className="p-6 md:p-8">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col items-center text-center">
              <h1 className="text-2xl font-bold">Bienvenido</h1>
              <p className="text-balance text-muted-foreground">Inicia sesión en Lingowow</p>
            </div>
            <div className="grid gap-2">
              <FormField
                control={newPasswordForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        disabled={isPending}
                        placeholder="********"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" className="w-full">
              {isPending ? <Loader2 className="animate-spin" /> : 'Reestablecer contraseña'}
            </Button>
            <div className="text-center text-sm">
              ¿Ya tienes una cuenta?{' '}
              <Link href={'/signin'} className="underline underline-offset-4">
                Inicia sesión
              </Link>
            </div>
          </div>
        </form>
      </Form>
      <div className="relative hidden bg-muted md:block">
        <Image
          src="/media/images/auth_banner.jpeg"
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
          width={1280}
          height={720}
        />
      </div>
    </AuthCard>
  )
}
