'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X, Gift, Clock } from 'lucide-react'
import { useShopStore } from '@/stores/useShopStore'
import { CartItem } from '@/types/shop'

interface AbandonedCartData {
  items: CartItem[]
  total: number
  timestamp: number
  hasShownReminder: boolean
}

export function CartAbandonmentTracker() {
  const [showReminder, setShowReminder] = useState(false)
  const [discountCode] = useState('WELCOME15')
  const cart = useShopStore((state) => state.cart)

  useEffect(() => {
    // Track cart state when items change
    if (cart.length > 0) {
      const cartData: AbandonedCartData = {
        items: cart,
        total: cart.reduce((sum, item) => sum + item.plan.price * (item.quantity || 1), 0),
        timestamp: Date.now(),
        hasShownReminder: false
      }
      localStorage.setItem('abandoned-cart', JSON.stringify(cartData))
    } else {
      localStorage.removeItem('abandoned-cart')
    }
  }, [cart])

  useEffect(() => {
    // Check for abandoned cart on page load
    const checkAbandonedCart = () => {
      const stored = localStorage.getItem('abandoned-cart')
      if (stored) {
        try {
          const cartData: AbandonedCartData = JSON.parse(stored)
          const timeElapsed = Date.now() - cartData.timestamp
          const hoursElapsed = timeElapsed / (1000 * 60 * 60)
          
          // Show reminder if cart was abandoned more than 2 hours ago and hasn't been shown
          if (hoursElapsed > 2 && !cartData.hasShownReminder && cartData.items.length > 0) {
            setShowReminder(true)
            
            // Mark as shown to avoid spamming
            const updatedData = { ...cartData, hasShownReminder: true }
            localStorage.setItem('abandoned-cart', JSON.stringify(updatedData))
          }
        } catch (error) {
          console.error('Error parsing abandoned cart data:', error)
        }
      }
    }

    checkAbandonedCart()
  }, [])

  if (!showReminder) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowReminder(false)}
          className="absolute right-2 top-2"
        >
          <X className="h-4 w-4" />
        </Button>
        
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center mb-4">
            <Gift className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-xl">¡Tenemos algo para ti! 🎁</CardTitle>
          <p className="text-sm text-muted-foreground">
            Vemos que dejaste productos en tu carrito
          </p>
        </CardHeader>
        
        <CardContent className="text-center space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-lg font-bold text-orange-800">
              15% DE DESCUENTO
            </p>
            <p className="text-sm text-orange-700">
              Usa el código: <span className="font-mono bg-white px-2 py-1 rounded">{discountCode}</span>
            </p>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            <span>Válido por 24 horas</span>
          </div>
          
          <div className="space-y-2">
            <Button 
              onClick={() => {
                setShowReminder(false)
                // Navigate to checkout
                window.location.href = '/shop/cart/checkout'
              }}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            >
              ¡Usar Descuento y Completar Compra!
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowReminder(false)}
              className="w-full"
            >
              No, gracias
            </Button>
          </div>
          
          <p className="text-xs text-gray-500">
            El descuento se aplicará automáticamente en el checkout
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
