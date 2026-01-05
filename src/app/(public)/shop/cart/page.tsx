'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/utils/shop'
import { useShopStore } from '@/stores/useShopStore'
import { CartItem } from '@/types/shop'
import { ShoppingBag, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'

export default function CartPage() {
  const { cart, removeFromCart } = useShopStore()
  const [promoCode, setPromoCode] = useState('')

  // Calcular subtotal
  const subtotal = cart.reduce((sum: number, item: CartItem) => sum + item.plan.price, 0)

  // Calcular impuestos (21% IVA)
  const taxes = subtotal * 0.21

  // Total
  const total = subtotal + taxes

  // Vaciar carrito
  const handleEmptyCart = () => {
    // Eliminar cada item del carrito
    cart.forEach((item: CartItem) => {
      removeFromCart(item.product.id, item.plan.id)
    })

    toast.success('Carrito vaciado con éxito')
  }

  // Función para aplicar código promocional (simulación)
  const handleApplyPromo = () => {
    toast.info(`Intentando aplicar código: ${promoCode}`)
    // Aquí implementarías la lógica real
    setPromoCode('')
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Tu Carrito</h1>

      {cart.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
            <ShoppingBag className="h-12 w-12 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Tu carrito está vacío</h2>
          <p className="text-muted-foreground mb-6">
            Explora nuestros cursos y productos para empezar a aprender
          </p>
          <Link href="/shop">
            <Button>Ver Productos</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Lista de productos */}
          <div className="md:col-span-2">
            <div className="space-y-4">
              {cart.map((item: CartItem) => (
                <Card key={`${item.product.id}-${item.plan.id}`}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">{item.product.title}</h3>
                        <p className="text-sm text-muted-foreground">{item.product.description}</p>
                        {item.plan.name && <p className="text-sm">Plan: {item.plan.name}</p>}
                      </div>
                      <div className="flex flex-col items-end">
                        <p className="font-bold">{formatCurrency(item.plan.price)}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2"
                          onClick={() => removeFromCart(item.product.id, item.plan.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <div className="text-right">
                <Button variant="outline" onClick={handleEmptyCart}>
                  Vaciar carrito
                </Button>
              </div>
            </div>
          </div>

          {/* Resumen del pedido */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Resumen del Pedido</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IVA (21%)</span>
                    <span>{formatCurrency(taxes)}</span>
                  </div>

                  <Separator />

                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>

                  <div className="pt-2">
                    <div className="flex gap-2 mb-4">
                      <input
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Código promocional"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                      />
                      <Button variant="outline" onClick={handleApplyPromo}>
                        Aplicar
                      </Button>
                    </div>
                  </div>

                  <Link href="/shop/cart/checkout" passHref>
                    <Button className="w-full">Finalizar Compra</Button>
                  </Link>

                  <div className="pt-2 text-center">
                    <Link href="/shop" className="text-sm text-primary hover:underline">
                      Continuar comprando
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
