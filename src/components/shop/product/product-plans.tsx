'use client'

import { Button } from '@/components/ui/button'
import { useShopStore } from '@/stores/useShopStore'
import { Course, Merge, Product } from '@/types/shop'
import { ChevronUp } from 'lucide-react'

export function ProductPlans({ product }: { product: Merge<Product, Course> }) {
  const { addToCart, cart } = useShopStore()

  // Función para verificar si un plan está en el carrito
  const isInCart = (planId: string) => {
    return cart.some((item) => item.product.id === product.id && item.plan.id === planId)
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
          {plan.features && plan.features.length > 0 && (
            <ul className="mt-2 space-y-1">
              {plan.features.slice(0, 3).map((feature, index) => (
                <li key={index} className="text-sm flex items-start">
                  <ChevronUp className="h-4 w-4 mr-1 text-primary shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
              {plan.features.length > 3 && (
                <li className="text-sm text-muted-foreground">
                  +{plan.features.length - 3} más características
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
      ))}
      <Button variant="outline" className="mt-2" onClick={() => setComparePlans(product)}>
        Comparar Planes
      </Button>
    </div>
  )
}
