'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { PricingTableModal } from '@/components/shop/plans/pricing-table-modal'
import { Course, Merge, Product } from '@/types/shop'
import Image from 'next/image'
import { useState } from 'react'

export function ProductCard({ product }: { product: Merge<Product, Course> }) {
  const [showPricingModal, setShowPricingModal] = useState(false)

  return (
    <>
      <Card className="overflow-hidden py-0 flex flex-col">
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
        <CardContent className="p-6 flex-grow">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <CardTitle className="line-clamp-2">{product.title}</CardTitle>
              <CardDescription className="mt-2 line-clamp-3">{product.description}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-1 ml-2 shrink-0">
              {product.levels.map((level: string, key: number) => (
                <Badge key={key} variant="outline" className="text-xs">
                  {level}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-6 pt-0 mt-auto">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setShowPricingModal(true)}
          >
            Ver Planes
          </Button>
        </CardFooter>
      </Card>

      <PricingTableModal
        product={product}
        open={showPricingModal}
        onOpenChange={setShowPricingModal}
      />
    </>
  )
}
