'use client'

import { FilterSidebar } from '@/components/filters/filter-sidebar'
import Header from '@/components/public-components/header'
import { CartSheet } from '@/components/shop/cart/cart-sheet'
import { ComparePlansSheet } from '@/components/shop/plans/compare-plans-sheet'
import { ComingSoonProduct } from '@/components/shop/product/coming-soon-product-card'
import { ProductCard } from '@/components/shop/product/product-card'
import { useFilterCourses } from '@/hooks/use-filter-courses'
import { useIsMobile } from '@/hooks/use-mobile'
import { ProductTypeEnum } from '@/types/shop'

export default function ShopPage() {
  const { courses: filteredCourses, loading } = useFilterCourses()
  const isMobile = useIsMobile()
  
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container py-6 grid grid-cols-1 md:grid-cols-[250px_1fr] gap-6">
        {!isMobile && <FilterSidebar />}

        <main>
          <h2 className="text-2xl font-bold mb-6">Cursos Disponibles</h2>
          
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">
              {filteredCourses
                .map((course) => {
                  return {
                    ...course,
                    type: ProductTypeEnum.COURSE,
                  }
                })
                .map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
            </div>
          )}

          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Próximamente</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">
              {[1, 2].map((_, index) => (
                <ComingSoonProduct key={index} />
              ))}
            </div>
          </div>
        </main>
      </div>

      <CartSheet />
      <ComparePlansSheet />
    </div>
  )
}
