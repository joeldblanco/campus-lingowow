'use client'

import {
  Form,
} from '@/components/ui/form'
import { LockIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PayPalButton } from './paypal-button'
import { NiubizCheckout } from '@/components/payments/NiubizCheckout'
import { useEffect, useState } from 'react'

interface CartItemForNiubiz {
  product: {
    id: string
    title: string
    description: string | null
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
  }
  onPayPalSuccess?: (data: unknown) => void
  onNiubizSuccess?: (data: unknown) => void
  userEmail?: string
  userFirstName?: string
  userLastName?: string
  isRecurrent?: boolean
  allowGuestCheckout?: boolean
  cartItems?: CartItemForNiubiz[]
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
  onPayPalSuccess,
  onNiubizSuccess,
  userEmail,
  userFirstName,
  userLastName,
  isRecurrent = false,
  allowGuestCheckout = false,
  cartItems = []
}: PaymentMethodFormProps) {
  const schema = createPaymentSchema(paymentMethod)

  // Create a unique purchase number for this session/attempt
  const [purchaseNumber, setPurchaseNumber] = useState('')

  useEffect(() => {
    // Generate order ID on client side to ensure it's unique per attempt
    // Niubiz requires purchaseNumber to be NUMERIC ONLY (max 12 digits)
    // Format: last 9 digits of timestamp + 3 random digits = 12 digits
    const timestamp = Date.now().toString().slice(-9)
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
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
    if (!purchaseNumber) return null;

    return (
      <div className="space-y-6">
        <div className="p-6 border rounded-md bg-slate-50 text-center">
          <p className="mb-4">Realiza tu pago de forma segura con Niubiz.</p>
          <NiubizCheckout
            amount={paypalData.total}
            purchaseNumber={purchaseNumber}
            onSuccess={(data) => {
              if (onNiubizSuccess) {
                onNiubizSuccess(data);
              }
            }}
            onError={(error) => {
              console.error("Niubiz Error:", error);
            }}
            userEmail={userEmail}
            userFirstName={userFirstName}
            userLastName={userLastName}
            isRecurrent={isRecurrent}
            invoiceData={paypalData}
            allowGuest={allowGuestCheckout}
            cartItems={cartItems}
          />
        </div>
      </div>
    )
  }

  const renderPayPalForm = () => {
    if (!paypalData || !onPayPalSuccess) {
      return (
        <div className="p-6 border rounded-md bg-slate-50 text-center">
          <p className="mb-4">Serás redirigido a PayPal para completar tu pago de forma segura.</p>
          <p className="text-sm text-muted-foreground">
            Nota: No es necesario tener una cuenta de PayPal para pagar con tarjeta de crédito o
            débito a través de su plataforma.
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="p-6 border rounded-md bg-slate-50 text-center">
          <p className="mb-4">Completa tu pago de forma segura con PayPal.</p>
          <p className="text-sm text-muted-foreground">
            Puedes pagar con tu cuenta de PayPal o con tarjeta de crédito/débito.
          </p>
        </div>
        <PayPalButton
          items={paypalData.items}
          total={paypalData.total}
          subtotal={paypalData.subtotal}
          discount={paypalData.discount}
          onSuccess={onPayPalSuccess}
        />
      </div>
    )
  }


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)}>
        {paymentMethod === 'creditCard' && renderCreditCardForm()}
        {paymentMethod === 'paypal' && renderPayPalForm()}

        <div className="mt-8 text-center">
          <div className="flex items-center justify-center mb-6">
            <LockIcon className="h-4 w-4 mr-2 text-green-600" />
            <span className="text-sm text-muted-foreground">
              Pago 100% seguro con encriptación SSL
            </span>
          </div>

          {/* Hide default submit button as both PayPal and Niubiz have their own buttons */}
          {/* <Button type="submit" className="w-full" disabled={isLoading || form.formState.isSubmitting}>
            {isLoading || form.formState.isSubmitting ? 'Procesando...' : 'Finalizar Compra'}
          </Button> */}
        </div>
      </form>
    </Form>
  )
}
