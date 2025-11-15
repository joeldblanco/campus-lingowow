'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { PlanCard } from '@/components/shop/plans/plan-card'
import { Course, Merge, Product, Plan } from '@/types/shop'
import { useShopStore } from '@/stores/useShopStore'
import Image from 'next/image'

interface ProductRowProps {
  product: Merge<Product, Course>
}

export function ProductRow({ product }: ProductRowProps) {
  const { addToCart, cart } = useShopStore()

  const isInCart = (planId: string) => {
    return cart.some((item) => item.product.id === product.id && item.plan.id === planId)
  }

  // Get all unique features from all plans
  const allFeatures = Array.from(
    new Set(
      product.plans.flatMap((plan) =>
        (plan.features || []).map((f: string | { feature?: { name?: string }; name?: string }) =>
          typeof f === 'string' ? f : f.feature?.name || f.name || ''
        )
      )
    )
  ).filter(Boolean)

  // Debug: Log features data
  console.log('ProductRow Debug:', {
    productName: product.title,
    plansCount: product.plans.length,
    allFeatures: allFeatures,
    planFeatures: product.plans.map((p) => ({ id: p.id, name: p.name, features: p.features })),
  })

  const hasFeature = (
    plan: Plan & { features?: Array<string | { feature?: { name?: string }; name?: string }> },
    featureName: string
  ) => {
    if (!plan.features) return false
    return plan.features.some((f: string | { feature?: { name?: string }; name?: string }) => {
      const name = typeof f === 'string' ? f : f.feature?.name || f.name || ''
      return name === featureName
    })
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-lg hover:shadow-xl transition-shadow p-6 mb-6">
      <div className="flex flex-col lg:flex-row gap-6 min-h-[400px]">
        {/* Product Card - Left Side */}
        <div className="lg:w-1/3">
          <Card className="border-2 bg-gradient-to-br from-blue-50 to-white h-full relative">
            {/* Title Overlay */}
            <div className="absolute top-4 left-4 z-10 pr-20">
              <CardTitle className="text-6xl font-bold text-blue-900 mb-4 leading-tight drop-shadow-lg">
                {product.title}
              </CardTitle>
            </div>
            <CardContent className="pt-0">
              <div className="h-full mt-8">
                <Image
                  src={product.image || '/placeholder.svg'}
                  alt={product.title}
                  fill
                  className="object-cover rounded-md"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 30vw, 25vw"
                  priority={false}
                />
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-blue-50 via-blue-50/80 to-transparent rounded-md pointer-events-none" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Plans Section - Right Side */}
        <div className="lg:w-2/3 flex flex-col h-full">
          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch flex-1 min-h-[400px]">
            {product.plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                product={product}
                isInCart={isInCart}
                addToCart={addToCart}
                allFeatures={allFeatures}
                hasFeature={hasFeature}
              />
            ))}
          </div>

          {/* Cart Status */}
          {cart.some((item) => item.product.id === product.id) && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm text-green-800 font-medium">
                  ✓ Tienes un plan de este producto en el carrito
                </p>
                <Button
                  size="sm"
                  onClick={() => (window.location.href = '/shop/cart/checkout')}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Finalizar Compra
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
