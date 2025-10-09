'use client'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CreditCard, LockIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PayPalButton } from './paypal-button'

interface PaymentMethodFormProps {
  paymentMethod: string
  onSubmit: (data: PaymentFormData) => void
  isLoading: boolean
  paypalData?: {
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
  }
  onPayPalSuccess?: (data: unknown) => void
}

type PaymentFormData = {
  cardNumber?: string
  cardholderName?: string
  expiryMonth?: string
  expiryYear?: string
  cvv?: string
  holderName?: string
  reference?: string
}

// Schema unificado que cambia según el método de pago
const createPaymentSchema = (paymentMethod: string) => {
  if (paymentMethod === 'creditCard') {
    return z.object({
      cardNumber: z.string().regex(/^\d{16}$/, 'El número de tarjeta debe tener 16 dígitos'),
      cardholderName: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
      expiryMonth: z.string().min(1, 'Selecciona un mes'),
      expiryYear: z.string().min(1, 'Selecciona un año'),
      cvv: z.string().regex(/^\d{3,4}$/, 'El CVV debe tener 3 o 4 dígitos'),
    })
  } else if (paymentMethod === 'transfer') {
    return z.object({
      holderName: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
      reference: z.string().min(6, 'La referencia debe tener al menos 6 caracteres'),
    })
  } else {
    // PayPal no necesita campos adicionales
    return z.object({})
  }
}

export function PaymentMethodForm({ 
  paymentMethod, 
  onSubmit, 
  isLoading,
  paypalData,
  onPayPalSuccess 
}: PaymentMethodFormProps) {
  const schema = createPaymentSchema(paymentMethod)
  
  const getDefaultValues = (): PaymentFormData => {
    if (paymentMethod === 'creditCard') {
      return {
        cardNumber: '',
        cardholderName: '',
        expiryMonth: '',
        expiryYear: '',
        cvv: '',
      }
    } else if (paymentMethod === 'transfer') {
      return {
        holderName: '',
        reference: '',
      }
    }
    return {}
  }

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(schema),
    defaultValues: getDefaultValues(),
  })

  const handleFormSubmit = (data: PaymentFormData) => {
    onSubmit(data)
  }

  const renderCreditCardForm = () => {
    return (
      <div className="space-y-6">
        <FormField
          control={form.control}
          name="cardNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número de Tarjeta</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    placeholder="1234 5678 9012 3456"
                    className="pl-10"
                    {...field}
                  />
                  <CreditCard className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cardholderName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Titular</FormLabel>
              <FormControl>
                <Input
                  placeholder="Nombre completo como aparece en la tarjeta"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="expiryMonth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mes</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="MM" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <SelectItem key={month} value={month.toString().padStart(2, '0')}>
                        {month.toString().padStart(2, '0')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="expiryYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Año</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="AAAA" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cvv"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CVV</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      placeholder="123"
                      className="pl-10"
                      {...field}
                    />
                    <LockIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
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
          tax={paypalData.tax}
          discount={paypalData.discount}
          onSuccess={onPayPalSuccess}
        />
      </div>
    )
  }

  const renderTransferForm = () => {
    return (
      <div className="space-y-6">
        <div className="p-6 border rounded-md bg-slate-50 mb-4">
          <h3 className="font-medium mb-2">Datos Bancarios:</h3>
          <p className="mb-1">
            <strong>Banco:</strong> Banco Lingowow
          </p>
          <p className="mb-1">
            <strong>IBAN:</strong> ES12 3456 7890 1234 5678 9012
          </p>
          <p className="mb-1">
            <strong>Titular:</strong> Lingowow S.L.
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            Realiza la transferencia e introduce los datos a continuación. Enviaremos tu producto
            una vez confirmado el pago.
          </p>
        </div>

        <FormField
          control={form.control}
          name="holderName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Ordenante</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="reference"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Referencia de la Transferencia</FormLabel>
              <FormControl>
                <Input
                  placeholder="Incluye la referencia que usaste en la transferencia"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)}>
        {paymentMethod === 'creditCard' && renderCreditCardForm()}
        {paymentMethod === 'paypal' && renderPayPalForm()}
        {paymentMethod === 'transfer' && renderTransferForm()}

        <div className="mt-8 text-center">
          <div className="flex items-center justify-center mb-6">
            <LockIcon className="h-4 w-4 mr-2 text-green-600" />
            <span className="text-sm text-muted-foreground">
              Pago 100% seguro con encriptación SSL
            </span>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading || form.formState.isSubmitting}>
            {isLoading || form.formState.isSubmitting ? 'Procesando...' : 'Finalizar Compra'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
