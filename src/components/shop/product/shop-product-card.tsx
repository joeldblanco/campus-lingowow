'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useShopStore } from '@/stores/useShopStore'
import { SUPPORTED_LANGUAGES } from '@/lib/constants/languages'
import { Course, Merge, Product } from '@/types/shop'
import {
  hasRecommendedPlan,
  isAnnualPlan,
  hasBillingToggle,
  filterByBillingView,
  annualSavingsPercent,
  type BillingView,
} from '@/lib/pricing-helpers'
import { Check, ChevronRight, ShieldCheck, ShoppingCart } from 'lucide-react'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { isAfter, isBefore } from 'date-fns'

interface ShopProductCardProps {
  product: Merge<Product, Course>
}

export function ShopProductCard({ product }: ShopProductCardProps) {
  const router = useRouter()
  const { buyNow } = useShopStore()
  const hasPlans = product.plans && product.plans.length > 0
  const minPrice = hasPlans ? Math.min(...product.plans.map((p) => p.price)) : (product.price ?? 0)
  const productUrl = hasPlans ? `/pricing/?productId=${product.id}` : `/checkout/${product.id}`
  const isSubscription = product.paymentType === 'RECURRING'

  // --- Picker de planes inline (clases por semana + idioma) ---
  const [expanded, setExpanded] = useState(false)
  const plans = product.plans ?? []
  // Idiomas con pricing activo a lo largo de los planes del producto
  const languageCodes = Array.from(
    new Set(plans.flatMap((p) => (p.pricing ?? []).filter((pr) => pr.isActive).map((pr) => pr.language)))
  )
  const hasLangPricing = languageCodes.length > 0
  const [selectedLang, setSelectedLang] = useState(languageCodes[0] ?? 'en')
  const [billingView, setBillingView] = useState<BillingView>('monthly')

  const priceForLanguage = (plan: (typeof plans)[number], lang: string) => {
    const match = plan.pricing?.find((pr) => pr.language === lang && pr.isActive)
    return Number(match?.price ?? plan.price)
  }

  // Planes del idioma elegido (aún sin filtrar por ciclo de facturación).
  const langPlans = hasLangPricing
    ? plans.filter((p) => p.pricing?.some((pr) => pr.language === selectedLang && pr.isActive))
    : plans

  // El toggle Mensual/Anual solo aparece si existen AMBOS ciclos reales.
  const showBillingToggle = hasBillingToggle(langPlans)
  const annualSavings = annualSavingsPercent(langPlans, (p) => priceForLanguage(p, selectedLang))

  const visiblePlans = (showBillingToggle ? filterByBillingView(langPlans, billingView) : langPlans)
    .slice()
    .sort((a, b) => (a.classesPerWeek ?? 99) - (b.classesPerWeek ?? 99))

  // Selección de un plan inline: compra directa al checkout con el idioma elegido.
  const handlePickPlan = (e: React.MouseEvent, plan: (typeof plans)[number]) => {
    e.preventDefault()
    e.stopPropagation()
    buyNow({
      product: {
        id: product.id,
        title: product.name,
        description: product.description,
        image: product.image,
      },
      plan: {
        id: plan.id,
        name: plan.name,
        price: priceForLanguage(plan, selectedLang),
      },
      quantity: 1,
      language: hasLangPricing ? selectedLang : undefined,
    })
    router.push('/shop/cart/checkout')
  }

  // Compra directa para productos sin planes: arma un plan por defecto y va al checkout.
  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    buyNow({
      product: {
        id: product.id,
        title: product.name,
        description: product.description,
        image: product.image,
      },
      plan: {
        id: `${product.id}-default`,
        name: product.name,
        price: product.price ?? 0,
      },
      quantity: 1,
    })
    router.push('/shop/cart/checkout')
  }

  // Determine availability status
  const now = new Date()
  const publishedAt = product.publishedAt ? new Date(product.publishedAt) : null
  const expiresAt = product.expiresAt ? new Date(product.expiresAt) : null

  const isScheduled = publishedAt && isAfter(publishedAt, now)
  const isExpired = expiresAt && isBefore(expiresAt, now)
  const isAvailable = !isScheduled && !isExpired

  // Recommended badge is driven by an explicit flag (a plan marked popular),
  // not by payment type — avoids the confusing "Popular" vs "Mejor Precio" mix.
  const isRecommended = hasRecommendedPlan(plans)

  // Get features from product tags or plans
  const features = product.tags?.slice(0, 3) || []

  return (
    <Card
      className={cn(
        'group relative flex flex-col overflow-hidden transition-all duration-300 rounded-2xl',
        'border border-gray-100 hover:border-gray-200',
        'hover:shadow-lg bg-white'
      )}
    >
      {/* Image Section */}
      <div className="relative overflow-hidden bg-gray-100 aspect-[4/3] rounded-t-2xl">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-100">
            <span className="text-4xl">📚</span>
          </div>
        )}

        {/* Recommended badge — only when a plan is explicitly flagged popular */}
        {isRecommended && (
          <Badge className="absolute top-3 right-3 bg-primary text-white border-none px-3 py-1 text-xs font-medium rounded-full">
            Más popular
          </Badge>
        )}
      </div>

      {/* Content Section */}
      <div className="flex flex-col flex-1 p-5">
        {/* Title */}
        <Link
          href={productUrl}
          className="block font-bold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2 text-lg mb-1"
        >
          {product.name}
        </Link>

        {/* Description */}
        <p className="text-gray-500 text-sm line-clamp-2 mb-4">
          {product.shortDesc || product.description}
        </p>

        {/* Price + risk reduction near the price */}
        <div className="flex flex-col">
          {isSubscription && <span className="text-gray-500 text-sm">Desde</span>}
          <div>
            <span className="text-2xl font-bold text-gray-900">${minPrice.toFixed(2)}</span>
            {isSubscription && <span className="text-gray-500 text-sm">/mes</span>}
          </div>
          <span className="mt-2 mb-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            Garantía 30 días
          </span>
        </div>

        {/* Features List */}
        {features.length > 0 && (
          <ul className="space-y-2 mb-4 flex-1">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="line-clamp-1">{feature}</span>
              </li>
            ))}
          </ul>
        )}

        {/* CTA Button */}
        {hasPlans ? (
          !isAvailable ? (
            <Button variant="outline" disabled className="w-full mt-auto opacity-50">
              {isScheduled ? 'Próximamente' : 'No disponible'}
            </Button>
          ) : !expanded ? (
            <Button
              variant={isSubscription ? 'default' : 'outline'}
              className={cn(
                'w-full mt-auto',
                isSubscription
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              )}
              onClick={(e) => {
                e.preventDefault()
                setExpanded(true)
              }}
            >
              Ver Planes
            </Button>
          ) : (
            <div className="mt-auto space-y-3">
              {/* Toggle de idioma (solo si hay pricing por idioma) */}
              {languageCodes.length > 1 && (
                <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
                  {languageCodes.map((code) => {
                    const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code)
                    const active = selectedLang === code
                    return (
                      <button
                        key={code}
                        onClick={(e) => {
                          e.preventDefault()
                          setSelectedLang(code)
                        }}
                        className={cn(
                          'flex-1 rounded-md px-2 py-1 text-sm font-medium transition-colors',
                          active
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        )}
                      >
                        {lang?.flag} {lang?.name ?? code}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Toggle Mensual / Anual (solo si existen ambos ciclos reales) */}
              {showBillingToggle && (
                <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
                  {(['monthly', 'annual'] as BillingView[]).map((view) => {
                    const active = billingView === view
                    return (
                      <button
                        key={view}
                        onClick={(e) => {
                          e.preventDefault()
                          setBillingView(view)
                        }}
                        className={cn(
                          'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium transition-colors',
                          active
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        )}
                      >
                        {view === 'monthly' ? 'Mensual' : 'Anual'}
                        {view === 'annual' && annualSavings && (
                          <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                            -{annualSavings}%
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              <p className="text-sm font-semibold text-gray-900">¿Cuántas clases por semana?</p>

              <div className="space-y-2">
                {visiblePlans.map((plan) => {
                  const annual = isAnnualPlan(plan)
                  const raw = priceForLanguage(plan, selectedLang)
                  const perMonth = annual ? raw / 12 : raw
                  return (
                    <button
                      key={plan.id}
                      onClick={(e) => handlePickPlan(e, plan)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 text-left transition-colors hover:border-blue-500 hover:bg-blue-50"
                    >
                      <span className="text-sm font-medium text-gray-900">
                        {plan.classesPerWeek ? (
                          <>
                            {plan.classesPerWeek} clases
                            <span className="text-gray-500"> / semana</span>
                          </>
                        ) : (
                          plan.name
                        )}
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-sm font-bold text-gray-900">
                          ${perMonth.toFixed(2)}
                          <span className="text-xs font-normal text-gray-500">/mes</span>
                        </span>
                        {annual && (
                          <span className="block text-[10px] leading-tight text-gray-500">
                            cobrado anualmente · ${raw.toFixed(2)}/año
                          </span>
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>

              <Link
                href={productUrl}
                className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Ver planes en detalle
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          )
        ) : (
          <Button
            variant={isSubscription ? 'default' : 'outline'}
            className={cn(
              'w-full mt-auto',
              isSubscription
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50',
              !isAvailable && 'opacity-50 pointer-events-none'
            )}
            disabled={!isAvailable}
            onClick={handleBuyNow}
          >
            {isScheduled ? (
              'Próximamente'
            ) : isExpired ? (
              'No disponible'
            ) : (
              <>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Comprar ahora
              </>
            )}
          </Button>
        )}
      </div>
    </Card>
  )
}
