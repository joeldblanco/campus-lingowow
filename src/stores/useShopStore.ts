import { CartItem, CheckoutInfo, Filters, Course, Merge, Product, ProductTypeEnum } from '@/types/shop'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ShopState = {
  cart: CartItem[]
  filters: Filters
  comparePlans: { product: Merge<Product, Course> | null }
  checkoutInfo: CheckoutInfo

  // Acciones
  addToCart: (item: CartItem) => void
  removeFromCart: (productId: string, planId: string) => void
  toggleFilter: (type: keyof Filters, value: string) => void
  setComparePlans: (product: Merge<Product, Course> | null) => void
  clearCart: () => void
  setCheckoutInfo: (info: Partial<CheckoutInfo>) => void

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
      },
      comparePlans: { product: null },
      checkoutInfo: {
        requiresAuth: false,
        redirectAfterAuth: false,
      },

      addToCart: (item) =>
        set((state) => {
          const existingIndex = state.cart.findIndex(
            (cartItem) =>
              cartItem.product.id === item.product.id && cartItem.plan.id === item.plan.id
          )

          if (existingIndex >= 0) {
            return { cart: state.cart.filter((_, index) => index !== existingIndex) }
          }
          return { cart: [...state.cart, item] }
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
          }
        }),

      setComparePlans: (product) => set({ comparePlans: { product } }),

      clearCart: () => set({ cart: [] }),

      setCheckoutInfo: (info) =>
        set((state) => ({
          checkoutInfo: { ...state.checkoutInfo, ...info },
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
      }), // Solo persistimos el carrito y la info de checkout
    }
  )
)
