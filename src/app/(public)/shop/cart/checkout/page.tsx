'use client'

import { OrderSummary } from '@/components/shop/checkout/order-summary'
import { PaymentMethodForm } from '@/components/shop/checkout/payment-method-form'
import { PersonalInfoForm } from '@/components/shop/checkout/personal-info-form'
import { InlineAuthForm } from '@/components/shop/checkout/inline-auth-form'
import { ScheduleCalendarSelector } from '@/components/checkout/schedule-calendar-selector'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useShopStore } from '@/stores/useShopStore'
import { CheckIcon, Loader2, AlertCircle } from 'lucide-react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { PayPalScriptProvider } from '@paypal/react-paypal-js'

// Constante para los cálculos financieros
const TAX_RATE = 0.07 // 7% de impuestos - ajusta según tus requerimientos

interface ScheduleSlot {
  teacherId: string
  dayOfWeek: number
  startTime: string
  endTime: string
}

interface ProrationResult {
  planId: string
  planName: string
  originalPrice: number
  proratedPrice: number
  classesFromNow: number
  totalClassesInFullPeriod: number
  classesPerWeek: number
  periodStart: string
  periodEnd: string
  enrollmentStart: string
  daysRemaining: number
  weeksRemaining: number
  allowProration: boolean
  schedule: ScheduleSlot[]
}

interface PlanDetails {
  id: string
  includesClasses: boolean
  courseId: string | null
  classesPerWeek: number | null
  duration: number // Duración de cada clase en minutos
}

