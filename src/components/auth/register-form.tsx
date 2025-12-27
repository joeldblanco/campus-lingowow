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
import { register } from '@/lib/actions/auth'
import { SignUpSchema } from '@/schemas/auth'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, ChevronLeft } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'

export function RegisterForm() {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const registerForm = useForm<z.infer<typeof SignUpSchema>>({
    resolver: zodResolver(SignUpSchema),
    defaultValues: {
      name: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      website: '', // Honeypot field
    },
  })

  const onSubmit = async (data: z.infer<typeof SignUpSchema>) => {
    startTransition(() => {
      register(data)
        .then((data) => {
          if ('error' in data) {
            toast.error(data.error as string)
            return
          }

          toast.success('Registro exitoso')

          router.push(data.redirect)
        })
        .catch((error) => {
          toast.error(error.message)
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
          priority
        />
      </div>
      <Form {...registerForm}>
        <form onSubmit={registerForm.handleSubmit(onSubmit)} className="p-6 md:p-8 relative">
          <div className="absolute top-6 left-6">
            <Link href={'/'} className="inline-flex items-center justify-center gap-1 text-sm text-muted-foreground hover:gap-2 transition-all">
              <ChevronLeft className="h-4 w-4" />
              Volver
            </Link>
          </div>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col items-center text-center">
              <h1 className="text-2xl font-bold">Bienvenido</h1>
              <p className="text-balance text-muted-foreground">Regístrate en Lingowow</p>
            </div>

            <FormField
              control={registerForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input disabled={isPending} placeholder="John" data-testid="name-input" {...field} />
                  </FormControl>
                  <FormMessage data-testid="name-error" />
                </FormItem>
              )}
            />

            <FormField
              control={registerForm.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apellido</FormLabel>
                  <FormControl>
                    <Input disabled={isPending} placeholder="Doe" data-testid="last-name-input" {...field} />
                  </FormControl>
                  <FormMessage data-testid="last-name-error" />
                </FormItem>
              )}
            />

            <FormField
              control={registerForm.control}
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

            <FormField
              control={registerForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="new-password"
                      disabled={isPending}
                      placeholder="************"
                      type="password"
                      data-testid="password-input"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage data-testid="password-error" />
                </FormItem>
              )}
            />

            <FormField
              control={registerForm.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Repetir contraseña</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="new-password"
                      disabled={isPending}
                      placeholder="************"
                      type="password"
                      data-testid="confirm-password-input"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage data-testid="confirm-password-error" />
                </FormItem>
              )}
            />

            {/* Campo honeypot - invisible para usuarios, los bots lo llenan */}
            <FormField
              control={registerForm.control}
              name="website"
              render={({ field }) => (
                <FormItem className="absolute -left-[9999px] opacity-0 pointer-events-none" aria-hidden="true">
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" data-testid="register-button">
              {isPending ? <Loader2 className="animate-spin" /> : 'Registrarse'}
            </Button>
            <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
              <span className="relative z-10 bg-background px-2 text-muted-foreground">
                O continúa con
              </span>
            </div>
            <SocialsComponent startTransition={startTransition} isPending={isPending} />
            <div className="text-center text-sm">
              ¿Ya tienes una cuenta?{' '}
              <Link href={'/auth/signin'} className="underline underline-offset-4">
                Inicia sesión
              </Link>
            </div>
          </div>
        </form>
      </Form>
    </AuthCard>
  )
}
