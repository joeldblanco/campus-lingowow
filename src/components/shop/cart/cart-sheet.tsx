'use client'

import { ShoppingCart, X, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { useShopStore } from '@/stores/useShopStore'
import Link from 'next/link'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

export function CartSheet() {
  const { cart, removeFromCart } = useShopStore()
  const totalPrice = cart.reduce((sum, item) => sum + item.plan.price, 0)

  // Añadimos una función para limpiar todo el carrito
  const clearCart = () => {
    // Asumimos que necesitamos llamar a removeFromCart para cada item
    cart.forEach((item) => removeFromCart(item.product.id, item.plan.id))
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <ShoppingCart className="h-5 w-5" />
          {cart.length > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
              {cart.length}
            </Badge>
          )}
          <span className="sr-only">Open cart</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[350px] sm:w-[450px] p-6">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle>Tu carrito</SheetTitle>
            {cart.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCart}
                className="text-red-500 hover:text-red-700 hover:bg-red-50 flex gap-1 text-xs"
              >
                <Trash2 className="h-4 w-4" />
                Vaciar carrito
              </Button>
            )}
          </div>
        </SheetHeader>
        <Separator className="my-4" />
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Tu carrito está vacío</h3>
            <p className="mt-2 text-sm text-muted-foreground text-center px-8">
              Añade productos a tu carrito para comenzar.
            </p>
            <Link href={'/shop/cart'}>
              <Button className="mt-6">Ver Tienda</Button>
            </Link>
          </div>
        ) : (
          <>
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-6">
                {cart.map((item) => (
                  <div
                    key={`${item.product.id}-${item.plan.id}`}
                    className="flex justify-between items-start pb-4 group"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium">{item.product.title}</h3>
                      <p className="text-sm text-muted-foreground">Plan: {item.plan.name}</p>
                      <p className="font-medium mt-1 text-primary">${item.plan.price.toFixed(2)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFromCart(item.product.id, item.plan.id)}
                      className="opacity-60 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Remove</span>
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <SheetFooter className="flex-col mt-6 sm:mt-auto">
              <Separator className="mb-4" />
              <div className="w-full space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-medium text-lg">
                  <span>Total</span>
                  <span className="text-primary">${totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Link href="/shop/cart" className="flex-1">
                    <Button variant="outline" className="w-full">
                      Ver Carrito
                    </Button>
                  </Link>
                  <Link href="/shop/cart/checkout" className="flex-1">
                    <Button className="w-full">Checkout</Button>
                  </Link>
                </div>
              </div>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
