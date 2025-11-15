'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { PricingTableModal } from '@/components/shop/plans/pricing-table-modal'
import { Course, Merge, Product } from '@/types/shop'
import { ShoppingCart } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

export function ProductCard({ product }: { product: Merge<Product, Course> }) {
  const [showPricingModal, setShowPricingModal] = useState(false)

  return (
    <>
      <Card className="overflow-hidden py-0 flex flex-col border-2 border-gray-200 shadow-lg hover:shadow-xl transition-shadow bg-white">
        {/* Title and Button at absolute top */}
        <CardContent className="p-6 pb-3">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <CardTitle className="line-clamp-2 text-2xl font-black text-gray-900 hover:text-blue-600 transition-colors leading-tight">{product.title}</CardTitle>
            </div>
            <Button 
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-lg hover:shadow-xl transform transition hover:scale-105 shrink-0"
              onClick={() => setShowPricingModal(true)}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Ver Planes
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-1 mb-3">
            {product.levels.map((level: string, key: number) => (
              <Badge key={key} variant="outline" className="text-xs">
                {level}
              </Badge>
            ))}
          </div>
          
          <CardDescription className="line-clamp-3">{product.description}</CardDescription>
        </CardContent>
        
        {/* Image below title */}
        <CardHeader className="p-0">
          <div className="relative h-48">
            <Image
              src={product.image || '/placeholder.svg'}
              alt={product.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority={false}
            />
          </div>
        </CardHeader>
      </Card>

      <PricingTableModal
        product={product}
        open={showPricingModal}
        onOpenChange={setShowPricingModal}
      />
    </>
  )
}
