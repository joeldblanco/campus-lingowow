import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CreditCard, LockIcon } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'

interface PaymentMethodFormProps {
  paymentMethod: string
  onSubmit: () => void
  isLoading: boolean
}

const creditCardSchema = z.object({
  cardNumber: z.string().regex(/^\d{16}$/, 'El número de tarjeta debe tener 16 dígitos'),
  cardholderName: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  expiryMonth: z.string().min(1, 'Selecciona un mes'),
  expiryYear: z.string().min(1, 'Selecciona un año'),
  cvv: z.string().regex(/^\d{3,4}$/, 'El CVV debe tener 3 o 4 dígitos'),
})

const transferSchema = z.object({
  holderName: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  reference: z.string().min(6, 'La referencia debe tener al menos 6 caracteres'),
})

export function PaymentMethodForm({ paymentMethod, onSubmit, isLoading }: PaymentMethodFormProps) {
  const [creditCardData, setCreditCardData] = useState({
    cardNumber: '',
    cardholderName: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
  })

  const [transferData, setTransferData] = useState({
    holderName: '',
    reference: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleCreditCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setCreditCardData((prevData) => ({
      ...prevData,
      [name]: value,
    }))

    // Limpiar el error para este campo cuando el usuario escribe
    if (errors[name]) {
      setErrors((prevErrors) => {
        const newErrors = { ...prevErrors }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    setCreditCardData((prevData) => ({
      ...prevData,
      [name]: value,
    }))

    // Limpiar el error para este campo cuando el usuario selecciona
    if (errors[name]) {
      setErrors((prevErrors) => {
        const newErrors = { ...prevErrors }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleTransferChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setTransferData((prevData) => ({
      ...prevData,
      [name]: value,
    }))

    // Limpiar el error para este campo cuando el usuario escribe
    if (errors[name]) {
      setErrors((prevErrors) => {
        const newErrors = { ...prevErrors }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const validateForm = (): boolean => {
    try {
      if (paymentMethod === 'creditCard') {
        creditCardSchema.parse(creditCardData)
      } else if (paymentMethod === 'transfer') {
        transferSchema.parse(transferData)
      }
      setErrors({})
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {}
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message
          }
        })
        setErrors(newErrors)
      }
      return false
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (validateForm()) {
      onSubmit()
    }
  }

  const renderCreditCardForm = () => {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="cardNumber">Número de Tarjeta</Label>
          <div className="relative">
            <Input
              id="cardNumber"
              name="cardNumber"
              value={creditCardData.cardNumber}
              onChange={handleCreditCardChange}
              className={`pl-10 ${errors.cardNumber ? 'border-red-500' : ''}`}
              placeholder="1234 5678 9012 3456"
            />
            <CreditCard className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          </div>
          {errors.cardNumber && <p className="text-red-500 text-sm">{errors.cardNumber}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cardholderName">Nombre del Titular</Label>
          <Input
            id="cardholderName"
            name="cardholderName"
            value={creditCardData.cardholderName}
            onChange={handleCreditCardChange}
            className={errors.cardholderName ? 'border-red-500' : ''}
            placeholder="Nombre completo como aparece en la tarjeta"
          />
          {errors.cardholderName && <p className="text-red-500 text-sm">{errors.cardholderName}</p>}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="expiryMonth">Mes</Label>
            <Select
              value={creditCardData.expiryMonth}
              onValueChange={(value) => handleSelectChange('expiryMonth', value)}
            >
              <SelectTrigger
                id="expiryMonth"
                className={errors.expiryMonth ? 'border-red-500' : ''}
              >
                <SelectValue placeholder="MM" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <SelectItem key={month} value={month.toString().padStart(2, '0')}>
                    {month.toString().padStart(2, '0')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.expiryMonth && <p className="text-red-500 text-sm">{errors.expiryMonth}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="expiryYear">Año</Label>
            <Select
              value={creditCardData.expiryYear}
              onValueChange={(value) => handleSelectChange('expiryYear', value)}
            >
              <SelectTrigger id="expiryYear" className={errors.expiryYear ? 'border-red-500' : ''}>
                <SelectValue placeholder="AAAA" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.expiryYear && <p className="text-red-500 text-sm">{errors.expiryYear}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cvv">CVV</Label>
            <div className="relative">
              <Input
                id="cvv"
                name="cvv"
                value={creditCardData.cvv}
                onChange={handleCreditCardChange}
                className={`pl-10 ${errors.cvv ? 'border-red-500' : ''}`}
                placeholder="123"
              />
              <LockIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            </div>
            {errors.cvv && <p className="text-red-500 text-sm">{errors.cvv}</p>}
          </div>
        </div>
      </div>
    )
  }

  const renderPayPalForm = () => {
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

        <div className="space-y-2">
          <Label htmlFor="holderName">Nombre del Ordenante</Label>
          <Input
            id="holderName"
            name="holderName"
            value={transferData.holderName}
            onChange={handleTransferChange}
            className={errors.holderName ? 'border-red-500' : ''}
          />
          {errors.holderName && <p className="text-red-500 text-sm">{errors.holderName}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="reference">Referencia de la Transferencia</Label>
          <Input
            id="reference"
            name="reference"
            value={transferData.reference}
            onChange={handleTransferChange}
            className={errors.reference ? 'border-red-500' : ''}
            placeholder="Incluye la referencia que usaste en la transferencia"
          />
          {errors.reference && <p className="text-red-500 text-sm">{errors.reference}</p>}
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
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
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Procesando...' : 'Finalizar Compra'}
        </Button>
      </div>
    </form>
  )
}
