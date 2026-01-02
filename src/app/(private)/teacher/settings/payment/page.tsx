'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Loader2, CreditCard, Building2, Wallet, AlertCircle } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'

type PaymentMethod = 'bank_transfer' | 'paypal' | 'wise' | 'other'

interface PaymentSettings {
  paymentMethod: PaymentMethod
  bankName?: string
  bankAccountNumber?: string
  bankAccountType?: string
  bankAccountHolder?: string
  bankRoutingNumber?: string
  paypalEmail?: string
  wiseEmail?: string
  otherDetails?: string
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
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                settings.paymentMethod === 'bank_transfer'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <Building2 className={`h-8 w-8 ${settings.paymentMethod === 'bank_transfer' ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="text-sm font-medium">Transferencia</span>
            </button>
            <button
              onClick={() => handleChange('paymentMethod', 'paypal')}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                settings.paymentMethod === 'paypal'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <CreditCard className={`h-8 w-8 ${settings.paymentMethod === 'paypal' ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="text-sm font-medium">PayPal</span>
            </button>
            <button
              onClick={() => handleChange('paymentMethod', 'wise')}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                settings.paymentMethod === 'wise'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <Wallet className={`h-8 w-8 ${settings.paymentMethod === 'wise' ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="text-sm font-medium">Wise</span>
            </button>
            <button
              onClick={() => handleChange('paymentMethod', 'other')}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                settings.paymentMethod === 'other'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <CreditCard className={`h-8 w-8 ${settings.paymentMethod === 'other' ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="text-sm font-medium">Otro</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Bank Transfer Details */}
      {settings.paymentMethod === 'bank_transfer' && (
        <Card>
          <CardHeader>
            <CardTitle>Datos Bancarios</CardTitle>
            <CardDescription>
              Ingresa los datos de tu cuenta bancaria
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
                  placeholder="Ej: Banco de Crédito del Perú"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankAccountType">Tipo de Cuenta</Label>
                <Select
                  value={settings.bankAccountType || ''}
                  onValueChange={(value) => handleChange('bankAccountType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="savings">Cuenta de Ahorros</SelectItem>
                    <SelectItem value="checking">Cuenta Corriente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                <Label htmlFor="bankRoutingNumber">CCI / Código Interbancario</Label>
                <Input
                  id="bankRoutingNumber"
                  value={settings.bankRoutingNumber || ''}
                  onChange={(e) => handleChange('bankRoutingNumber', e.target.value)}
                  placeholder="Código interbancario (opcional)"
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

      {/* Wise Details */}
      {settings.paymentMethod === 'wise' && (
        <Card>
          <CardHeader>
            <CardTitle>Datos de Wise</CardTitle>
            <CardDescription>
              Ingresa tu correo electrónico de Wise
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="wiseEmail">Correo de Wise</Label>
              <Input
                id="wiseEmail"
                type="email"
                value={settings.wiseEmail || ''}
                onChange={(e) => handleChange('wiseEmail', e.target.value)}
                placeholder="tu-correo@ejemplo.com"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Other Payment Method */}
      {settings.paymentMethod === 'other' && (
        <Card>
          <CardHeader>
            <CardTitle>Otro Método de Pago</CardTitle>
            <CardDescription>
              Describe cómo prefieres recibir tus pagos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="otherDetails">Detalles del método de pago</Label>
              <Textarea
                id="otherDetails"
                value={settings.otherDetails || ''}
                onChange={(e) => handleChange('otherDetails', e.target.value)}
                placeholder="Describe el método de pago que prefieres y los datos necesarios..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
