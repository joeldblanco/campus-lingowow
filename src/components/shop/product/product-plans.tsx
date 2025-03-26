'use client'

import { Button } from '@/components/ui/button'
import { useShopStore } from '@/stores/useShopStore'
import { Product } from '@/types/shop'
import { ChevronUp } from 'lucide-react'

export function ProductPlans({ product }: { product: Product }) {
  const { addToCart, cart } = useShopStore()

  // Función para verificar si un plan está en el carrito
  const isInCart = (planId: string) => {
    return cart.some((item) => item.productId === product.id && item.planId === planId)
  }

  // Función para manejar la comparación de planes
  const setComparePlans = useShopStore((state) => state.setComparePlans)

  return (
    <div className="grid grid-cols-1 gap-4">
      {product.plans.map((plan) => (
        <div key={plan.id} className="border rounded-lg p-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">{plan.name}</h4>
            <span className="font-bold">${plan.price.toFixed(2)}</span>
          </div>
          <ul className="mt-2 space-y-1">
            {plan.features.slice(0, 3).map((feature, index) => (
              <li key={index} className="text-sm flex items-start">
                <ChevronUp className="h-4 w-4 mr-1 text-primary shrink-0 mt-0.5" />
                <span>{feature}</span>
              </li>
            ))}
            {plan.features.length > 3 && (
              <li className="text-sm text-muted-foreground">
                +{plan.features.length - 3} more features
              </li>
            )}
          </ul>
          <div className="mt-4">
            <Button
              variant={isInCart(plan.id) ? 'destructive' : 'default'}
              onClick={() =>
                addToCart({
                  productId: product.id,
                  productTitle: product.title,
                  planId: plan.id,
                  planName: plan.name,
                  price: plan.price,
                })
              }
              className="w-full"
            >
              {isInCart(plan.id) ? 'Remove from Cart' : 'Add to Cart'}
            </Button>
          </div>
        </div>
      ))}
      <Button variant="outline" className="mt-2" onClick={() => setComparePlans(product)}>
        Compare Plans
      </Button>
    </div>
  )
}