export default function CheckoutPage() {
  const router = useRouter()
  const { data: session, status: authStatus } = useSession()
  const [step, setStep] = useState<number>(0) // 0: auth, 1: personal info, 1.5: schedule (si aplica), 2: payment
  const [paymentMethod, setPaymentMethod] = useState<string>('creditCard')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true)
  const [loadingPlans, setLoadingPlans] = useState<boolean>(true)
  
  // Estado para horarios y prorrateo
  const [scheduleSelections, setScheduleSelections] = useState<Record<string, {
    schedule: ScheduleSlot[]
    proration: ProrationResult
  }>>({})
  
  // Estado para detalles de planes
  const [planDetails, setPlanDetails] = useState<Record<string, PlanDetails>>({})

  // Obtenemos los items del carrito desde el store
  const cartItems = useShopStore((state) => state.cart)
  
  // Verificar si algún plan requiere selección de horario
  const plansRequiringSchedule = useMemo(() => {
    return cartItems.filter(item => {
      const details = planDetails[item.plan.id]
      return details?.includesClasses && details?.courseId
    })
  }, [cartItems, planDetails])
  
  const requiresScheduleSelection = plansRequiringSchedule.length > 0
  
  // Verificar si todos los planes requeridos tienen horario seleccionado
  const allSchedulesSelected = useMemo(() => {
    if (!requiresScheduleSelection) return true
    return plansRequiringSchedule.every(item => {
      return scheduleSelections[item.plan.id]?.schedule?.length > 0
    })
  }, [plansRequiringSchedule, scheduleSelections, requiresScheduleSelection])

  // Cargar detalles de los planes al montar
  useEffect(() => {
    const loadPlanDetails = async () => {
      setLoadingPlans(true)
      const details: Record<string, PlanDetails> = {}
      
      for (const item of cartItems) {
        try {
          const response = await fetch(`/api/plans/${item.plan.id}`)
          if (response.ok) {
            const plan = await response.json()
            details[item.plan.id] = {
              id: plan.id,
              includesClasses: plan.includesClasses || false,
              courseId: plan.courseId || null,
              classesPerWeek: plan.classesPerWeek || null,
              duration: 40, // Por defecto 40 minutos, puedes agregar este campo al plan si lo necesitas
            }
          }
        } catch (error) {
          console.error(`Error loading plan ${item.plan.id}:`, error)
        }
      }
      
      setPlanDetails(details)
      setLoadingPlans(false)
    }
    
    if (cartItems.length > 0) {
      loadPlanDetails()
    }
  }, [cartItems])

  // Cuando se complete la carga de la sesión, decidimos qué hacer
  useEffect(() => {
    if (authStatus !== 'loading') {
      // SIEMPRE requerimos autenticación para el checkout (necesario para PayPal)
      if (authStatus === 'unauthenticated') {
        setStep(0)
      } else {
        // Si hay sesión, avanzamos al paso 1
        setStep(1)
      }
      setCheckingAuth(false)
    }
  }, [authStatus])

  // Calculamos los totales usando useMemo para optimizar rendimiento (con prorrateo)
  const { products, subtotal, taxes, discount, total } = useMemo(() => {
    // Transformamos los CartItems a OrderSummaryProducts para el componente OrderSummary
    const orderSummaryProducts = cartItems.map((item) => {
      // Usar precio prorrateado si existe
      const proration = scheduleSelections[item.plan.id]?.proration
      const price = proration?.proratedPrice ?? item.plan.price
      
      return {
        id: item.product.id,
        name: item.product.title,
        description: item.cartItemDescription || item.product.description || item.plan.name,
        price,
        quantity: item.quantity || 1,
      }
    })

    // Calculamos el subtotal sumando todos los precios (con prorrateo si aplica)
    const subtotalAmount = cartItems.reduce((sum, item) => {
      const proration = scheduleSelections[item.plan.id]?.proration
      const price = proration?.proratedPrice ?? item.plan.price
      return sum + price * (item.quantity || 1)
    }, 0)

    // Calculamos impuestos
    const taxesAmount = subtotalAmount * TAX_RATE

    // Por ahora no hay descuento
    const discountAmount = 0

    // Total final
    const totalAmount = subtotalAmount + taxesAmount - discountAmount

    return {
      products: orderSummaryProducts,
      subtotal: subtotalAmount,
      taxes: taxesAmount,
      discount: discountAmount,
      total: totalAmount,
    }
  }, [cartItems, scheduleSelections])

  const handleSubmitPersonalInfo = () => {
    // Si requiere selección de horario, ir al paso 1.5, sino al paso 2
    if (requiresScheduleSelection) {
      setStep(1.5)
    } else {
      setStep(2)
    }
  }
  
  const handleScheduleSelected = (planId: string, schedule: ScheduleSlot[], proration: ProrationResult) => {
    setScheduleSelections(prev => ({
      ...prev,
      [planId]: { schedule, proration }
    }))
  }
  
  const handleContinueToPayment = () => {
    if (!allSchedulesSelected) {
      toast.error('Debes seleccionar un horario para todos los planes que incluyen clases')
      return
    }
    setStep(2)
  }

  const handlePaymentSubmit = () => {
    // Si es PayPal, no hacemos nada aquí, el botón de PayPal maneja el proceso
    if (paymentMethod === 'paypal') {
      return
    }

    setIsLoading(true)

    // Preparamos los datos del pedido
    const orderData = {
      orderNumber: `ORD-${Date.now().toString().slice(-8)}`,
      orderDate: new Date().toISOString(),
      totalAmount: total,
      items: cartItems,
      customer: JSON.parse(sessionStorage.getItem('customer-info') || '{}'),
      paymentMethod: paymentMethod,
      user: session?.user ? { id: session.user.id, email: session.user.email } : undefined,
    }

    // Guardamos en sessionStorage para la página de confirmación
    sessionStorage.setItem('last-order', JSON.stringify(orderData))

    // Simulación de procesamiento de pago
    setTimeout(() => {
      setIsLoading(false)
      // Limpiamos el carrito
      useShopStore.getState().clearCart()

      toast.success('¡Pago procesado correctamente!')
      // Redirigir a página de confirmación
      router.push('/shop/cart/checkout/confirmation')
    }, 2000)
  }

  const handlePayPalSuccess = (data: unknown) => {
    const paypalData = data as { invoice: { invoiceNumber: string } }
    
    // Preparamos los datos del pedido
    const orderData = {
      orderNumber: paypalData.invoice.invoiceNumber,
      orderDate: new Date().toISOString(),
      totalAmount: total,
      items: cartItems,
      customer: JSON.parse(sessionStorage.getItem('customer-info') || '{}'),
      paymentMethod: 'paypal',
      user: session?.user ? { id: session.user.id, email: session.user.email } : undefined,
      paypalData: data,
    }

    // Guardamos en sessionStorage para la página de confirmación
    sessionStorage.setItem('last-order', JSON.stringify(orderData))

    // Limpiamos el carrito
    useShopStore.getState().clearCart()

    // Pequeño delay para que PayPal cierre la ventana antes de redirigir
    setTimeout(() => {
      router.push('/shop/cart/checkout/confirmation')
    }, 500)
  }

  // Si el carrito está vacío, redirigimos a la página del carrito
  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-3xl font-bold mb-4">Tu carrito está vacío</h1>
        <p className="mb-6">Debes agregar productos al carrito antes de proceder al checkout.</p>
        <Button onClick={() => router.push('/shop')}>Ir a la Tienda</Button>
      </div>
    )
  }

  // Mientras verificamos la autenticación
  if (checkingAuth) {
    return (
      <div className="container mx-auto py-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="mt-4">Verificando información de sesión...</p>
      </div>
    )
  }

  // Paso 0: Verificación de autenticación
  if (step === 0) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Finalizar Compra</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div>
            <InlineAuthForm
              onSuccess={() => {
                // Cuando el login/registro sea exitoso, el useEffect detectará
                // el cambio en authStatus y avanzará automáticamente al paso 1
              }}
            />
            
            <div className="mt-4 text-center">
              <Button variant="ghost" onClick={() => router.push('/shop')}>
                ← Volver a la tienda
              </Button>
            </div>
          </div>

          <div>
            <OrderSummary
              products={products}
              subtotal={subtotal}
              taxes={taxes}
              discount={discount}
              total={total}
            />
          </div>
        </div>
      </div>
    )
  }

  const paypalItems = cartItems.map((item) => {
    const selection = scheduleSelections[item.plan.id]
    const proration = selection?.proration
    const price = proration?.proratedPrice ?? item.plan.price
    
    return {
      productId: item.product.id,
      planId: item.plan.id,
      name: item.product.title,
      description: item.cartItemDescription || item.product.description || item.plan.name,
      price,
      quantity: item.quantity || 1,
      selectedSchedule: selection?.schedule,
      proratedClasses: proration?.classesFromNow,
      proratedPrice: proration?.proratedPrice,
    }
  })

  return (
    <PayPalScriptProvider
      options={{
        clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
        currency: 'USD',
      }}
    >
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Finalizar Compra</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'} flex items-center justify-center text-white mr-2`}
                    >
                      {step > 1 ? <CheckIcon size={16} /> : 1}
                    </div>
                    <span className="font-medium text-sm">Info Personal</span>
                  </div>
                  
                  {requiresScheduleSelection && (
                    <div className="flex items-center">
                      <div
                        className={`w-8 h-8 rounded-full ${step >= 1.5 ? 'bg-primary' : 'bg-muted'} flex items-center justify-center text-white mr-2`}
                      >
                        {step > 1.5 ? <CheckIcon size={16} /> : 2}
                      </div>
                      <span className="font-medium text-sm">Horario</span>
                    </div>
                  )}
                  
                  <div className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'} flex items-center justify-center text-white mr-2`}
                    >
                      {step > 2 ? <CheckIcon size={16} /> : requiresScheduleSelection ? 3 : 2}
                    </div>
                    <span className="font-medium text-sm">Pago</span>
                  </div>
                  
                  <div className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full ${step >= 3 ? 'bg-primary' : 'bg-muted'} flex items-center justify-center text-white mr-2`}
                    >
                      {requiresScheduleSelection ? 4 : 3}
                    </div>
                    <span className="font-medium text-sm">Confirmación</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {step === 1 && <PersonalInfoForm onSubmit={handleSubmitPersonalInfo} />}

                {step === 1.5 && (
                  <div className="space-y-6">
                    <div>
                      <CardTitle className="mb-2">Selecciona tu Horario de Clases</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Elige los días y horarios que mejor se adapten a tu disponibilidad. El precio se ajustará automáticamente según las clases restantes en el período académico actual.
                      </p>
                    </div>

                    {loadingPlans ? (
                      <div className="py-12 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                        <p className="text-muted-foreground">Cargando información de planes...</p>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {plansRequiringSchedule.map((item) => {
                          const details = planDetails[item.plan.id]
                          if (!details?.courseId || !details?.classesPerWeek) return null

                          return (
                            <div key={item.plan.id} className="space-y-4">
                              <div className="border-b pb-2">
                                <h3 className="font-semibold text-lg">{item.product.title}</h3>
                                <p className="text-sm text-muted-foreground">{item.plan.name}</p>
                              </div>
                              
                              <ScheduleCalendarSelector
                                planId={item.plan.id}
                                courseId={details.courseId}
                                classesPerWeek={details.classesPerWeek}
                                classDuration={details.duration}
                                onScheduleSelected={(schedule: ScheduleSlot[], proration: ProrationResult) => 
                                  handleScheduleSelected(item.plan.id, schedule, proration)
                                }
                              />
                            </div>
                          )
                        })}

                        {!allSchedulesSelected && (
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              Debes seleccionar un horario para cada curso antes de continuar al pago.
                            </AlertDescription>
                          </Alert>
                        )}

                        <div className="flex gap-4">
                          <Button variant="outline" onClick={() => setStep(1)}>
                            Volver
                          </Button>
                          <Button 
                            onClick={handleContinueToPayment}
                            disabled={!allSchedulesSelected}
                            className="flex-1"
                          >
                            Continuar al Pago
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {step === 2 && (
                  <div>
                    <CardTitle className="mb-4">Método de Pago</CardTitle>
                    <RadioGroup
                      value={paymentMethod}
                      onValueChange={setPaymentMethod}
                      className="mb-6"
                    >
                      <div className="flex items-center space-x-2 border p-4 rounded-md mb-2">
                        <RadioGroupItem value="creditCard" id="creditCard" />
                        <Label htmlFor="creditCard">Tarjeta de Crédito/Débito</Label>
                      </div>
                      <div className="flex items-center space-x-2 border p-4 rounded-md mb-2">
                        <RadioGroupItem value="paypal" id="paypal" />
                        <Label htmlFor="paypal">PayPal</Label>
                      </div>
                      <div className="flex items-center space-x-2 border p-4 rounded-md">
                        <RadioGroupItem value="transfer" id="transfer" />
                        <Label htmlFor="transfer">Transferencia Bancaria</Label>
                      </div>
                    </RadioGroup>

                    <PaymentMethodForm
                      paymentMethod={paymentMethod}
                      onSubmit={handlePaymentSubmit}
                      isLoading={isLoading}
                      paypalData={{
                        items: paypalItems,
                        total,
                        subtotal,
                        tax: taxes,
                        discount,
                      }}
                      onPayPalSuccess={handlePayPalSuccess}
                    />

                    <div className="mt-6">
                      <Button 
                        variant="outline" 
                        onClick={() => setStep(requiresScheduleSelection ? 1.5 : 1)}
                      >
                        Volver
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-1">
            <OrderSummary
              products={products}
              subtotal={subtotal}
              taxes={taxes}
              discount={discount}
              total={total}
            />

            <div className="mt-4">
              <Link href={'/shop'}>
                <Button variant="outline" className="w-full">
                  Volver a la Tienda
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PayPalScriptProvider>
  )
}
