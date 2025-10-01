'use client'

import AuthCard from '@/components/auth/auth-card'
import SocialsComponent from '@/components/auth/socials-component'
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
import { login } from '@/lib/actions/auth'
import { SignInSchema } from '@/schemas/auth'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'

export function LoginForm() {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl')
  
  const loginForm = useForm<z.infer<typeof SignInSchema>>({
    resolver: zodResolver(SignInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: z.infer<typeof SignInSchema>) => {
    startTransition(() => {
      login(data, callbackUrl)
        .then((data) => {
          if (data && 'error' in data) {
            toast.error(data.error as string)
            return
          }

          if (!data || !data.redirect) {
            toast.warning('Intenta iniciar sesión de nuevo')
            return
          }

          toast.success('Sesión iniciada correctamente')

          router.push(data.redirect)
        })
        .catch((error) => {
          toast.error(error.message)
        })
    })
  }

  return (
    <AuthCard>
      <Form {...loginForm}>
        <form onSubmit={loginForm.handleSubmit(onSubmit)} className="p-6 md:p-8">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col items-center text-center">
              <h1 className="text-2xl font-bold">Bienvenido</h1>
              <p className="text-balance text-muted-foreground">Inicia sesión en Lingowow</p>
            </div>
            <div className="grid gap-2">
              <FormField
                control={loginForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo electrónico</FormLabel>
                    <FormControl>
                      <Input
                        disabled={isPending}
                        autoComplete="email"
                        placeholder="usuario@ejemplo.com"
                        data-testid="email-input"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage data-testid="email-error" />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-2">
              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Contraseña
                      <Link
                        href="/auth/reset"
                        className="ml-auto text-sm underline-offset-2 hover:underline font-normal"
                      >
                        ¿Olvidaste tu contraseña?
                      </Link>
                    </FormLabel>
                    <FormControl>
                      <Input
                        disabled={isPending}
                        autoComplete="current-password"
                        type="password"
                        placeholder="********"
                        data-testid="password-input"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage data-testid="password-error" />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" className="w-full" data-testid="login-button">
              {isPending ? <Loader2 className="animate-spin" /> : 'Iniciar sesión'}
            </Button>
            <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
              <span className="relative z-10 bg-background px-2 text-muted-foreground">
                O continúa con
              </span>
            </div>
            <SocialsComponent startTransition={startTransition} isPending={isPending} />
            <div className="text-center text-sm">
              ¿No tienes una cuenta?{' '}
              <Link href={'/auth/signup'} className="underline underline-offset-4">
                Regístrate
              </Link>
            </div>
          </div>
        </form>
      </Form>
      <div className="relative hidden bg-muted md:block ">
        <Image
          src="/media/images/auth_banner.jpeg"
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
          width={1280}
          height={720}
          priority
        />
      </div>
    </AuthCard>
  )
}
