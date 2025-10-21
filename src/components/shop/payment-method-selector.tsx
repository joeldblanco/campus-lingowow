'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Coins, CreditCard } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface PaymentMethodSelectorProps {
  acceptsCredits: boolean
  acceptsRealMoney: boolean
  creditPrice?: number | null
  realPrice: number
  userCredits: number
  onMethodChange: (method: 'credits' | 'money') => void
  selectedMethod?: 'credits' | 'money'
}

export function PaymentMethodSelector({
  acceptsCredits,
  acceptsRealMoney,
  creditPrice,
  realPrice,
  userCredits,
  onMethodChange,
  selectedMethod = 'money',
}: PaymentMethodSelectorProps) {
  const [method, setMethod] = useState<'credits' | 'money'>(selectedMethod)

  const handleChange = (value: string) => {
    const newMethod = value as 'credits' | 'money'
    setMethod(newMethod)
    onMethodChange(newMethod)
  }

  const hasEnoughCredits = creditPrice ? userCredits >= creditPrice : false

  // Si solo acepta un método, no mostrar selector
  if (!acceptsCredits && acceptsRealMoney) {
    return null
  }

  if (acceptsCredits && !acceptsRealMoney) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
            <Coins className="h-6 w-6 text-yellow-600" />
            <div>
              <p className="font-semibold">Pago con Créditos</p>
              <p className="text-sm text-muted-foreground">
                Este producto solo acepta créditos como método de pago
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <h3 className="font-semibold">Selecciona tu método de pago</h3>

          <RadioGroup value={method} onValueChange={handleChange}>
            {/* Opción de Dinero Real */}
            {acceptsRealMoney && (
              <div className="flex items-center space-x-2 p-4 border rounded-lg cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="money" id="money" />
                <Label htmlFor="money" className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5" />
                      <div>
                        <p className="font-medium">Dinero Real</p>
                        <p className="text-sm text-muted-foreground">Paga con PayPal o tarjeta</p>
                      </div>
                    </div>
                    <span className="font-bold text-lg">${realPrice}</span>
                  </div>
                </Label>
              </div>
            )}

            {/* Opción de Créditos */}
            {acceptsCredits && creditPrice && (
              <div
                className={`flex items-center space-x-2 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 ${
                  !hasEnoughCredits ? 'opacity-50' : ''
                }`}
              >
                <RadioGroupItem value="credits" id="credits" disabled={!hasEnoughCredits} />
                <Label
                  htmlFor="credits"
                  className={`flex-1 ${hasEnoughCredits ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Coins className="h-5 w-5 text-yellow-500" />
                      <div>
                        <p className="font-medium">Créditos</p>
                        <p className="text-sm text-muted-foreground">
                          Tienes {userCredits} créditos disponibles
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-lg text-yellow-600">{creditPrice}</span>
                      {!hasEnoughCredits && (
                        <Badge variant="destructive" className="ml-2 text-xs">
                          Insuficientes
                        </Badge>
                      )}
                    </div>
                  </div>
                </Label>
              </div>
            )}
          </RadioGroup>

          {method === 'credits' && !hasEnoughCredits && (
            <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">
                No tienes suficientes créditos. Necesitas {creditPrice! - userCredits} créditos más.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
