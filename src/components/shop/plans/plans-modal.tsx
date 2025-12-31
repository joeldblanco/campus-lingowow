'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useShopStore } from '@/stores/useShopStore'
import { Course, Merge, Product } from '@/types/shop'
import { cn } from '@/lib/utils'

interface PlansModalProps {
  product: Merge<Product, Course> | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PlansModal({ product, open, onOpenChange }: PlansModalProps) {
  const { addToCart, cart } = useShopStore()

  const isInCart = (planId: string) => {
    if (!product) return false
    return cart.some((item) => item.product.id === product.id && item.plan.id === planId)
  }

  if (!product) return null

  const plans = product.plans || []
  const popularPlanIndex = plans.findIndex(p => p.isPopular)
  const effectivePopularIndex = popularPlanIndex >= 0 ? popularPlanIndex : (plans.length > 1 ? 1 : 0)

  // Get all unique features from all plans
  const allFeatures = Array.from(
    new Set(
      plans.flatMap((plan) =>
        (plan.features || []).map((f: string | { feature?: { name?: string }; name?: string }) =>
          typeof f === 'string' ? f : f.feature?.name || f.name || ''
        )
      )
    )
  ).filter(Boolean)

  const hasFeature = (plan: { features?: Array<string | { feature?: { name?: string }; name?: string }> }, featureName: string) => {
    if (!plan.features) return false
    return plan.features.some((f: string | { feature?: { name?: string }; name?: string }) => {
      const name = typeof f === 'string' ? f : f.feature?.name || f.name || ''
      return name === featureName
    })
  }

  const handleSelectPlan = (plan: typeof plans[0]) => {
    addToCart({
      product: {
        id: product.id,
        title: product.title,
        description: product.description,
      },
      plan: {
        id: plan.id,
        name: plan.name,
        price: plan.price,
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 gap-0 overflow-hidden bg-gray-50">
        <DialogHeader className="p-6 pb-2 sr-only">
          <DialogTitle>
            Elige tu plan de {product.title}
          </DialogTitle>
          <DialogDescription>
            Selecciona el plan que mejor se adapte a tus necesidades
          </DialogDescription>
        </DialogHeader>

        <div className="p-8 pt-12">
          <div className={cn(
            "grid gap-6 items-start",
            plans.length === 1 && "grid-cols-1 max-w-md mx-auto",
            plans.length === 2 && "grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto",
            plans.length >= 3 && "grid-cols-1 md:grid-cols-3"
          )}>
            {plans.map((plan, index) => {
              const inCart = isInCart(plan.id)
              const isPopular = plan.isPopular || index === effectivePopularIndex

              return (
                <div
                  key={plan.id}
                  className={cn(
                    'relative flex flex-col rounded-xl border border-solid bg-white overflow-hidden transition-all duration-300 group',
                    isPopular ? 'border-primary shadow-xl scale-105 z-10' : 'border-slate-200 shadow-sm hover:shadow-lg',
                    inCart && 'ring-2 ring-green-500'
                  )}
                >
                  {/* Image Header with Badge */}
                  <div className="h-32 w-full bg-cover bg-center relative bg-slate-100">
                    {/* Placeholder gradient if no image, matching cards */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 opacity-80" />

                    {isPopular && (
                      <div className="absolute top-3 right-3 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded shadow-sm">
                        Más Popular
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex flex-col flex-1 gap-4">

                    {/* Header */}
                    <div className="flex flex-col gap-1 text-center">
                      <h3 className="text-slate-900 text-xl font-bold leading-tight">
                        {plan.name}
                      </h3>
                      <p className="text-slate-500 text-sm">
                        {plan.description || getDefaultDescription(index)}
                      </p>
                    </div>

                    {/* Price */}
                    <div className="flex items-baseline justify-center gap-1 mt-2">
                      <span className="text-slate-900 text-4xl font-black leading-tight tracking-tight">
                        ${plan.price.toFixed(0)}
                      </span>
                      <span className="text-slate-500 text-sm font-medium">/mes</span>
                    </div>
                    {plan.billingCycle && (
                      <p className="text-xs text-primary text-center font-bold">
                        Facturado ${(plan.price * 12).toFixed(0)} anualmente
                      </p>
                    )}

                    {/* Features */}
                    <div className="flex flex-col gap-2 pt-4 border-t border-slate-100 mt-2">
                      {allFeatures.map((feature, idx) => {
                        const included = hasFeature(plan, feature)
                        return (
                          <div key={idx} className="text-[13px] font-normal leading-normal flex gap-2 text-slate-600">
                            {included ? (
                              <span className="material-symbols-outlined text-green-500 text-[18px] leading-none">check_circle</span>
                            ) : (
                              <span className="material-symbols-outlined text-slate-300 text-[18px] leading-none">cancel</span>
                            )}
                            <span className={cn("line-clamp-1", !included && "text-slate-400 line-through")}>{feature}</span>
                          </div>
                        )
                      })}
                    </div>

                    {/* CTA Button */}
                    <Button
                      onClick={() => handleSelectPlan(plan)}
                      variant={inCart ? 'destructive' : isPopular ? 'default' : 'outline'}
                      className={cn(
                        'w-full mt-4 cursor-pointer items-center justify-center rounded-lg h-10 px-4 text-sm font-bold leading-normal transition-colors',
                        isPopular && !inCart && 'bg-primary text-white hover:bg-blue-600 shadow-blue-500/20 shadow-md',
                        !isPopular && !inCart && 'border border-slate-300 bg-transparent text-slate-900 hover:bg-slate-50'
                      )}
                    >
                      {inCart ? 'Quitar del Carrito' : getButtonText(index, isPopular)}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Checkout Button */}
          {cart.some(item => item.product.id === product?.id) && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <Button
                onClick={() => {
                  onOpenChange(false)
                  window.location.href = '/shop/cart/checkout'
                }}
                size="lg"
                className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg font-bold rounded-xl shadow-lg"
              >
                Proceder al Checkout
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function getDefaultDescription(index: number): string {
  const descriptions = [
    'Para estudiantes casuales explorando nuevos idiomas.',
    'Para estudiantes serios que buscan fluidez.',
    'Para dominio rápido y coaching personalizado.',
  ]
  return descriptions[index] || descriptions[0]
}

function getButtonText(index: number, isPopular: boolean): string {
  if (isPopular) return 'Comenzar Ahora'
  const texts = ['Registrarse Gratis', 'Comenzar Ahora', 'Comenzar Inmersión']
  return texts[index] || 'Seleccionar Plan'
}
