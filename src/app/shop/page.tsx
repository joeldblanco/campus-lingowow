// │   ├── Cart/
// │   │   ├── CartSheet.tsx
// │   │   └── CartItem.tsx
// │   ├── ComparePlans/
// │   │   └── ComparePlansSheet.tsx
// │   ├── Course/
// │   │   ├── CourseCard.tsx
// │   │   ├── CoursePlans.tsx
// │   │   └── ComingSoonCourse.tsx
// │   ├── Filters/
// │   │   ├── FilterSidebar.tsx
// │   │   ├── FilterSection.tsx
// │   │   └── FilterCheckbox.tsx
// │   └── Header.tsx
// └── page.tsx

'use client'

import { FilterSidebar } from '@/components/filters/filter-sidebar'
import { CartSheet } from '@/components/shop/cart/cart-sheet'
import { Header } from '@/components/shop/header'
import { ComparePlansSheet } from '@/components/shop/plans/compare-plans-sheet'
import { ComingSoonProduct } from '@/components/shop/product/coming-soon-product-card'
import { ProductCard } from '@/components/shop/product/product-card'
import { useFilterCourses } from '@/hooks/use-filter-courses'

export default function ShopPage() {
  const filteredCourses = useFilterCourses()

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container py-6 grid grid-cols-1 md:grid-cols-[250px_1fr] gap-6">
        <FilterSidebar />

        <main>
          <h2 className="text-2xl font-bold mb-6">Available Courses</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">
            {filteredCourses.map((course) => (
              <ProductCard key={course.id} product={course} />
            ))}
          </div>

          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Coming Soon</h2>
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
