'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useShopStore } from '@/stores/useShopStore'
import { SUPPORTED_LANGUAGES } from '@/lib/constants/languages'
import { Course, Merge, Product } from '@/types/shop'
import { Check, ChevronRight, ShoppingCart } from 'lucide-react'
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

  const priceForLanguage = (plan: (typeof plans)[number], lang: string) => {
    const match = plan.pricing?.find((pr) => pr.language === lang && pr.isActive)
    return Number(match?.price ?? plan.price)
  }

  const visiblePlans = (
    hasLangPricing
      ? plans.filter((p) => p.pricing?.some((pr) => pr.language === selectedLang && pr.isActive))
      : plans
  )
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

  // Get badge info based on product properties
  const getBadgeInfo = () => {
    if (isSubscription) return { text: 'Mejor Precio', color: 'bg-emerald-500' }
    else return { text: 'Popular', color: 'bg-orange-500' }
  }
  const badgeInfo = getBadgeInfo()

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

        {/* Status Badge */}
        {badgeInfo && (
          <Badge
            className={cn(
              'absolute top-3 right-3 text-white border-none px-3 py-1 text-xs font-medium rounded-full',
              badgeInfo.color
            )}
          >
            {badgeInfo.text}
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

        {/* Price */}
        <div className='flex flex-col'>
          {isSubscription && <span className="text-gray-500 text-sm">Desde</span>}
          <div className="mb-4">
            <span className="text-2xl font-bold text-gray-900">${minPrice.toFixed(2)}</span>
            {isSubscription && <span className="text-gray-500 text-sm">/mes</span>}
          </div>
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

              <p className="text-sm font-semibold text-gray-900">¿Cuántas clases por semana?</p>

              <div className="space-y-2">
                {visiblePlans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={(e) => handlePickPlan(e, plan)}
                    className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-left transition-colors hover:border-blue-500 hover:bg-blue-50"
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
                    <span className="text-sm font-bold text-gray-900">
                      ${priceForLanguage(plan, selectedLang).toFixed(2)}
                    </span>
                  </button>
                ))}
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
