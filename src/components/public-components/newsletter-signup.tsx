'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { ArrowRight, CheckCircle2, Mail } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { captureLead } from '@/lib/actions/newsletter'
import { NewsletterSchema } from '@/schemas/public'

type NewsletterFormData = z.infer<typeof NewsletterSchema>

interface NewsletterSignupProps {
  /** Origen del lead, p.ej. 'footer' o 'resources-podcasts'. Se guarda con la suscripción. */
  source: string
  variant?: 'footer' | 'panel'
  title?: string
  description?: string
  placeholder?: string
  buttonLabel?: string
  /** Texto del enlace secundario a /demo. Pasa null para ocultarlo. */
  demoCtaLabel?: string | null
  className?: string
}

export default function NewsletterSignup({
  source,
  variant = 'footer',
  title,
  description,
  placeholder = 'tu@correo.com',
  buttonLabel = 'Suscribirme',
  demoCtaLabel = 'Reserva una clase gratis',
  className,
}: NewsletterSignupProps) {
  const [submitted, setSubmitted] = useState(false)
  const form = useForm<NewsletterFormData>({
    resolver: zodResolver(NewsletterSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (values: NewsletterFormData) => {
    try {
      const result = await captureLead({ email: values.email, source })
      if (result.success) {
        setSubmitted(true)
        toast.success(result.message)
        form.reset()
      } else {
        toast.error(result.message)
      }
    } catch {
      toast.error('No pudimos guardar tu correo. Inténtalo de nuevo.')
    }
  }

  const isPanel = variant === 'panel'
  const emailError = form.formState.errors.email?.message

  const demoLink = demoCtaLabel ? (
    <Link
      href="/demo"
      className="group mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
    >
      {demoCtaLabel}
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </Link>
  ) : null

  if (submitted) {
    return (
      <div
        className={cn(
          isPanel
            ? 'rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-8 text-center'
            : '',
          className,
        )}
      >
        <p className="flex items-center gap-2 font-medium text-foreground">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" aria-hidden />
          ¡Gracias! Te avisaremos por correo.
        </p>
        {demoLink}
      </div>
    )
  }

  return (
    <div
      className={cn(
        isPanel
          ? 'rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-8'
          : '',
        className,
      )}
    >
      {isPanel && (
        <div className="mb-2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-5 w-5 text-primary" aria-hidden />
        </div>
      )}
      {title && (
        <h3
          className={cn(
            'font-semibold',
            isPanel ? 'text-xl md:text-2xl' : 'mb-1',
          )}
        >
          {title}
        </h3>
      )}
      {description && (
        <p
          className={cn(
            'text-muted-foreground',
            isPanel ? 'mt-2 max-w-xl' : 'mb-3 text-sm',
          )}
        >
          {description}
        </p>
      )}

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('flex flex-col gap-2 sm:flex-row', isPanel && 'mt-4 max-w-md')}
        noValidate
      >
        <div className="flex-1">
          <label htmlFor={`newsletter-email-${source}`} className="sr-only">
            Correo electrónico
          </label>
          <Input
            id={`newsletter-email-${source}`}
            type="email"
            autoComplete="email"
            placeholder={placeholder}
            aria-invalid={!!emailError}
            {...form.register('email')}
          />
          {emailError && (
            <p className="mt-1 text-xs text-destructive">{emailError}</p>
          )}
        </div>
        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="shrink-0"
        >
          {form.formState.isSubmitting ? 'Enviando…' : buttonLabel}
        </Button>
      </form>

      {demoLink}
    </div>
  )
}
