'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X, Gift, Clock } from 'lucide-react'
import { useShopStore } from '@/stores/useShopStore'
import { toast } from 'sonner'

export function ExitIntentPopup() {
  // Temporalmente deshabilitado
  return null
  
  const [isVisible, setIsVisible] = useState(false)
  const [hasShown, setHasShown] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()
  const cart = useShopStore((state) => state.cart)
  const applyCoupon = useShopStore((state) => state.applyCoupon)

  useEffect(() => {
    // Only show if cart has items and hasn't been shown before
    if (cart.length === 0 || hasShown) return

    const handleMouseLeave = (e: MouseEvent) => {
      // Only trigger if mouse leaves through top (user is leaving the site)
      if (e.clientY <= 0 && !hasShown) {
        timeoutRef.current = setTimeout(() => {
          setIsVisible(true)
          setHasShown(true)
        }, 500)
      }
    }

    const handleMouseEnter = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }

    document.addEventListener('mouseleave', handleMouseLeave)
    document.addEventListener('mouseenter', handleMouseEnter)

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave)
      document.removeEventListener('mouseenter', handleMouseEnter)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [cart.length, hasShown])

  if (!isVisible) return null

  const discountCode = 'SAVE10'
  const expiryTime = '15 minutos'

  const handleApplyDiscount = () => {
    // Apply the coupon to the store
    applyCoupon({
      id: 'exit-intent-coupon',
      code: discountCode,
      type: 'PERCENTAGE',
      value: 10,
    })
    
    // Show success toast
    toast.success('¡Descuento aplicado! 10% de descuento en tu compra.')
    
    // Close the popup
    setIsVisible(false)
    
    // Redirect to checkout
    router.push('/shop/cart/checkout')
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsVisible(false)}
          className="absolute right-2 top-2"
        >
          <X className="h-4 w-4" />
        </Button>
        
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-4">
            <Gift className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-xl">¡Espera! 🎁</CardTitle>
          <p className="text-sm text-muted-foreground">
            No te vayas con el carrito lleno
          </p>
        </CardHeader>
        
        <CardContent className="text-center space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-lg font-bold text-green-800">
              10% DE DESCUENTO
            </p>
            <p className="text-sm text-green-700">
              Usa el código: <span className="font-mono bg-white px-2 py-1 rounded">{discountCode}</span>
            </p>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-sm text-orange-600">
            <Clock className="h-4 w-4" />
            <span>El código expira en {expiryTime}</span>
          </div>
          
          <div className="space-y-2">
            <Button 
              onClick={handleApplyDiscount}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
            >
              ¡Aplicar Descuento y Continuar!
            </Button>
            <p className="text-xs text-muted-foreground">
              El descuento se aplicará automáticamente en el checkout
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
