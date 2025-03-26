'use client'

import { ChevronUp, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useShopStore } from '@/stores/useShopStore'

export function ComparePlansSheet() {
  const { comparePlans, setComparePlans, addToCart, cart } = useShopStore()

  const isInCart = (productId: string, planId: string) => {
    return cart.some((item) => item.productId === productId && item.planId === planId)
  }

  return (
    <Sheet
      open={comparePlans.product !== null}
      onOpenChange={(open) => !open && setComparePlans(null)}
    >
      <SheetContent side="right" className="w-[90vw] sm:w-[600px] max-w-full">
        <SheetHeader>
          <SheetTitle>Compare Plans</SheetTitle>
        </SheetHeader>
        {comparePlans.product && (
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-4">{comparePlans.product.title}</h3>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left p-2 border-b"></th>
                    {comparePlans.product.plans.map((plan) => (
                      <th key={plan.id} className="text-left p-2 border-b font-medium">
                        {plan.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border-b font-medium">Price</td>
                    {comparePlans.product.plans.map((plan) => (
                      <td key={plan.id} className="p-2 border-b">
                        ${plan.price.toFixed(2)}
                      </td>
                    ))}
                  </tr>

                  {Array.from(
                    new Set(comparePlans.product.plans.flatMap((plan) => plan.features))
                  ).map((feature, index) => (
                    <tr key={index}>
                      <td className="p-2 border-b font-medium">{feature}</td>
                      {comparePlans.product!.plans.map((plan) => (
                        <td key={plan.id} className="p-2 border-b">
                          {plan.features.includes(feature) ? (
                            <ChevronUp className="h-5 w-5 text-primary" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground" />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}

                  <tr>
                    <td className="p-2 pt-4"></td>
                    {comparePlans.product.plans.map((plan) => {
                      const item = {
                        productId: comparePlans.product!.id,
                        productTitle: comparePlans.product!.title,
                        planId: plan.id,
                        planName: plan.name,
                        price: plan.price,
                      }

                      return (
                        <td key={plan.id} className="p-2 pt-4">
                          <Button
                            variant={
                              isInCart(item.productId, item.planId) ? 'destructive' : 'default'
                            }
                            onClick={() => addToCart(item)}
                            className="w-full"
                          >
                            {isInCart(item.productId, item.planId) ? 'Remove' : 'Add to Cart'}
                          </Button>
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
