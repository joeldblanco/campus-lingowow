'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Check, X } from 'lucide-react'
import { useShopStore } from '@/stores/useShopStore'
import { Course, Merge, Product } from '@/types/shop'
import { cn } from '@/lib/utils'

interface PricingTableModalProps {
  product: Merge<Product, Course> | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PricingTableModal({ product, open, onOpenChange }: PricingTableModalProps) {
  const { addToCart, cart } = useShopStore()

  const isInCart = (planId: string) => {
    if (!product) return false
    return cart.some((item) => item.product.id === product.id && item.plan.id === planId)
  }

  if (!product) return null

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

  const hasFeature = (plan: { features?: Array<string | { feature?: { name?: string }; name?: string }> }, featureName: string) => {
    if (!plan.features) return false
    return plan.features.some((f: string | { feature?: { name?: string }; name?: string }) => {
      const name = typeof f === 'string' ? f : f.feature?.name || f.name || ''
      return name === featureName
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{product.title}</DialogTitle>
          <DialogDescription>
            Elige el plan que mejor se adapte a tus necesidades
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6">
          {/* Desktop view - Grid */}
          <div className="hidden md:grid md:grid-cols-3 gap-6">
            {product.plans.map((plan) => {
              const inCart = isInCart(plan.id)
              const isPopular = plan.isPopular || false

              return (
                <div
                  key={plan.id}
                  className={cn(
                    'relative border rounded-lg p-6 flex flex-col',
                    isPopular && 'border-primary shadow-lg scale-105'
                  )}
                >
                  {isPopular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                      Más Popular
                    </Badge>
                  )}

                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold">${plan.price.toFixed(2)}</span>
                      <span className="text-muted-foreground">/mes</span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-3 mb-6">
                    {allFeatures.map((feature, idx) => {
                      const included = hasFeature(plan, feature)
                      return (
                        <div key={idx} className="flex items-start gap-2">
                          {included ? (
                            <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                          )}
                          <span
                            className={cn(
                              'text-sm',
                              !included && 'text-muted-foreground line-through'
                            )}
                          >
                            {feature}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  <Button
                    variant={inCart ? 'destructive' : isPopular ? 'default' : 'outline'}
                    onClick={() =>
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
                    className="w-full"
                  >
                    {inCart ? 'Quitar del Carrito' : 'Agregar al Carrito'}
                  </Button>
                </div>
              )
            })}
          </div>

          {/* Mobile view - Stacked */}
          <div className="md:hidden space-y-4">
            {product.plans.map((plan) => {
              const inCart = isInCart(plan.id)
              const isPopular = plan.isPopular || false

              return (
                <div
                  key={plan.id}
                  className={cn(
                    'relative border rounded-lg p-4',
                    isPopular && 'border-primary shadow-lg'
                  )}
                >
                  {isPopular && (
                    <Badge className="absolute -top-2 right-4">Más Popular</Badge>
                  )}

                  <div className="mb-4">
                    <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold">${plan.price.toFixed(2)}</span>
                      <span className="text-sm text-muted-foreground">/mes</span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    {allFeatures.map((feature, idx) => {
                      const included = hasFeature(plan, feature)
                      return (
                        <div key={idx} className="flex items-start gap-2">
                          {included ? (
                            <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          )}
                          <span
                            className={cn(
                              'text-sm',
                              !included && 'text-muted-foreground line-through'
                            )}
                          >
                            {feature}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  <Button
                    variant={inCart ? 'destructive' : isPopular ? 'default' : 'outline'}
                    onClick={() =>
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
                    className="w-full"
                  >
                    {inCart ? 'Quitar del Carrito' : 'Agregar al Carrito'}
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
