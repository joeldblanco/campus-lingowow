'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Coins, Gift, CreditCard } from 'lucide-react'
import { toast } from 'sonner'

interface CreditPackage {
  id: string
  name: string
  description: string | null
  credits: number
  price: number
  bonusCredits: number
}

interface CreditCheckoutFormProps {
  package: CreditPackage
}

export function CreditCheckoutForm({ package: pkg }: CreditCheckoutFormProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  const totalCredits = pkg.credits + pkg.bonusCredits

  const handlePayPalPayment = async () => {
    setIsProcessing(true)
    try {
      // Crear orden en PayPal
      const response = await fetch('/api/paypal/create-credit-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: pkg.id }),
      })

      if (!response.ok) {
        throw new Error('Error al crear la orden')
      }

      const { orderID } = await response.json()

      // Redirigir a PayPal
      window.location.href = `https://www.paypal.com/checkoutnow?token=${orderID}`
    } catch (error) {
      console.error('Error processing payment:', error)
      toast.error('Error al procesar el pago')
      setIsProcessing(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Resumen del Paquete */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Resumen del Paquete</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-2xl font-bold">{pkg.name}</h3>
              {pkg.description && (
                <p className="text-sm text-muted-foreground mt-1">{pkg.description}</p>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-yellow-500" />
                  <span>Créditos base</span>
                </div>
                <span className="font-semibold">{pkg.credits}</span>
              </div>

              {pkg.bonusCredits > 0 && (
                <div className="flex items-center justify-between text-green-600">
                  <div className="flex items-center gap-2">
                    <Gift className="h-5 w-5" />
                    <span>Créditos bonus</span>
                  </div>
                  <span className="font-semibold">+{pkg.bonusCredits}</span>
                </div>
              )}
            </div>

            <Separator />

            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">Total de créditos:</span>
                <span className="text-2xl font-bold">{totalCredits}</span>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between text-xl">
              <span className="font-semibold">Total a pagar:</span>
              <span className="font-bold">${pkg.price} USD</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Métodos de Pago */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Método de Pago</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <Button
                className="w-full h-14 text-lg"
                onClick={handlePayPalPayment}
                disabled={isProcessing}
              >
                <CreditCard className="h-5 w-5 mr-2" />
                {isProcessing ? 'Procesando...' : 'Pagar con PayPal'}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Serás redirigido a PayPal para completar tu pago de forma segura
              </p>
            </div>

            <Separator />

            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg space-y-2">
              <h4 className="font-semibold text-sm">Pago 100% Seguro</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Encriptación SSL</li>
                <li>• Procesado por PayPal</li>
                <li>• Tus datos están protegidos</li>
              </ul>
            </div>

            <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg space-y-2">
              <h4 className="font-semibold text-sm">Después del pago:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Los créditos se agregarán automáticamente a tu cuenta</li>
                <li>• Recibirás un correo de confirmación</li>
                <li>• Podrás usar tus créditos inmediatamente</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
