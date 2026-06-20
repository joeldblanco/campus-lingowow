/* Hallmark · component: payment-assurance · genre: modern-minimal · theme: project tokens (primary #137fec)
 * states: static presentational (links carry hover/focus-visible)
 * Trust + recurring-transparency + 3DS-expectation copy for the checkout payment area.
 * Honest copy only: the 30-day guarantee is the real policy (Términos §4.3); brand marks are the
 * actual networks in the flow (Niubiz gateway · Visa/Mastercard cards). No invented endorsements.
 * contrast: pass
 */
'use client'

import Link from 'next/link'
import { ShieldCheck, Landmark, RefreshCw } from 'lucide-react'
import { GoogleRatingBadge } from '@/components/public-components/social-proof'
import { cn } from '@/lib/utils'

/* Official brand colours — trademarks, intentionally raw (not theme tokens). */
const NIUBIZ_BLUE = '#2F45B6' // matches the Niubiz checkout button colour
const VISA_BLUE = '#1A1F71'
const MC_RED = '#EB001B'
const MC_AMBER = '#F79E1B'
const MC_OVERLAP = '#FF5F00'

/** Where students cancel a recurring plan. No self-serve toggle exists yet — it's support-mediated. */
const CANCEL_HREF = '/contact'
/** Verifiable source for the satisfaction guarantee (Términos §4.3 Reembolsos). */
const GUARANTEE_HREF = '/terms'

function BrandChip({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <span
      role="img"
      aria-label={label}
      className="inline-flex h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-2.5"
    >
      {children}
    </span>
  )
}

function NiubizMark() {
  return (
    <BrandChip label="Niubiz">
      <span
        className="font-lexend text-sm font-bold leading-none tracking-tight"
        style={{ color: NIUBIZ_BLUE }}
      >
        Niubiz
      </span>
    </BrandChip>
  )
}

function VisaMark() {
  return (
    <BrandChip label="Visa">
      <span
        className="text-sm font-bold leading-none tracking-wide"
        style={{ color: VISA_BLUE }}
      >
        VISA
      </span>
    </BrandChip>
  )
}

function MastercardMark() {
  // Official interlocking-circles mark: red + amber circles, overlap lens in #FF5F00.
  return (
    <BrandChip label="Mastercard">
      <svg viewBox="0 0 38 24" className="h-5 w-auto" aria-hidden="true">
        <circle cx="15" cy="12" r="11" fill={MC_RED} />
        <circle cx="23" cy="12" r="11" fill={MC_AMBER} />
        <path
          fill={MC_OVERLAP}
          d="M19 3.6a11 11 0 0 1 0 16.8 11 11 0 0 1 0-16.8Z"
        />
      </svg>
    </BrandChip>
  )
}

/**
 * Recurring-billing transparency. Shown BEFORE the pay button when the cart holds a
 * recurrent plan, so the recurring charge is never a surprise after checkout.
 */
export function RecurringBillingNotice({
  amount,
  cycleLabel,
  className,
}: {
  amount: number
  cycleLabel: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-left',
        className
      )}
    >
      <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <p className="min-w-0 text-sm leading-relaxed text-slate-700">
        Se te cobrará{' '}
        <span className="font-semibold text-slate-900">
          ${amount.toFixed(2)} {cycleLabel}
        </span>{' '}
        hasta que canceles.{' '}
        <Link
          href={CANCEL_HREF}
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          Cancela cuando quieras escribiéndonos
        </Link>
        .
      </p>
    </div>
  )
}

/**
 * 3DS expectation copy. One line right before paying — Niubiz redirects to the bank for
 * 3-D Secure, and users bail thinking the flow broke. Set the expectation up front.
 */
export function SecureRedirectNote({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        'flex items-start justify-center gap-2 text-center text-sm leading-relaxed text-slate-500',
        className
      )}
    >
      <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
      <span className="min-w-0">
        Te llevaremos a tu banco para confirmar el pago de forma segura; volverás aquí
        automáticamente.
      </span>
    </p>
  )
}

/**
 * Trust block stacked adjacent to the pay button: real payment-network marks, the Niubiz/SSL
 * protection line, the real 30-day guarantee (links to Términos), and the verifiable Google rating.
 */
export function PaymentTrustBlock({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col items-center gap-4 text-center', className)}>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <NiubizMark />
        <VisaMark />
        <MastercardMark />
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
          Pago protegido por Niubiz · encriptación SSL
        </p>
        <p className="text-sm text-slate-500">
          <Link
            href={GUARANTEE_HREF}
            className="font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
          >
            Garantía de satisfacción de 30 días
          </Link>{' '}
          · Cancela cuando quieras
        </p>
      </div>

      <GoogleRatingBadge />
    </div>
  )
}
