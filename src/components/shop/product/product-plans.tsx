'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useShopStore } from '@/stores/useShopStore'
import { Course, Merge, Product } from '@/types/shop'
import { Check } from 'lucide-react'

export function ProductPlans({ product }: { product: Merge<Product, Course> }) {
  const { addToCart, cart } = useShopStore()

  // Función para verificar si un plan está en el carrito
  const isInCart = (planId: string) => {
    return cart.some((item) => item.product.id === product.id && item.plan.id === planId)
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {product.plans.map((plan) => {
        // Extract features from the plan
        const features = plan.features || []
        const featureList = features.map((f: string | { feature?: { name?: string }; name?: string }) => 
          typeof f === 'string' ? f : f.feature?.name || f.name || ''
        ).filter(Boolean)

        return (
          <div key={plan.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">{plan.name}</h4>
                {plan.isPopular && (
                  <Badge variant="default" className="text-xs">Popular</Badge>
                )}
              </div>
              <span className="font-bold">${plan.price.toFixed(2)}</span>
            </div>
            
            {featureList.length > 0 && (
              <ul className="mt-3 space-y-2">
                {featureList.slice(0, 4).map((feature: string, index: number) => (
                  <li key={index} className="text-sm flex items-start">
                    <Check className="h-4 w-4 mr-2 text-primary shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
                {featureList.length > 4 && (
                  <li className="text-sm text-muted-foreground pl-6">
                    +{featureList.length - 4} más características
                  </li>
                )}
              </ul>
            )}
            
            <div className="mt-4">
              <Button
                variant={isInCart(plan.id) ? 'destructive' : 'default'}
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
                {isInCart(plan.id) ? 'Quitar del Carrito' : 'Agregar al Carrito'}
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
