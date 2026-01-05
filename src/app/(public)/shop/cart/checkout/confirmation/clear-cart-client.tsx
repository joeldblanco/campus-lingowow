'use client'

import { useEffect, useRef } from 'react'
import { useShopStore } from '@/stores/useShopStore'

export function ClearCartOnMount() {
  const cleared = useRef(false)

  useEffect(() => {
    if (cleared.current) return
    cleared.current = true
    
    // Clear cart and checkout state
    useShopStore.getState().clearCart()
    sessionStorage.removeItem('checkout-state')
    sessionStorage.removeItem('niubiz-pending-payment')
    sessionStorage.removeItem('last-order')
  }, [])

  return null
}
