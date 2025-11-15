import { CartItem, CheckoutInfo, Filters, Course, Merge, Product, ProductTypeEnum } from '@/types/shop'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AppliedCoupon {
  code: string
  percentage: number
}

export type SortOption = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'date-desc' | 'date-asc' | 'custom-order'
export type ViewMode = 'grid' | 'list'

type ShopState = {
  cart: CartItem[]
  filters: Filters
  searchQuery: string
  sortBy: SortOption
  viewMode: ViewMode
  priceRange: [number, number]
  currentPage: number
  itemsPerPage: number
  comparePlans: { product: Merge<Product, Course> | null }
  checkoutInfo: CheckoutInfo
  appliedCoupon: AppliedCoupon | null

  // Acciones
  addToCart: (item: CartItem) => void
  removeFromCart: (productId: string, planId: string) => void
  toggleFilter: (type: keyof Filters, value: string) => void
  setSearchQuery: (query: string) => void
  setSortBy: (sort: SortOption) => void
  setViewMode: (mode: ViewMode) => void
  setPriceRange: (range: [number, number]) => void
  setCurrentPage: (page: number) => void
  clearFilters: () => void
  setComparePlans: (product: Merge<Product, Course> | null) => void
  clearCart: () => void
  setCheckoutInfo: (info: Partial<CheckoutInfo>) => void
  applyCoupon: (coupon: AppliedCoupon) => void
  removeCoupon: () => void

  // Getters
  getRequiresAuth: () => boolean
  getHasMerchandise: () => boolean
}

export const useShopStore = create<ShopState>()(
  persist(
    (set, get) => ({
      cart: [],
      filters: {
        levels: [],
        languages: [],
        categories: [],
        tags: [],
      },
      searchQuery: '',
      sortBy: 'custom-order' as SortOption,
      viewMode: 'grid' as ViewMode,
      priceRange: [0, 1000],
      currentPage: 1,
      itemsPerPage: 12,
      comparePlans: { product: null },
      checkoutInfo: {
        requiresAuth: false,
        redirectAfterAuth: false,
      },
      appliedCoupon: null,

      addToCart: (item) =>
        set((state) => {
          const existingIndex = state.cart.findIndex(
            (cartItem) =>
              cartItem.product.id === item.product.id && cartItem.plan.id === item.plan.id
          )

          if (existingIndex >= 0) {
            // Si el mismo plan ya está en el carrito, lo removemos
            return { cart: state.cart.filter((_, index) => index !== existingIndex) }
          }
          
          // Solo permitir un plan en el carrito - limpiamos el carrito completamente antes de agregar
          return { cart: [item] }
        }),

      removeFromCart: (productId, planId) =>
        set((state) => ({
          cart: state.cart.filter(
            (item) => !(item.product.id === productId && item.plan.id === planId)
          ),
        })),

      toggleFilter: (type, value) =>
        set((state) => {
          const current = [...state.filters[type]]
          return {
            filters: {
              ...state.filters,
              [type]: current.includes(value)
                ? current.filter((item) => item !== value)
                : [...current, value],
            },
            currentPage: 1, // Reset page when filter changes
          }
        }),

      setSearchQuery: (query) => set({ searchQuery: query, currentPage: 1 }),

      setSortBy: (sort) => set({ sortBy: sort }),

      setViewMode: (mode) => set({ viewMode: mode }),

      setPriceRange: (range) => set({ priceRange: range, currentPage: 1 }),

      setCurrentPage: (page) => set({ currentPage: page }),

      clearFilters: () =>
        set({
          filters: {
            levels: [],
            languages: [],
            categories: [],
            tags: [],
          },
          searchQuery: '',
          priceRange: [0, 1000],
          currentPage: 1,
        }),

      setComparePlans: (product) => set({ comparePlans: { product } }),

      clearCart: () => set({ cart: [] }),

      setCheckoutInfo: (info) =>
        set((state) => ({
          checkoutInfo: { ...state.checkoutInfo, ...info },
        })),

      applyCoupon: (coupon) =>
        set(() => ({
          appliedCoupon: coupon,
        })),

      removeCoupon: () =>
        set(() => ({
          appliedCoupon: null,
        })),

      // Función para verificar si el carrito requiere autenticación
      getRequiresAuth: () => {
        const { cart } = get()
        // Verificamos si hay al menos un curso en el carrito
        return cart.some((item) => item.product.type === ProductTypeEnum.COURSE)
      },

      // Función para verificar si hay productos físicos (merchandising) en el carrito
      getHasMerchandise: () => {
        const { cart } = get()
        // Verificamos si hay al menos un producto de tipo merchandise
        return cart.some((item) => item.product.type === ProductTypeEnum.MERCHANDISE)
      },
    }),
    {
      name: 'lingowow-shop', // Nombre para localStorage
      partialize: (state) => ({
        cart: state.cart,
        checkoutInfo: state.checkoutInfo,
        viewMode: state.viewMode,
        sortBy: state.sortBy,
        appliedCoupon: state.appliedCoupon,
      }), // Persistimos carrito, checkout, vista, ordenamiento y cupón
    }
  )
)
