'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Course, Merge, Product } from '@/types/shop'
import { ShoppingCart } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface ProductListItemProps {
  product: Merge<Product, Course>
}

export function ProductListItem({ product }: ProductListItemProps) {
  const minPrice = Math.min(...product.plans.map((p) => p.price))
  const hasDiscount = product.comparePrice && product.comparePrice > product.price

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow border-2 border-gray-200 shadow-lg bg-white">
      <div className="flex flex-col sm:flex-row">
        {/* Image */}
        <div className="relative w-full sm:w-48 h-48 sm:h-auto flex-shrink-0">
          <Image
            src={product.image || '/media/images/default-course.png'}
            alt={product.name}
            fill
            className="object-cover"
          />
          {hasDiscount && (
            <Badge className="absolute top-2 left-2 bg-red-500">
              -{Math.round(((product.comparePrice! - product.price) / product.comparePrice!) * 100)}%
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4 mb-2">
                <Link href={`/shop/${product.slug}`}>
                  <h3 className="text-2xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
                    {product.name}
                  </h3>
                </Link>
                <div className="text-right flex-shrink-0">
                  {hasDiscount && (
                    <p className="text-sm text-muted-foreground line-through">
                      ${product.comparePrice}
                    </p>
                  )}
                  <p className="text-2xl font-bold text-primary">
                    Desde ${minPrice}
                  </p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {product.shortDesc || product.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {product.tags?.slice(0, 4).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex gap-2">
                <Badge variant="outline">{product.category}</Badge>
                <Badge variant="outline">{product.plans.length} Planes</Badge>
              </div>
              <Link href={`/shop/${product.slug}`}>
                <Button 
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-lg hover:shadow-xl transform transition hover:scale-105"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Ver Planes
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
