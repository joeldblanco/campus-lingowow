'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Product, Plan } from '@/types/shop'

interface PlanCardProps {
  plan: Plan
  product: Product
  isInCart: (planId: string) => boolean
  addToCart: (item: { product: { id: string; title: string; description: string }; plan: { id: string; name: string; price: number } }) => void
  allFeatures: string[]
  hasFeature: (plan: Plan, featureName: string) => boolean
}

export function PlanCard({ plan, product, isInCart, addToCart, allFeatures, hasFeature }: PlanCardProps) {
  const inCart = isInCart(plan.id)
  const isPopular = plan.isPopular || false

  // Debug: Log plan data to check structure
  console.log('Plan data:', {
    id: plan.id,
    name: plan.name,
    price: plan.price,
    includesClasses: plan.includesClasses,
    classesPerPeriod: plan.classesPerPeriod
  })

  return (
    <div
      className={cn(
        'relative border rounded-lg p-4 flex flex-col h-full transition-all duration-200 bg-white border-gray-400',
        isPopular && 'border-primary shadow-lg bg-primary/5',
        inCart && 'border-green-500 bg-green-50 shadow-green-200 shadow-lg scale-[1.02]'
      )}
    >
      {isPopular && (
        <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs">
          Más Popular
        </Badge>
      )}
      
      {inCart && (
        <div className="absolute -top-2 right-2">
          <div className="bg-green-500 text-white rounded-full p-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        </div>
      )}

      <div className="text-center mb-4">
        <h3 className="text-lg font-bold mb-2">{plan.name}</h3>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-2xl font-bold">${plan.price.toFixed(2)}</span>
          <span className="text-sm text-muted-foreground">/mes</span>
        </div>
        {plan.comparePrice && plan.comparePrice > plan.price && (
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-sm text-muted-foreground line-through">
              ${plan.comparePrice.toFixed(2)}
            </span>
            <span className="text-xs text-green-600 font-medium">
              Ahorra ${((plan.comparePrice - plan.price).toFixed(2))}
            </span>
          </div>
        )}
        {plan.includesClasses && plan.classesPerPeriod && plan.classesPerPeriod > 0 ? (
          <div className="flex items-baseline justify-center gap-1 mt-1">
            <span className="text-xs text-muted-foreground">
              ${(plan.price / plan.classesPerPeriod).toFixed(2)} por clase
            </span>
            <span className="text-xs text-muted-foreground">
              ({plan.classesPerPeriod} clases/mes)
            </span>
          </div>
        ) : (
          // Debug: Show placeholder when no class data
          <div className="flex items-baseline justify-center gap-1 mt-1">
            <span className="text-xs text-gray-400">
              (Sin datos de clases)
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 space-y-2 mb-4">
        {allFeatures.slice(0, 6).map((feature, idx) => {
          const included = hasFeature(plan, feature)
          return (
            <div key={idx} className="flex items-center gap-2">
              {included ? (
                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              ) : (
                <X className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              )}
              <span
                className={cn(
                  'text-xs break-words',
                  !included && 'text-muted-foreground line-through'
                )}
              >
                {feature || ''}
              </span>
            </div>
          )
        })}
        {allFeatures.length > 6 && (
          <div className="text-xs text-muted-foreground text-center pt-2">
            ...y {allFeatures.length - 6} más características
          </div>
        )}
      </div>

      <Button
        variant={inCart ? 'destructive' : isPopular ? 'default' : 'outline'}
        onClick={() =>
          addToCart({
            product: {
              id: product.id,
              title: product.name, // Usar name del Product como title para CartItem
              description: product.description || '',
            },
            plan: {
              id: plan.id,
              name: plan.name,
              price: plan.price,
            },
          })
        }
        className="w-full text-sm"
        size="sm"
      >
        {inCart ? 'Quitar' : 'Agregar'}
      </Button>
    </div>
  )
}
