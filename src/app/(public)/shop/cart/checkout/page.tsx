'use client'

import { OrderSummary } from '@/components/shop/checkout/order-summary'
import { PaymentMethodForm } from '@/components/shop/checkout/payment-method-form'
import { PersonalInfoForm } from '@/components/shop/checkout/personal-info-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useShopStore } from '@/stores/useShopStore'
import { CheckIcon, Loader2 } from 'lucide-react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

// Constante para los cálculos financieros
const TAX_RATE = 0.07 // 7% de impuestos - ajusta según tus requerimientos

export default function CheckoutPage() {
  const router = useRouter()
  const { data: session, status: authStatus } = useSession()
  const [step, setStep] = useState<number>(0) // Empezamos en 0 para verificar auth
  const [paymentMethod, setPaymentMethod] = useState<string>('creditCard')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true)

  // Obtenemos los items del carrito desde el store
  const cartItems = useShopStore((state) => state.cart)

  // Verificamos si hay cursos en el carrito
  const hasCourses = useMemo(
    () => cartItems.some((item) => item.product.type === 'course'),
    [cartItems]
  )

  // Cuando se complete la carga de la sesión, decidimos qué hacer
  useEffect(() => {
    if (authStatus !== 'loading') {
      // Si hay cursos y no hay sesión, nos quedamos en el paso 0
      if (hasCourses && authStatus === 'unauthenticated') {
        setStep(0)
      } else {
        // Si no hay cursos o hay sesión, avanzamos al paso 1
        setStep(1)
      }
      setCheckingAuth(false)
    }
  }, [authStatus, hasCourses])

  // Calculamos los totales usando useMemo para optimizar rendimiento
  const { products, subtotal, taxes, discount, total } = useMemo(() => {
    // Transformamos los CartItems a OrderSummaryProducts para el componente OrderSummary
    const orderSummaryProducts = cartItems.map((item) => ({
      id: item.product.id,
      name: item.product.title,
      description: item.cartItemDescription || item.product.description || item.plan.name,
      price: item.plan.price,
      quantity: item.quantity || 1,
    }))

    // Calculamos el subtotal sumando todos los precios
    const subtotalAmount = cartItems.reduce(
      (sum, item) => sum + item.plan.price * (item.quantity || 1),
      0
    )

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
  }, [cartItems])

  const handleSubmitPersonalInfo = () => {
    setStep(2)
  }

  const handlePaymentSubmit = () => {
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

        <Card className="max-w-md mx-auto mb-8">
          <CardHeader>
            <CardTitle>Inicio de sesión requerido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-6">
              Tu carrito contiene cursos que requieren una cuenta en nuestra plataforma para acceder
              a los materiales de aprendizaje.
            </p>
            <div className="space-y-4">
              <Button
                className="w-full"
                onClick={() => {
                  // Guardamos la intención de checkout para redireccionar después
                  useShopStore.getState().setCheckoutInfo({ redirectAfterAuth: true })
                  router.push('/auth/login?redirect=/checkout')
                }}
              >
                Iniciar sesión
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  // Guardamos la intención de checkout para redireccionar después
                  useShopStore.getState().setCheckoutInfo({ redirectAfterAuth: true })
                  router.push('/auth/register?redirect=/checkout')
                }}
              >
                Crear cuenta
              </Button>

              <Button variant="ghost" className="w-full" onClick={() => router.push('/shop')}>
                Volver a la tienda
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="max-w-md mx-auto">
          <OrderSummary
            products={products}
            subtotal={subtotal}
            taxes={taxes}
            discount={discount}
            total={total}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Finalizar Compra</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'} flex items-center justify-center text-white mr-2`}
                  >
                    {step > 1 ? <CheckIcon size={16} /> : 1}
                  </div>
                  <span className="font-medium">Información Personal</span>
                </div>
                <div className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'} flex items-center justify-center text-white mr-2`}
                  >
                    {step > 2 ? <CheckIcon size={16} /> : 2}
                  </div>
                  <span className="font-medium">Pago</span>
                </div>
                <div className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full ${step >= 3 ? 'bg-primary' : 'bg-muted'} flex items-center justify-center text-white mr-2`}
                  >
                    3
                  </div>
                  <span className="font-medium">Confirmación</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {step === 1 && <PersonalInfoForm onSubmit={handleSubmitPersonalInfo} />}

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
                  />

                  <div className="mt-6">
                    <Button variant="outline" onClick={() => setStep(1)}>
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
  )
}
