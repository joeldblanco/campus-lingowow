'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useShopStore } from '@/stores/useShopStore'
import { SUPPORTED_LANGUAGES } from '@/lib/constants/languages'
import { Course, Merge, Product } from '@/types/shop'
import {
  ACADEMIC_WEEKS_PER_MONTH,
  clampClassesPerWeek,
  DEFAULT_BILLING_VIEW,
  hasRecommendedPlan,
  isAnnualPlan,
  hasBillingToggle,
  filterByBillingView,
  annualSavingsPercent,
  monthlyClassCount,
  MAX_CLASSES_PER_WEEK,
  MIN_CLASSES_PER_WEEK,
  type BillingView,
} from '@/lib/pricing-helpers'
import { Switch } from '@/components/ui/switch'
import { Check, ChevronRight, Minus, Plus, ShieldCheck, ShoppingCart } from 'lucide-react'
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
  const languageCodes = ['en']
  const hasLangPricing = plans.some((p) => p.pricing?.some((pr) => pr.language === 'en' && pr.isActive))
  const [selectedLang, setSelectedLang] = useState('en')
  const [billingView, setBillingView] = useState<BillingView>(DEFAULT_BILLING_VIEW)
  const [classesPerWeek, setClassesPerWeek] = useState(MIN_CLASSES_PER_WEEK)

  const priceForLanguage = (plan: (typeof plans)[number], lang: string) => {
    const match = plan.pricing?.find((pr) => pr.language === lang && pr.isActive)
    return Number(match?.price ?? plan.price)
  }

  // Planes del idioma elegido (aún sin filtrar por ciclo de facturación).
  const langPlans = hasLangPricing
    ? plans.filter((p) => p.pricing?.some((pr) => pr.language === 'en' && pr.isActive))
    : plans

  // El toggle Mensual/Anual solo aparece si existen AMBOS ciclos reales.
  const showBillingToggle = hasBillingToggle(langPlans)
  const annualSavings = annualSavingsPercent(langPlans, (p) => priceForLanguage(p, 'en'))

  const visiblePlans = (showBillingToggle ? filterByBillingView(langPlans, billingView) : langPlans)
    .slice()
    .sort((a, b) => (a.classesPerWeek ?? 99) - (b.classesPerWeek ?? 99))

  const selectedPlan = visiblePlans.find((plan) => plan.classesPerWeek === classesPerWeek)
  const monthlyClasses = monthlyClassCount(classesPerWeek)

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
        price: priceForLanguage(plan, 'en'),
      },
      quantity: 1,
      language: hasLangPricing ? 'en' : undefined,
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
          {(() => {
            const activePlan = selectedPlan || (visiblePlans.length > 0 ? visiblePlans[0] : null)
            const isAnnual = activePlan ? isAnnualPlan(activePlan) : billingView === 'annual'
            const rawPrice = activePlan ? priceForLanguage(activePlan, 'en') : minPrice
            const monthlyPrice = activePlan ? (isAnnual ? rawPrice / 12 : rawPrice) : minPrice

            return (
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-gray-900">${monthlyPrice.toFixed(2)}</span>
                  {isSubscription && <span className="text-gray-500 text-sm">/mes</span>}
                </div>
                {isAnnual && activePlan && (
                  <p className="text-xs text-gray-500 mt-0.5 font-medium">
                    facturado anualmente (${rawPrice.toFixed(2)}/año)
                  </p>
                )}
              </div>
            )
          })()}
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
                <div className="flex items-center justify-between rounded-lg bg-gray-100 px-3 py-2">
                  <span className={cn('text-sm font-medium', billingView === 'monthly' ? 'text-gray-900' : 'text-gray-500')}>
                    Mensual
                  </span>
                  <Switch
                    checked={billingView === 'annual'}
                    onCheckedChange={(checked) => setBillingView(checked ? 'annual' : 'monthly')}
                    aria-label="Cambiar entre facturación mensual y anual"
                  />
                  <span className={cn('text-sm font-medium', billingView === 'annual' ? 'text-gray-900' : 'text-gray-500')}>
                    Anual
                    {annualSavings && <span className="ml-1 text-xs font-bold text-emerald-700">-{annualSavings}%</span>}
                  </span>
                </div>
              )}

              <p className="text-sm font-semibold text-gray-900">¿Cuántas clases por semana?</p>

              <div className="rounded-lg border border-gray-200 px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    aria-label="Reducir clases por semana"
                    disabled={classesPerWeek <= MIN_CLASSES_PER_WEEK}
                    onClick={(e) => {
                      e.preventDefault()
                      setClassesPerWeek((value) => clampClassesPerWeek(value - 1))
                    }}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900">
                      {classesPerWeek} {classesPerWeek === 1 ? 'clase' : 'clases'} / semana
                    </p>
                    <p className="text-xs text-gray-500">
                      {monthlyClasses} clases en {ACADEMIC_WEEKS_PER_MONTH} semanas del período académico mensual
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Aumentar clases por semana"
                    disabled={classesPerWeek >= MAX_CLASSES_PER_WEEK}
                    onClick={(e) => {
                      e.preventDefault()
                      setClassesPerWeek((value) => clampClassesPerWeek(value + 1))
                    }}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {selectedPlan ? (
                  <Button
                    onClick={(e) => handlePickPlan(e, selectedPlan)}
                    className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  >
                    Seleccionar
                  </Button>
                ) : (
                  <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-800">
                    No hay un plan disponible para {classesPerWeek} clases por semana en esta modalidad.
                  </p>
                )}
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
