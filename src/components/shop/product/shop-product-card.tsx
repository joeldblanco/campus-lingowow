'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Course, Merge, Product } from '@/types/shop'
import { Check } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { isAfter, isBefore } from 'date-fns'

interface ShopProductCardProps {
  product: Merge<Product, Course>
}

export function ShopProductCard({ product }: ShopProductCardProps) {
  const hasPlans = product.plans && product.plans.length > 0
  const minPrice = hasPlans ? Math.min(...product.plans.map((p) => p.price)) : (product.price ?? 0)
  const productUrl = hasPlans ? `/pricing/?productId=${product.id}` : `/checkout/${product.id}`
  const isSubscription = product.paymentType === 'RECURRING'

  // Determine availability status
  const now = new Date()
  const publishedAt = product.publishedAt ? new Date(product.publishedAt) : null
  const expiresAt = product.expiresAt ? new Date(product.expiresAt) : null

  const isScheduled = publishedAt && isAfter(publishedAt, now)
  const isExpired = expiresAt && isBefore(expiresAt, now)
  const isAvailable = !isScheduled && !isExpired

  // Get badge info based on product properties
  const getBadgeInfo = () => {
    if (isSubscription) return { text: 'Mejor Precio', color: 'bg-emerald-500' }
    else return { text: 'Popular', color: 'bg-orange-500' }
  }
  const badgeInfo = getBadgeInfo()

  // Get features from product tags or plans
  const features = product.tags?.slice(0, 3) || []

  return (
    <Card
      className={cn(
        'group relative flex flex-col overflow-hidden transition-all duration-300 rounded-2xl',
        'border border-gray-100 hover:border-gray-200',
        'hover:shadow-lg bg-white'
      )}
    >
      {/* Image Section */}
      <div className="relative overflow-hidden bg-gray-100 aspect-[4/3] rounded-t-2xl">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-100">
            <span className="text-4xl">📚</span>
          </div>
        )}

        {/* Status Badge */}
        {badgeInfo && (
          <Badge
            className={cn(
              'absolute top-3 right-3 text-white border-none px-3 py-1 text-xs font-medium rounded-full',
              badgeInfo.color
            )}
          >
            {badgeInfo.text}
          </Badge>
        )}
      </div>

      {/* Content Section */}
      <div className="flex flex-col flex-1 p-5">
        {/* Title */}
        <Link
          href={productUrl}
          className="block font-bold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2 text-lg mb-1"
        >
          {product.name}
        </Link>

        {/* Description */}
        <p className="text-gray-500 text-sm line-clamp-2 mb-4">
          {product.shortDesc || product.description}
        </p>

        {/* Price */}
        <div className='flex flex-col'>
          {isSubscription && <span className="text-gray-500 text-sm">Desde</span>}
          <div className="mb-4">
            <span className="text-2xl font-bold text-gray-900">${minPrice.toFixed(2)}</span>
            {isSubscription && <span className="text-gray-500 text-sm">/mes</span>}
          </div>
        </div>

        {/* Features List */}
        {features.length > 0 && (
          <ul className="space-y-2 mb-4 flex-1">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="line-clamp-1">{feature}</span>
              </li>
            ))}
          </ul>
        )}

        {/* CTA Button */}
        <Button
          asChild
          variant={isSubscription ? 'default' : 'outline'}
          className={cn(
            'w-full mt-auto',
            isSubscription
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50',
            !isAvailable && 'opacity-50 pointer-events-none'
          )}
          disabled={!isAvailable}
        >
          <Link href={productUrl}>
            {isScheduled
              ? 'Próximamente'
              : isExpired
                ? 'No disponible'
                : isSubscription
                  ? 'Ver Planes'
                  : 'Agregar al carrito'}
          </Link>
        </Button>
      </div>
    </Card>
  )
}
