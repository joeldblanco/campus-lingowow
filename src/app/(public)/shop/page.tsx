'use client'

import { FilterSidebar } from '@/components/filters/filter-sidebar'
import { SearchBar } from '@/components/filters/search-bar'
import Header from '@/components/public-components/header'
import { CartSheet } from '@/components/shop/cart/cart-sheet'
import { ComingSoonProduct } from '@/components/shop/product/coming-soon-product-card'
import { ProductCard } from '@/components/shop/product/product-card'
import { ProductListItem } from '@/components/shop/product/product-list-item'
import { SortSelect } from '@/components/shop/sort-select'
import { ViewToggle } from '@/components/shop/view-toggle'
import { Pagination } from '@/components/shop/pagination'
import { useFilterCourses } from '@/hooks/use-filter-courses'
import { useIsMobile } from '@/hooks/use-mobile'
import { useShopStore } from '@/stores/useShopStore'
import { Button } from '@/components/ui/button'
import { X, SlidersHorizontal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

export default function ShopPage() {
  const { courses: filteredCourses, totalPages, totalResults, loading } = useFilterCourses()
  const isMobile = useIsMobile()
  const filters = useShopStore((state) => state.filters)
  const searchQuery = useShopStore((state) => state.searchQuery)
  const viewMode = useShopStore((state) => state.viewMode)
  const currentPage = useShopStore((state) => state.currentPage)
  const setCurrentPage = useShopStore((state) => state.setCurrentPage)
  const clearFilters = useShopStore((state) => state.clearFilters)
  const toggleFilter = useShopStore((state) => state.toggleFilter)

  // Get all active filters
  const activeFilters = [
    ...filters.levels.map((f) => ({ type: 'levels' as const, value: f })),
    ...filters.languages.map((f) => ({ type: 'languages' as const, value: f })),
    ...filters.categories.map((f) => ({ type: 'categories' as const, value: f })),
    ...filters.tags.map((f) => ({ type: 'tags' as const, value: f })),
  ]

  const hasActiveFilters = activeFilters.length > 0 || searchQuery

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container py-6">
        {/* Search and Filter Controls */}
        <div className="mb-6 space-y-4">
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

        <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-6">
          {!isMobile && <FilterSidebar />}

          <main>
            {/* Header with controls */}
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                  {searchQuery ? `Resultados para "${searchQuery}"` : 'Productos Disponibles'}
                </h2>
                {!isMobile && <ViewToggle />}
              </div>

              <div className="flex items-center justify-between flex-wrap gap-4">
                <p className="text-sm text-muted-foreground">
                  {totalResults} {totalResults === 1 ? 'producto encontrado' : 'productos encontrados'}
                </p>
                <SortSelect />
              </div>
            </div>

            {loading ? (
              <div className={viewMode === 'grid' 
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6'
                : 'space-y-4'
              }>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : filteredCourses.length > 0 ? (
              <>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredCourses.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredCourses.map((product) => (
                      <ProductListItem key={product.id} product={product} />
                    ))}
                  </div>
                )}

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

            {!searchQuery && !hasActiveFilters && filteredCourses.length > 0 && (
              <div className="mt-12">
                <h2 className="text-2xl font-bold mb-6">Próximamente</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {[1, 2].map((_, index) => (
                    <ComingSoonProduct key={index} />
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      <CartSheet />
    </div>
  )
}
