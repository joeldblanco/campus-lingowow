'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Loader2, CreditCard, Building2, Wallet, AlertCircle, Smartphone, Coins } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'

type PaymentMethod = 'bank_transfer' | 'binance' | 'paypal' | 'pago_movil'

interface PaymentSettings {
  paymentMethod: PaymentMethod
  // Bank Transfer
  bankName?: string
  bankAccountNumber?: string
  bankAccountHolder?: string
  bankRoutingNumber?: string
  // PayPal
  paypalEmail?: string
  // Binance
  binanceEmail?: string
  binanceId?: string
  // Pago Móvil
  pmBankName?: string
  pmPhoneNumber?: string
  pmIdNumber?: string // Cédula
}

export default function PaymentSettingsPage() {
  useSession() // Ensure user is authenticated
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState<PaymentSettings>({
    paymentMethod: 'bank_transfer',
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/teacher/payment-settings')
      if (response.ok) {
        const data = await response.json()
        if (data.settings) {
          setSettings(data.settings)
        }
      }
    } catch (error) {
      console.error('Error loading payment settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/teacher/payment-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        toast.success('Configuración de pagos guardada correctamente')
      } else {
        const data = await response.json()
        toast.error(data.error || 'Error al guardar la configuración')
      }
    } catch (error) {
      console.error('Error saving payment settings:', error)
      toast.error('Error al guardar la configuración')
    } finally {
      setIsSaving(false)
    }
  }

  const handleChange = (field: keyof PaymentSettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Configuración de Pagos</h1>
            <p className="text-muted-foreground">
              Configura cómo deseas recibir tus pagos
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Guardar
        </Button>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Esta información se utilizará para procesar tus pagos. Asegúrate de que los datos sean correctos.
        </AlertDescription>
      </Alert>

      {/* Payment Method Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Método de Pago</CardTitle>
          <CardDescription>
            Selecciona cómo prefieres recibir tus pagos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => handleChange('paymentMethod', 'bank_transfer')}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${settings.paymentMethod === 'bank_transfer'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
                }`}
            >
              <Building2 className={`h-8 w-8 ${settings.paymentMethod === 'bank_transfer' ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="text-sm font-medium text-center">Transferencia (Perú)</span>
            </button>

            <button
              onClick={() => handleChange('paymentMethod', 'binance')}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${settings.paymentMethod === 'binance'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
                }`}
            >
              <Coins className={`h-8 w-8 ${settings.paymentMethod === 'binance' ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="text-sm font-medium">Binance</span>
            </button>

            <button
              onClick={() => handleChange('paymentMethod', 'paypal')}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${settings.paymentMethod === 'paypal'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
                }`}
            >
              <Wallet className={`h-8 w-8 ${settings.paymentMethod === 'paypal' ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="text-sm font-medium">PayPal</span>
            </button>

            <button
              onClick={() => handleChange('paymentMethod', 'pago_movil')}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${settings.paymentMethod === 'pago_movil'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
                }`}
            >
              <Smartphone className={`h-8 w-8 ${settings.paymentMethod === 'pago_movil' ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="text-sm font-medium text-center">Pago Móvil (Venezuela)</span>
            </button>


          </div>
        </CardContent>
      </Card>

      {/* Bank Transfer Details (Peru) */}
      {settings.paymentMethod === 'bank_transfer' && (
        <Card>
          <CardHeader>
            <CardTitle>Cuenta Bancaria (Perú)</CardTitle>
            <CardDescription>
              Ingresa los datos de tu cuenta bancaria en Perú
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankName">Nombre del Banco</Label>
                <Input
                  id="bankName"
                  value={settings.bankName || ''}
                  onChange={(e) => handleChange('bankName', e.target.value)}
                  placeholder="Ej: BCP, Interbank..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankAccountHolder">Titular de la Cuenta</Label>
                <Input
                  id="bankAccountHolder"
                  value={settings.bankAccountHolder || ''}
                  onChange={(e) => handleChange('bankAccountHolder', e.target.value)}
                  placeholder="Nombre completo del titular"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankAccountNumber">Número de Cuenta</Label>
                <Input
                  id="bankAccountNumber"
                  value={settings.bankAccountNumber || ''}
                  onChange={(e) => handleChange('bankAccountNumber', e.target.value)}
                  placeholder="Número de cuenta bancaria"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankRoutingNumber">CCI (Código de Cuenta Interbancario)</Label>
                <Input
                  id="bankRoutingNumber"
                  value={settings.bankRoutingNumber || ''}
                  onChange={(e) => handleChange('bankRoutingNumber', e.target.value)}
                  placeholder="CCI (20 dígitos)"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Binance Details */}
      {settings.paymentMethod === 'binance' && (
        <Card>
          <CardHeader>
            <CardTitle>Datos de Binance</CardTitle>
            <CardDescription>
              Ingresa los datos de tu cuenta Binance (Binance Pay)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="binanceEmail">Correo de Binance / Pay ID</Label>
                <Input
                  id="binanceEmail"
                  value={settings.binanceEmail || ''}
                  onChange={(e) => handleChange('binanceEmail', e.target.value)}
                  placeholder="correo@ejemplo.com o Pay ID"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="binanceId">Binance ID (Opcional)</Label>
                <Input
                  id="binanceId"
                  value={settings.binanceId || ''}
                  onChange={(e) => handleChange('binanceId', e.target.value)}
                  placeholder="Tu User ID de Binance"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PayPal Details */}
      {settings.paymentMethod === 'paypal' && (
        <Card>
          <CardHeader>
            <CardTitle>Datos de PayPal</CardTitle>
            <CardDescription>
              Ingresa tu correo electrónico de PayPal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="paypalEmail">Correo de PayPal</Label>
              <Input
                id="paypalEmail"
                type="email"
                value={settings.paypalEmail || ''}
                onChange={(e) => handleChange('paypalEmail', e.target.value)}
                placeholder="tu-correo@ejemplo.com"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pago Móvil Details (Venezuela) */}
      {settings.paymentMethod === 'pago_movil' && (
        <Card>
          <CardHeader>
            <CardTitle>Pago Móvil (Venezuela)</CardTitle>
            <CardDescription>
              Ingresa los datos para recibir Pago Móvil
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pmBankName">Banco</Label>
                <Input
                  id="pmBankName"
                  value={settings.pmBankName || ''}
                  onChange={(e) => handleChange('pmBankName', e.target.value)}
                  placeholder="Ej: Banesco, Banco de Venezuela..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pmIdNumber">Cédula de Identidad</Label>
                <Input
                  id="pmIdNumber"
                  value={settings.pmIdNumber || ''}
                  onChange={(e) => handleChange('pmIdNumber', e.target.value)}
                  placeholder="V-12345678"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pmPhoneNumber">Número de Teléfono</Label>
              <Input
                id="pmPhoneNumber"
                value={settings.pmPhoneNumber || ''}
                onChange={(e) => handleChange('pmPhoneNumber', e.target.value)}
                placeholder="0414-1234567"
              />
            </div>
          </CardContent>
        </Card>
      )}


    </div>
  )
}
