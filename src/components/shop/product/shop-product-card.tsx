'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useShopStore } from '@/stores/useShopStore'
import { Course, Merge, Product } from '@/types/shop'
import { CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { PlansModal } from '../plans/plans-modal'

interface ShopProductCardProps {
  product: Merge<Product, Course>
  variant?: 'default' | 'featured' | 'subscription'
}

export function ShopProductCard({ product, variant = 'default' }: ShopProductCardProps) {
  const router = useRouter()
  const [showPlansModal, setShowPlansModal] = useState(false)
  const { addToCart, cart } = useShopStore()

  const hasPlans = product.plans && product.plans.length > 1
  const singlePlan = product.plans?.[0]
  const lowestPrice = product.plans?.length
    ? Math.min(...product.plans.map((p) => p.price))
    : product.price
  const isSubscription = product.plans?.some((p) => p.billingCycle)
  const popularPlan = product.plans?.find((p) => p.isPopular)

  const isInCart = cart.some((item) => item.product.id === product.id)

  const handleAddToCart = () => {
    if (isSubscription) {
      router.push(`/pricing?productId=${product.id}`)
      return
    }

    if (hasPlans) {
      setShowPlansModal(true)
    } else if (singlePlan) {
      addToCart({
        product: {
          id: product.id,
          title: product.title,
          description: product.description,
        },
        plan: {
          id: singlePlan.id,
          name: singlePlan.name,
          price: singlePlan.price,
        },
      })
    }
  }

  // Get features from the first plan or popular plan
  const displayPlan = popularPlan || singlePlan
  const features = displayPlan?.features?.slice(0, 3) || []

  return (
    <>
      <div className="flex flex-col rounded-xl border border-solid border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group h-full">
        {/* Image Container */}
        <div
          className="relative h-48 w-full bg-cover bg-center"
          style={{ backgroundImage: product.image ? `url(${product.image})` : undefined }}
        >
          {!product.image && (
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600" />
          )}

          {/* Badges */}
          {popularPlan && (
            <Badge className="absolute top-3 right-3 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded shadow-sm hover:bg-amber-600 border-none">
              Popular
            </Badge>
          )}
          {variant === 'featured' && (
            <Badge className="absolute top-3 right-3 bg-primary text-white text-xs font-bold px-2 py-1 rounded shadow-sm hover:bg-blue-600 border-none">
              Mejor Valor
            </Badge>
          )}
          {product.comparePrice && product.comparePrice > lowestPrice && (
            <Badge className="absolute top-3 right-3 bg-indigo-500 text-white text-xs font-bold px-2 py-1 rounded shadow-sm hover:bg-indigo-600 border-none">
              Nuevo
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col flex-1 gap-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-slate-900 text-lg font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2">
              {product.title}
            </h3>
            <p className="text-slate-500 text-sm line-clamp-2">
              {product.shortDesc || product.description}
            </p>
          </div>

          {/* Price */}
          <div className="flex flex-col items-start mt-auto">
            {hasPlans && (
              <span className="text-slate-500 text-sm font-medium mb-1">Desde</span>
            )}
            <div className="flex items-baseline gap-1">
              <span className="text-slate-900 text-3xl font-black leading-tight tracking-tight">
                ${lowestPrice.toFixed(2)}
              </span>
              {isSubscription && <span className="text-slate-500 text-sm font-medium">/mes</span>}
              {product.comparePrice && product.comparePrice > lowestPrice && (
                <span className="text-sm text-slate-400 line-through ml-2">
                  ${product.comparePrice.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          {/* Features */}
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
            {features.map((feature, idx) => {
              const featureName =
                typeof feature === 'string'
                  ? feature
                  : (feature as { feature?: { name?: string }; name?: string }).feature?.name ||
                    (feature as { name?: string }).name ||
                    ''
              return (
                <div
                  key={idx}
                  className="text-[13px] font-normal leading-normal flex gap-2 text-slate-600 items-start"
                >
                  <CheckCircle
                    className="text-green-500 w-[18px] h-[18px] shrink-0"
                    strokeWidth={2.5}
                  />
                  <span className="line-clamp-1">{featureName}</span>
                </div>
              )
            })}
          </div>

          {/* Action Button */}
          <Button
            variant={isSubscription ? 'default' : 'outline'}
            className={`w-full mt-2 cursor-pointer items-center justify-center rounded-lg h-10 px-4 text-sm font-bold leading-normal transition-colors ${
              isSubscription
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20 shadow-md'
                : 'border border-slate-300 bg-transparent text-slate-900 hover:bg-slate-50'
            }`}
            onClick={handleAddToCart}
          >
            {isInCart ? '✓ En el Carrito' : isSubscription ? 'Ver planes' : 'Agregar al Carrito'}
          </Button>
        </div>
      </div>

      {hasPlans && (
        <PlansModal product={product} open={showPlansModal} onOpenChange={setShowPlansModal} />
      )}
    </>
  )
}
