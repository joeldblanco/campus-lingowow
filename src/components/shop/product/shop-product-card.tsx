'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardFooter } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Course, Merge, Product } from '@/types/shop'
import { ShoppingCart, Star, Video, BookOpen, Calendar } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { ProductPriceDisplay } from '../product-price-display'
import { ProductCountdown } from './product-countdown'
import { isAfter, isBefore } from 'date-fns'

interface ShopProductCardProps {
  product: Merge<Product, Course>
  variant?: 'default' | 'featured'
}

export function ShopProductCard({ product, variant = 'default' }: ShopProductCardProps) {
  const isFeatured = variant === 'featured'

  // Determine availability status
  const now = new Date()
  const publishedAt = product.publishedAt ? new Date(product.publishedAt) : null
  const expiresAt = product.expiresAt ? new Date(product.expiresAt) : null

  const isScheduled = publishedAt && isAfter(publishedAt, now)
  const isExpired = expiresAt && isBefore(expiresAt, now)
  const isAvailable = !isScheduled && !isExpired

  return (
    <Card className={cn(
      "group relative flex flex-col overflow-hidden transition-all duration-300",
      "border-border/50 hover:border-primary/20",
      "hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)]",
      isFeatured ? "md:col-span-2 md:flex-row bg-gradient-to-br from-primary/5 via-background to-background" : "bg-card"
    )}>
      {/* Featured Badge */}
      {isFeatured && (
        <div className="absolute top-4 left-4 z-20">
          <Badge className="bg-primary hover:bg-primary text-primary-foreground border-none px-3 py-1 shadow-lg shadow-primary/20">
            <Star className="w-3 h-3 mr-1 fill-current" />
            Destacado
          </Badge>
        </div>
      )}

      {/* Image Section */}
      <div className={cn(
        "relative overflow-hidden bg-muted",
        isFeatured ? "w-full md:w-2/5 aspect-[4/3] md:aspect-auto" : "aspect-[4/3]"
      )}>
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-gray-800">
            <span className="text-4xl">📚</span>
          </div>
        )}

        {/* Overlay Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Content Section */}
      <div className="flex flex-col flex-1 p-5">
        <div className="flex-1 space-y-4">
          {/* Tags & Meta */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="bg-secondary/50 text-secondary-foreground hover:bg-secondary/60">
              {product.category || 'General'}
            </Badge>
            {product.requiresScheduling && (
              <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800">
                <Calendar className="w-3 h-3 mr-1" />
                Agendable
              </Badge>
            )}
            {/* Countdown for Scheduled or Expiring products */}
            {(isScheduled || expiresAt) && !isExpired && (
              <ProductCountdown
                publishedAt={product.publishedAt}
                expiresAt={product.expiresAt}
                className="text-xs py-0.5 px-2"
              />
            )}
            {isExpired && (
              <Badge variant="destructive">Expirado</Badge>
            )}
          </div>

          {/* Title & Description */}
          <div>
            <Link href={`/checkout/${product.id}`} className={cn(
              "block font-bold text-foreground hover:text-primary transition-colors line-clamp-2",
              isFeatured ? "text-2xl mb-2" : "text-lg mb-1"
            )}>
              {product.name}
            </Link>
            <p className={cn(
              "text-muted-foreground line-clamp-2 text-sm",
              isFeatured && "text-base line-clamp-3"
            )}>
              {product.shortDesc || product.description}
            </p>
          </div>

          {/* Features Grid (Only for Featured) */}
          {isFeatured && (
            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="p-1.5 rounded-full bg-primary/10 text-primary">
                  <Video className="w-4 h-4" />
                </div>
                <span>Clases en vivo</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="p-1.5 rounded-full bg-primary/10 text-primary">
                  <BookOpen className="w-4 h-4" />
                </div>
                <span>Material digital</span>
              </div>
            </div>
          )}
        </div>

        {/* Price & CTA */}
        <CardFooter className="p-0 pt-4 mt-auto">
          <div className="flex items-center justify-between w-full gap-4">
            <ProductPriceDisplay
              price={product.price}
              comparePrice={product.comparePrice}
              creditPrice={product.creditPrice}
              acceptsCredits={product.acceptsCredits}
              acceptsRealMoney={product.acceptsRealMoney}
              size={isFeatured ? 'lg' : 'md'}
            />
            <Button
              asChild
              size={isFeatured ? 'lg' : 'default'}
              className={cn(
                "gap-2 shadow-sm",
                !isAvailable && "opacity-50 pointer-events-none"
              )}
              disabled={!isAvailable}
            >
              <Link href={`/checkout/${product.id}`}>
                <ShoppingCart className="w-4 h-4" />
                {isScheduled ? 'Próximamente' : isExpired ? 'No disponible' : 'Comprar'}
              </Link>
            </Button>
          </div>
        </CardFooter>
      </div>
    </Card>
  )
}
