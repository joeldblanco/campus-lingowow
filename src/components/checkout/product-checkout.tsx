'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ShoppingCart, Calendar, BookOpen, CreditCard } from 'lucide-react'
import { ScheduleSelector } from '@/components/schedule-selector'
import { processProductPurchase } from '@/lib/actions/schedule'
import { toast } from 'sonner'

interface Product {
  id: string
  name: string
  description: string
  price: number
  requiresScheduling: boolean
  courseId: string | null
  maxScheduleSlots: number
  scheduleDuration: number
  course?: {
    id: string
    title: string
    description: string
    level: string
  }
}

interface ProductCheckoutProps {
  product: Product
  userId: string
  onPurchaseComplete: (result: PurchaseData) => void
}

interface PurchaseData {
  purchase: {
    id: string;
    status: string;
    scheduledDate: Date | null;
  };
  scheduled: boolean;
  enrolled: boolean;
}

export function ProductCheckout({ product, userId, onPurchaseComplete }: ProductCheckoutProps) {
  const [currentStep, setCurrentStep] = useState<'schedule' | 'payment' | 'confirmation'>(
    'schedule'
  )
  const [selectedSlots, setSelectedSlots] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    // Si el producto no requiere programación, ir directo al pago
    if (!product.requiresScheduling) {
      setCurrentStep('payment')
    }
  }, [product.requiresScheduling])

  const handleSlotSelect = (slotId: string) => {
    setSelectedSlots((prev) => {
      if (prev.includes(slotId)) {
        return prev.filter((id) => id !== slotId)
      } else {
        return [...prev, slotId]
      }
    })
  }

  const handleScheduleConfirm = () => {
    if (product.requiresScheduling && selectedSlots.length === 0) {
      toast.error('Debes seleccionar al menos un horario')
      return
    }
    setCurrentStep('payment')
  }

  interface PurchaseResult {
    success: boolean;
    error?: string;
    data?: {
      purchase: {
        id: string;
        status: string;
        scheduledDate: Date | null;
      };
      scheduled: boolean;
      enrolled: boolean;
    };
  }

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      // Aquí integrarías con tu sistema de pagos (Stripe, PayPal, etc.)
      // Por ahora simulamos el proceso

      // Crear factura simulada
      const mockInvoiceId = `inv_${Date.now()}`;

      // Procesar la compra
      const result: PurchaseResult = await processProductPurchase({
        userId,
        productId: product.id,
        invoiceId: mockInvoiceId,
        selectedSlots,
      });

      if (result.success && result.data) {
        toast.success('¡Compra realizada exitosamente!');
        onPurchaseComplete(result.data);
        setCurrentStep('confirmation');
      } else {
        toast.error(result.error || 'Error al procesar la compra');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error inesperado al procesar el pago';
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }

  const renderScheduleStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Selecciona tu horario</h2>
        <p className="text-gray-600">
          Elige{' '}
          {product.maxScheduleSlots === 1
            ? 'un horario'
            : `hasta ${product.maxScheduleSlots} horarios`}{' '}
          para tu clase
        </p>
      </div>

      <ScheduleSelector
        productId={product.id}
        duration={product.scheduleDuration}
        maxSlots={product.maxScheduleSlots}
        onSlotSelect={handleSlotSelect}
        selectedSlots={selectedSlots}
      />

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => window.history.back()}>
          Volver
        </Button>
        <Button
          onClick={handleScheduleConfirm}
          disabled={product.requiresScheduling && selectedSlots.length === 0}
        >
          Continuar al pago
        </Button>
      </div>
    </div>
  )

  const renderPaymentStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Confirmar compra</h2>
        <p className="text-gray-600">Revisa los detalles de tu compra</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Resumen de compra
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold">{product.name}</h3>
              <p className="text-sm text-gray-600">{product.description}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg">${product.price}</p>
            </div>
          </div>

          {product.requiresScheduling && selectedSlots.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4" />
                  Horarios seleccionados
                </h4>
                <div className="space-y-1">
                  {selectedSlots.map((slotId, index) => (
                    <Badge key={slotId} variant="secondary">
                      Horario {index + 1}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {product.course && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <BookOpen className="h-4 w-4" />
                  Inscripción automática
                </h4>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm text-green-800">
                    Serás inscrito automáticamente en: <strong>{product.course.title}</strong>
                  </p>
                  <p className="text-xs text-green-600 mt-1">Nivel: {product.course.level}</p>
                </div>
              </div>
            </>
          )}

          <Separator />
          <div className="flex justify-between items-center font-bold text-lg">
            <span>Total:</span>
            <span>${product.price}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(product.requiresScheduling ? 'schedule' : 'schedule')}
        >
          Volver
        </Button>
        <Button onClick={handlePayment} disabled={isProcessing} className="flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          {isProcessing ? 'Procesando...' : 'Pagar ahora'}
        </Button>
      </div>
    </div>
  )

  const renderConfirmationStep = () => (
    <div className="space-y-6 text-center">
      <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
        <svg
          className="w-8 h-8 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-green-600 mb-2">¡Compra exitosa!</h2>
        <p className="text-gray-600">Tu compra ha sido procesada correctamente.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3 text-left">
            <p>
              <strong>Producto:</strong> {product.name}
            </p>
            {product.requiresScheduling && (
              <p>
                <strong>Horarios reservados:</strong> {selectedSlots.length}
              </p>
            )}
            {product.course && (
              <p>
                <strong>Inscrito en:</strong> {product.course.title}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <p className="text-sm text-gray-600">
          Recibirás un correo de confirmación con todos los detalles.
        </p>
        <Button onClick={() => (window.location.href = '/dashboard')}>Ir al dashboard</Button>
      </div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Indicador de progreso */}
      <div className="mb-8">
        <div className="flex items-center justify-center space-x-4">
          {product.requiresScheduling && (
            <>
              <div
                className={`flex items-center ${currentStep === 'schedule' ? 'text-blue-600' : 'text-gray-400'}`}
              >
                <Calendar className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium">Horario</span>
              </div>
              <div className="h-px bg-gray-300 w-8"></div>
            </>
          )}
          <div
            className={`flex items-center ${currentStep === 'payment' ? 'text-blue-600' : 'text-gray-400'}`}
          >
            <CreditCard className="h-5 w-5 mr-2" />
            <span className="text-sm font-medium">Pago</span>
          </div>
          <div className="h-px bg-gray-300 w-8"></div>
          <div
            className={`flex items-center ${currentStep === 'confirmation' ? 'text-green-600' : 'text-gray-400'}`}
          >
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="text-sm font-medium">Confirmación</span>
          </div>
        </div>
      </div>

      {/* Contenido del paso actual */}
      {currentStep === 'schedule' && renderScheduleStep()}
      {currentStep === 'payment' && renderPaymentStep()}
      {currentStep === 'confirmation' && renderConfirmationStep()}
    </div>
  )
}
