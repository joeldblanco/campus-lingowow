'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Course, Merge, Product } from '@/types/shop'
import { ProductPlans } from '@/components/shop/product/product-plans'

export function ProductCard({ product }: { product: Merge<Product, Course> }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card className="overflow-hidden">
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
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{product.title}</CardTitle>
            <CardDescription className="mt-2">{product.description}</CardDescription>
          </div>
          {product.levels.map((level: string, key: number) => (
            <Badge key={key} variant="outline" className="ml-2">
              {level}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col p-0">
        <Accordion
          type="single"
          collapsible
          value={expanded ? product.id : undefined}
          onValueChange={() => setExpanded(!expanded)}
          className="w-full"
        >
          <AccordionItem value={product.id} className="border-t border-b-0">
            <AccordionTrigger className="py-4 px-6">
              <span>{expanded ? 'Hide Plans' : 'View Plans'}</span>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-4">
              <ProductPlans product={product} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardFooter>
    </Card>
  )
}
