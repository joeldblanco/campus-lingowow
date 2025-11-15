'use client'

import { FilterSidebar } from '@/components/filters/filter-sidebar'
import { SearchBar } from '@/components/filters/search-bar'
import Header from '@/components/public-components/header'
import Footer from '@/components/public-components/footer'
// import { ComingSoonProduct } from '@/components/shop/product/coming-soon-product-card'
import { ProductRow } from '@/components/shop/product/product-row'
import { Pagination } from '@/components/shop/pagination'
import { ExitIntentPopup } from '@/components/shop/exit-intent-popup'
import { CartAbandonmentTracker } from '@/components/shop/cart-abandonment-tracker'
import { ImageSlider } from '@/components/shop/image-slider'
import { useFilterCourses } from '@/hooks/use-filter-courses'
import { useIsMobile } from '@/hooks/use-mobile'
import { useShopStore } from '@/stores/useShopStore'
import { Button } from '@/components/ui/button'
import { X, SlidersHorizontal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

export default function ShopPage() {
  const { courses: filteredCourses, totalPages, loading } = useFilterCourses()
  const isMobile = useIsMobile()
  const filters = useShopStore((state) => state.filters)
  const searchQuery = useShopStore((state) => state.searchQuery)
  const currentPage = useShopStore((state) => state.currentPage)
  const setCurrentPage = useShopStore((state) => state.setCurrentPage)
  const clearFilters = useShopStore((state) => state.clearFilters)
  const toggleFilter = useShopStore((state) => state.toggleFilter)

  // Slider data
  const sliderSlides = [
    {
      id: '1',
      image: '/media/images/hero-img.png',
      title: 'Aprende Inglés con los Mejores',
      subtitle: 'Cursos online para todos los niveles',
      cta: {
        text: 'Explorar Cursos',
        url: '/courses'
      }
    }
  ]

  // Get all active filters
  const activeFilters = [
    ...filters.levels.map((f) => ({ type: 'levels' as const, value: f })),
    ...filters.languages.map((f) => ({ type: 'languages' as const, value: f })),
    ...filters.categories.map((f) => ({ type: 'categories' as const, value: f })),
    ...filters.tags.map((f) => ({ type: 'tags' as const, value: f })),
  ]

  const hasActiveFilters = activeFilters.length > 0 || searchQuery

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      <div className="container py-6">
        {/* Image Slider */}
        <div className="mb-6">
          <ImageSlider slides={sliderSlides} />
        </div>

        {/* Social Proof Banner */}
        <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-center gap-4 text-center">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">M</div>
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">S</div>
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">L</div>
              </div>
              <p className="text-sm font-medium text-gray-800">
                <strong>5 estudiantes</strong> se inscribieron hoy
              </p>
            </div>
            <div className="text-gray-400">|</div>
            <p className="text-sm text-gray-600">
              ⭐ <strong>4.9/5</strong> de calificación
            </p>
            <div className="text-gray-400">|</div>
            <p className="text-sm text-gray-600">
              🎯 <strong>95%</strong> de satisfacción
            </p>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="mb-6 space-y-4 hidden">
          <div className="flex gap-3">
            <div className="flex-1">
              <SearchBar />
            </div>
            {isMobile && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon">
                    <SlidersHorizontal className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left">
                  <SheetHeader>
                    <SheetTitle>Filtros</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <FilterSidebar />
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>

          {/* Active Filters */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Filtros activos:</span>
              {activeFilters.map((filter) => (
                <Badge key={`${filter.type}-${filter.value}`} variant="secondary" className="gap-1">
                  {filter.value}
                  <button
                    onClick={() => toggleFilter(filter.type, filter.value)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpiar todo
              </Button>
            </div>
          )}
        </div>

        <div className="container py-6">
          <main>
            {/* Header with controls */}
            {/* <div className="flex flex-col gap-4 mb-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <p className="text-sm text-muted-foreground">
                  {totalResults} {totalResults === 1 ? 'producto encontrado' : 'productos encontrados'}
                </p>
              </div>
            </div> */}

            {loading ? (
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : filteredCourses.length > 0 ? (
              <>
                <div className="space-y-6">
                  {filteredCourses.map((product) => (
                    <ProductRow key={product.id} product={product} />
                  ))}
                </div>

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No se encontraron productos que coincidan con tu búsqueda.
                </p>
                <Button variant="link" onClick={clearFilters} className="mt-2">
                  Limpiar filtros
                </Button>
              </div>
            )}

            {/* {!searchQuery && !hasActiveFilters && filteredCourses.length > 0 && (
              <div className="mt-12">
                <h2 className="text-2xl font-bold mb-6">Próximamente</h2>
                <div className="grid grid-cols-1 gap-6">
                  {[1, 2].map((_, index) => (
                    <ComingSoonProduct key={index} />
                  ))}
                </div>
              </div>
            )} */}
          </main>
        </div>
      </div>
      
      <ExitIntentPopup />
      <CartAbandonmentTracker />
      <Footer />
    </div>
  )
}
