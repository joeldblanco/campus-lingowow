'use client'

import { Form } from '@/components/ui/form'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { NiubizCheckout } from '@/components/payments/NiubizCheckout'
import {
  PaymentTrustBlock,
  RecurringBillingNotice,
  SecureRedirectNote,
} from '@/components/shop/checkout/payment-assurance'
import { useEffect, useState } from 'react'

interface CartItemForNiubiz {
  product: {
    id: string
    title: string
    description?: string | null
    image?: string | null
    type?: string
  }
  plan: {
    id: string
    name: string
    price: number
  }
  quantity?: number
}

interface CustomerInfo {
  email: string
  firstName: string
  lastName?: string
  address?: string
  city?: string
  country?: string
  zipCode?: string
}

interface PaymentMethodFormProps {
  paymentMethod: string
  onSubmit: (data: PaymentFormData) => void
  isLoading: boolean
  paypalData: {
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
    couponId?: string
  }
  onNiubizSuccess?: (data: unknown) => void
  userEmail?: string
  userFirstName?: string
  userLastName?: string
  isRecurrent?: boolean
  /** Plain-language recurring charge to surface before paying. Present iff the cart is recurrent. */
  recurringSummary?: { amount: number; cycleLabel: string }
  allowGuestCheckout?: boolean
  cartItems?: CartItemForNiubiz[]
  customerInfo?: CustomerInfo
}

type PaymentFormData = Record<string, never>

// Schema unificado que cambia según el método de pago
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const createPaymentSchema = (_paymentMethod: string) => {
  return z.object({})
}

export function PaymentMethodForm({
  paymentMethod,
  onSubmit,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isLoading: _isLoading,
  paypalData,
  onNiubizSuccess,
  userEmail,
  userFirstName,
  userLastName,
  isRecurrent = false,
  recurringSummary,
  allowGuestCheckout = false,
  cartItems = [],
  customerInfo,
}: PaymentMethodFormProps) {
  const schema = createPaymentSchema(paymentMethod)

  // Create a unique purchase number for this session/attempt
  const [purchaseNumber, setPurchaseNumber] = useState('')

  useEffect(() => {
    // Generate order ID on client side to ensure it's unique per attempt
    // Niubiz requires purchaseNumber to be NUMERIC ONLY (max 12 digits)
    // Format: last 9 digits of timestamp + 3 random digits = 12 digits
    const timestamp = Date.now().toString().slice(-9)
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0')
    setPurchaseNumber(`${timestamp}${random}`)
  }, [])

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(schema),
    defaultValues: {},
  })

  const handleFormSubmit = (data: PaymentFormData) => {
    onSubmit(data)
  }

  const renderCreditCardForm = () => {
    if (!purchaseNumber) return null

    return (
      <div className="space-y-5">
        {/* Recurring transparency — surfaced before the pay button, never buried in T&C. */}
        {recurringSummary && (
          <RecurringBillingNotice
            amount={recurringSummary.amount}
            cycleLabel={recurringSummary.cycleLabel}
          />
        )}

        {/* 3DS expectation — Niubiz redirects to the bank; set the expectation up front. */}
        <SecureRedirectNote />

        <NiubizCheckout
          amount={paypalData.total}
          purchaseNumber={purchaseNumber}
          onSuccess={(data) => {
            if (onNiubizSuccess) {
              onNiubizSuccess(data)
            }
          }}
          onError={(error) => {
            console.error('Niubiz Error:', error)
          }}
          userEmail={userEmail}
          userFirstName={userFirstName}
          userLastName={userLastName}
          isRecurrent={isRecurrent}
          invoiceData={paypalData}
          customerInfo={customerInfo}
          allowGuest={allowGuestCheckout}
          cartItems={cartItems}
        />

        {/* Trust block stacked adjacent to the pay button (where anxiety peaks). */}
        <PaymentTrustBlock className="pt-1" />
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)}>
        {paymentMethod === 'creditCard' && renderCreditCardForm()}

        {/* Hide default submit button as Niubiz has its own button */}
        {/* <Button type="submit" className="w-full" disabled={isLoading || form.formState.isSubmitting}>
          {isLoading || form.formState.isSubmitting ? 'Procesando...' : 'Finalizar Compra'}
        </Button> */}
      </form>
    </Form>
  )
}
