'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useShopStore } from '@/stores/useShopStore'
import { Course, Merge, Product } from '@/types/shop'
import { BookOpen, Check, ShoppingCart } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { isAfter, isBefore } from 'date-fns'

interface ShopProductCardProps {
  product: Merge<Product, Course>
}

export function ShopProductCard({ product }: ShopProductCardProps) {
  const { addToCart, cart } = useShopStore()
  const hasPlans = product.plans && product.plans.length > 0
  const minPrice = hasPlans ? Math.min(...product.plans.map((p) => p.price)) : (product.price ?? 0)
  const productUrl = hasPlans ? `/pricing/?productId=${product.id}` : `/checkout/${product.id}`
  const isSubscription = product.paymentType === 'RECURRING'

  // Check if product is in cart
  const isInCart = cart.some(item => item.product.id === product.id)

  // Handle add to cart for products without plans
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // For products without plans, create a default plan entry
    addToCart({
      product: {
        id: product.id,
        title: product.name,
        description: product.description,
        image: product.image,
      },
      plan: {
        id: `${product.id}-default`,
        name: product.name,
        price: product.price ?? 0,
      },
      quantity: 1,
    })
  }

  // Determine availability status
  const now = new Date()
  const publishedAt = product.publishedAt ? new Date(product.publishedAt) : null
  const expiresAt = product.expiresAt ? new Date(product.expiresAt) : null

  const isScheduled = publishedAt && isAfter(publishedAt, now)
  const isExpired = expiresAt && isBefore(expiresAt, now)
  const isAvailable = !isScheduled && !isExpired

  // Get badge info based on product properties (on-system colours)
  const getBadgeInfo = () => {
    if (isSubscription) return { text: 'Mejor precio', color: 'bg-primary text-primary-foreground' }
    else return { text: 'Popular', color: 'bg-secondary text-secondary-foreground' }
  }
  const badgeInfo = getBadgeInfo()

  // Get features from product tags or plans
  const features = product.tags?.slice(0, 3) || []

  return (
    <Card
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl',
        'border border-border transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg',
      )}
    >
      {/* Image Section */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-2xl bg-muted">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <BookOpen className="h-10 w-10 text-muted-foreground/40" />
          </div>
        )}

        {/* Status Badge */}
        {badgeInfo && (
          <Badge
            className={cn(
              'absolute right-3 top-3 rounded-full border-none px-3 py-1 text-xs font-medium',
              badgeInfo.color,
            )}
          >
            {badgeInfo.text}
          </Badge>
        )}
      </div>

      {/* Content Section */}
      <div className="flex flex-1 flex-col p-5">
        {/* Title */}
        <Link
          href={productUrl}
          className="mb-1 line-clamp-2 block font-lexend text-lg font-bold text-foreground transition-colors hover:text-primary"
        >
          {product.name}
        </Link>

        {/* Description */}
        <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
          {product.shortDesc || product.description}
        </p>

        {/* Price */}
        <div className="flex flex-col">
          {isSubscription && <span className="text-sm text-muted-foreground">Desde</span>}
          <div className="mb-4">
            <span className="text-2xl font-bold tabular-nums text-foreground">
              ${minPrice.toFixed(2)}
            </span>
            {isSubscription && <span className="text-sm text-muted-foreground">/mes</span>}
          </div>
        </div>

        {/* Features List */}
        {features.length > 0 && (
          <ul className="mb-4 flex-1 space-y-2">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 flex-shrink-0 text-primary" />
                <span className="line-clamp-1">{feature}</span>
              </li>
            ))}
          </ul>
        )}

        {/* CTA Button */}
        {hasPlans ? (
          <Button
            asChild
            variant={isSubscription ? 'default' : 'outline'}
            className={cn('mt-auto w-full rounded-full', !isAvailable && 'pointer-events-none opacity-50')}
            disabled={!isAvailable}
          >
            <Link href={productUrl}>
              {isScheduled ? 'Próximamente' : isExpired ? 'No disponible' : 'Ver planes'}
            </Link>
          </Button>
        ) : (
          <Button
            variant={isInCart ? 'secondary' : 'outline'}
            className={cn('mt-auto w-full rounded-full', !isAvailable && 'pointer-events-none opacity-50')}
            disabled={!isAvailable}
            onClick={handleAddToCart}
          >
            {isScheduled ? (
              'Próximamente'
            ) : isExpired ? (
              'No disponible'
            ) : isInCart ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Añadido al carrito
              </>
            ) : (
              <>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Añadir al carrito
              </>
            )}
          </Button>
        )}
      </div>
    </Card>
  )
}
