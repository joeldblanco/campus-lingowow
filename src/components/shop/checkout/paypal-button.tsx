'use client'

import { PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface PayPalButtonProps {
  items: Array<{
    productId: string
    planId?: string
    name: string
    description?: string
    price: number
    quantity: number
  }>
  total: number
  subtotal: number
  tax: number
  discount: number
  currency?: string
  onSuccess: (data: unknown) => void
  onError?: (error: unknown) => void
}

export function PayPalButton({
  items,
  total,
  subtotal,
  tax,
  discount,
  currency = 'USD',
  onSuccess,
  onError,
}: PayPalButtonProps) {
  const [{ isPending }] = usePayPalScriptReducer()

  const createOrder = async () => {
    try {
      const response = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          items,
          subtotal,
          tax,
          total,
          currency,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear la orden')
      }

      return data.orderID
    } catch (error) {
      console.error('Error creating order:', error)
      toast.error('Error al crear la orden de PayPal')
      throw error
    }
  }

  const onApprove = async (data: { orderID: string }) => {
    try {
      const response = await fetch('/api/paypal/capture-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          orderID: data.orderID,
          invoiceData: {
            items,
            subtotal,
            tax,
            discount,
            total,
            currency,
          },
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al capturar el pago')
      }

      toast.success('¡Pago completado exitosamente!')
      onSuccess(result)
      
      // Retornar una promesa resuelta para que PayPal cierre la ventana
      return Promise.resolve()
    } catch (error) {
      console.error('Error capturing order:', error)
      toast.error('Error al procesar el pago')
      if (onError) {
        onError(error)
      }
      // Retornar una promesa rechazada para que PayPal maneje el error
      return Promise.reject(error)
    }
  }

  const onErrorHandler = (error: unknown) => {
    console.error('PayPal error:', error)
    toast.error('Error con PayPal')
    if (onError) {
      onError(error)
    }
  }

  if (isPending) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2">Cargando PayPal...</span>
      </div>
    )
  }

  return (
    <PayPalButtons
      style={{
        layout: 'vertical',
        color: 'gold',
        shape: 'rect',
        label: 'paypal',
      }}
      createOrder={createOrder}
      onApprove={onApprove}
      onError={onErrorHandler}
    />
  )
}
