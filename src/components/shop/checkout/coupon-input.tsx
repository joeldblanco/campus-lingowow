'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, Tag, X, Check, Percent, DollarSign } from 'lucide-react'
import { useShopStore, AppliedCoupon } from '@/stores/useShopStore'
import { cn } from '@/lib/utils'

interface CouponInputProps {
  planIds?: string[]
  subtotal: number
  onDiscountChange?: (discount: number) => void
}

export function CouponInput({ planIds = [], subtotal, onDiscountChange }: CouponInputProps) {
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { appliedCoupon, applyCoupon, removeCoupon } = useShopStore()

  const calculateDiscount = (coupon: AppliedCoupon, amount: number): number => {
    if (coupon.type === 'PERCENTAGE') {
      const discount = (amount * coupon.value) / 100
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        return coupon.maxDiscount
      }
      return discount
    }
    return Math.min(coupon.value, amount)
  }

  const handleApplyCoupon = async () => {
    if (!code.trim()) {
      setError('Ingresa un código de cupón')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: code.trim().toUpperCase(),
          planId: planIds[0],
        }),
      })

      const data = await response.json()

      if (!data.valid) {
        setError(data.error || 'Cupón inválido')
        return
      }

      const coupon: AppliedCoupon = {
        id: data.coupon.id,
        code: data.coupon.code,
        type: data.coupon.type,
        value: data.coupon.value,
        name: data.coupon.name,
        maxDiscount: data.coupon.maxDiscount,
        restrictedToPlanId: data.coupon.restrictedToPlanId,
      }

      applyCoupon(coupon)
      setCode('')
      
      const discount = calculateDiscount(coupon, subtotal)
      onDiscountChange?.(discount)
    } catch {
      setError('Error al validar el cupón')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveCoupon = () => {
    removeCoupon()
    onDiscountChange?.(0)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleApplyCoupon()
    }
  }

  if (appliedCoupon) {
    const discount = calculateDiscount(appliedCoupon, subtotal)
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-600" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-green-800">{appliedCoupon.code}</span>
                <Badge variant="secondary" className="text-xs">
                  {appliedCoupon.type === 'PERCENTAGE' ? (
                    <><Percent className="h-3 w-3 mr-1" />{appliedCoupon.value}%</>
                  ) : (
                    <><DollarSign className="h-3 w-3 mr-1" />${appliedCoupon.value}</>
                  )}
                </Badge>
              </div>
              {appliedCoupon.name && (
                <p className="text-xs text-green-600">{appliedCoupon.name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-green-700 font-medium">
              -${discount.toFixed(2)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemoveCoupon}
              className="h-8 w-8 p-0 text-green-700 hover:text-red-600 hover:bg-red-50"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Código de cupón"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase())
              setError(null)
            }}
            onKeyDown={handleKeyDown}
            className={cn(
              "pl-9 uppercase",
              error && "border-red-500 focus-visible:ring-red-500"
            )}
            disabled={isLoading}
          />
        </div>
        <Button
          onClick={handleApplyCoupon}
          disabled={isLoading || !code.trim()}
          variant="outline"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Aplicar'
          )}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}
