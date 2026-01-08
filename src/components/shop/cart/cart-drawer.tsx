'use client'

import { ShoppingCart, Trash2, ArrowRight, Globe } from 'lucide-react'
import { SUPPORTED_LANGUAGES } from '@/lib/constants/languages'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { useShopStore } from '@/stores/useShopStore'
import Link from 'next/link'
import { Separator } from '@/components/ui/separator'
import Image from 'next/image'
import { Course, Merge, Product } from '@/types/shop'
import { cn } from '@/lib/utils'

interface CartDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  suggestedProducts?: Array<Merge<Product, Course>>
}

export function CartDrawer({ open, onOpenChange, suggestedProducts = [] }: CartDrawerProps) {
  const { cart, removeFromCart, addToCart } = useShopStore()
  const subtotal = cart.reduce((sum, item) => sum + item.plan.price, 0)

  const handleAddSuggested = (product: Merge<Product, Course>) => {
    if (product.plans && product.plans.length > 0) {
      const plan = product.plans[0]
      addToCart({
        product: {
          id: product.id,
          title: product.title || product.name,
          description: product.description,
          image: product.image,
        },
        plan: {
          id: plan.id,
          name: plan.name,
          price: plan.price,
        },
        quantity: 1,
        language: 'en', // Default language for suggested products
      })
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[420px] p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-lg font-semibold">Carrito de Compras</SheetTitle>
            {cart.length > 0 && (
              <Badge variant="secondary" className="rounded-full bg-blue-100 text-blue-700 hover:bg-blue-100">
                {cart.length}
              </Badge>
            )}
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 px-6">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Tu carrito está vacío</h3>
              <p className="mt-2 text-sm text-muted-foreground text-center">
                Añade productos a tu carrito para comenzar.
              </p>
              <SheetClose asChild>
                <Link href="/shop">
                  <Button className="mt-6">Ir a la Tienda</Button>
                </Link>
              </SheetClose>
            </div>
          ) : (
            <div className="px-6 py-4">
              {/* Cart Items */}
              <div className="space-y-4">
                {cart.map((item) => (
                  <div
                    key={`${item.product.id}-${item.plan.id}`}
                    className="flex gap-4 p-3 bg-gray-50 rounded-xl"
                  >
                    {/* Product Image */}
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                      {item.product.image ? (
                        <Image
                          src={item.product.image}
                          alt={item.product.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">
                          📚
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-medium text-sm line-clamp-1">{item.product.title}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-muted-foreground">{item.plan.name}</p>
                            {item.language && (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                <Globe className="h-3 w-3" />
                                {SUPPORTED_LANGUAGES.find(l => l.code === item.language)?.name || item.language}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-gray-400 hover:text-red-500"
                          onClick={() => removeFromCart(item.product.id, item.plan.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Price */}
                      <div className="flex items-center justify-end mt-3">
                        <span className="font-semibold">
                          ${item.plan.price.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Suggested Products */}
              {suggestedProducts.length > 0 && (
                <div className="mt-6">
                  <Separator className="mb-4" />
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    También te puede interesar
                  </h4>
                  <div className="space-y-3">
                    {suggestedProducts.slice(0, 2).map((product) => {
                      const isInCart = cart.some(item => item.product.id === product.id)
                      const price = product.plans?.[0]?.price || product.price || 0
                      
                      return (
                        <div
                          key={product.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                            {product.image ? (
                              <Image
                                src={product.image}
                                alt={product.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-2xl">
                                📚
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-sm line-clamp-1">{product.name}</h5>
                            <p className="text-sm text-muted-foreground">${price.toFixed(2)}</p>
                          </div>
                          <Button
                            variant="link"
                            size="sm"
                            className={cn(
                              "text-blue-600 hover:text-blue-700 p-0 h-auto font-medium",
                              isInCart && "text-green-600"
                            )}
                            onClick={() => !isInCart && handleAddSuggested(product)}
                            disabled={isInCart}
                          >
                            {isInCart ? 'Añadido' : 'Añadir'}
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="border-t bg-white px-6 py-4 space-y-4">
            {/* Subtotal */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <p className="text-xs text-muted-foreground">
                  Envío e impuestos calculados en el checkout.
                </p>
              </div>
              <span className="text-lg font-semibold">${subtotal.toFixed(2)}</span>
            </div>

            {/* Checkout Button */}
            <SheetClose asChild>
              <Link href="/shop/cart/checkout" className="block">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base font-medium">
                  Proceder al Pago
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </SheetClose>

            {/* Continue Shopping */}
            <SheetClose asChild>
              <Button variant="ghost" className="w-full text-muted-foreground hover:text-foreground">
                Seguir Comprando
              </Button>
            </SheetClose>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
