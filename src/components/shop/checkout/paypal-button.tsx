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
  discount: number
  currency?: string
  onSuccess: (data: unknown) => void
  onError?: (error: unknown) => void
}

export function PayPalButton({
  items,
  total,
  subtotal,
  discount,
  currency = 'USD',
  onSuccess,
  onError,
}: PayPalButtonProps) {
  const [{ isPending }] = usePayPalScriptReducer()

  const createOrder = async () => {
    try {
      // Obtener información del cliente para usuarios invitados
      const customerInfo = JSON.parse(sessionStorage.getItem('customer-info') || '{}')
      
      const response = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          items,
          subtotal,
          total,
          currency,
          customerInfo: Object.keys(customerInfo).length > 0 ? customerInfo : undefined,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('PayPal create-order error:', response.status, errorText)
        throw new Error('Error al crear la orden')
      }

      const data = await response.json()

      return data.orderID
    } catch (error) {
      console.error('Error creating order:', error)
      toast.error('Error al crear la orden de PayPal')
      throw error
    }
  }

  const onApprove = async (data: { orderID: string }) => {
    try {
      // Obtener información del cliente para usuarios invitados
      const customerInfo = JSON.parse(sessionStorage.getItem('customer-info') || '{}')
      
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
            discount,
            total,
            currency,
          },
          customerInfo: Object.keys(customerInfo).length > 0 ? customerInfo : undefined,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('PayPal capture-order error:', response.status, errorText)
        throw new Error('Error al capturar el pago')
      }

      const result = await response.json()

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
