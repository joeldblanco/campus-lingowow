'use client'

import { ProductPlans } from '@/components/shop/product/product-plans'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Course, Merge, Product } from '@/types/shop'
import Image from 'next/image'
import { useState } from 'react'

export function ProductCard({ product }: { product: Merge<Product, Course> }) {
  const [expanded, setExpanded] = useState(false)

  return (
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
      <CardFooter className="flex flex-col p-0 mt-auto">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value={product.id} className="border-t border-b-0">
            <AccordionTrigger
              className="py-4 px-6 cursor-pointer hover:no-underline"
              onClick={() => setExpanded(!expanded)}
            >
              <span className="text-sm font-medium">{expanded ? 'Ocultar Planes' : 'Ver Planes'}</span>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-4">
              <div className="max-h-80 overflow-y-auto">
                <ProductPlans product={product} />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardFooter>
    </Card>
  )
}
