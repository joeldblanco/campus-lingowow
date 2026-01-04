'use client'

import Footer from '@/components/public-components/footer'
import Header from '@/components/public-components/header'
import { CartAbandonmentTracker } from '@/components/shop/cart-abandonment-tracker'
import { CartDrawer } from '@/components/shop/cart/cart-drawer'
import { ExitIntentPopup } from '@/components/shop/exit-intent-popup'
import { HeroSection } from '@/components/shop/hero-section'
import { Pagination } from '@/components/shop/pagination'
import { ShopProductCard } from '@/components/shop/product/shop-product-card'
import { SearchFilters } from '@/components/shop/search-filters'
import { Button } from '@/components/ui/button'
import { useFilterCourses } from '@/hooks/use-filter-courses'
import { useShopStore } from '@/stores/useShopStore'
import { ChevronDown } from 'lucide-react'
import { useEffect } from 'react'
import { toast } from 'sonner'

export default function ShopPage() {
  const { courses: filteredCourses, allCourses, totalPages, loading, totalResults } = useFilterCourses()
  const currentPage = useShopStore((state) => state.currentPage)
  const setCurrentPage = useShopStore((state) => state.setCurrentPage)
  const clearFilters = useShopStore((state) => state.clearFilters)
  const isCartDrawerOpen = useShopStore((state) => state.isCartDrawerOpen)
  const setCartDrawerOpen = useShopStore((state) => state.setCartDrawerOpen)
  const lastAddedItem = useShopStore((state) => state.lastAddedItem)
  const cart = useShopStore((state) => state.cart)

  // Mostrar toast cuando se añade un producto
  useEffect(() => {
    if (lastAddedItem) {
      toast.success('¡Añadido correctamente!', {
        description: `"${lastAddedItem.plan.name}" ha sido añadido a tu carrito.`,
        duration: 4000,
        position: 'bottom-left',
      })
    }
  }, [lastAddedItem])

  // Obtener productos sugeridos (excluyendo los que ya están en el carrito)
  const suggestedProducts = allCourses
    .filter(product => !cart.some(item => item.product.id === product.id))
    .slice(0, 3)

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Header />

      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <section className="mb-16">
          <HeroSection />
        </section>

        {/* Search and Filters */}
        <section className="mb-12">
          <SearchFilters />
        </section>

        {/* Content Section */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Paquetes Destacados
            </h2>
            {/* <Button
              variant="link"
              className="text-blue-600 hover:text-blue-700 font-bold text-base no-underline hover:underline"
            >
              Ver Todos
            </Button> */}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-[500px] bg-gray-200 animate-pulse rounded-3xl" />
              ))}
            </div>
          ) : filteredCourses.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {filteredCourses.map((product) => (
                  <ShopProductCard key={product.id} product={product} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-12">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}

              {/* Show More Button */}
              {totalResults > filteredCourses.length && (
                <div className="flex justify-center mt-12">
                  <Button
                    variant="outline"
                    className="px-8 py-3 rounded-full border-gray-300 hover:bg-gray-50 text-gray-600 font-semibold"
                  >
                    Mostrar Más Productos
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-24 bg-white rounded-3xl border border-gray-100 shadow-sm">
              <div className="text-gray-200 text-7xl mb-6">📦</div>
              <h3 className="text-gray-900 text-xl font-bold mb-2">No encontramos resultados</h3>
              <p className="text-gray-500 text-lg mb-8 max-w-md mx-auto">
                Intenta ajustar tus filtros o búsqueda para encontrar lo que necesitas.
              </p>
              <Button variant="outline" onClick={clearFilters} className="rounded-full px-8">
                Limpiar filtros
              </Button>
            </div>
          )}
        </section>
      </div>

      <ExitIntentPopup />
      <CartAbandonmentTracker />
      <CartDrawer 
        open={isCartDrawerOpen} 
        onOpenChange={setCartDrawerOpen}
        suggestedProducts={suggestedProducts}
      />
      <Footer />
    </div>
  )
}
