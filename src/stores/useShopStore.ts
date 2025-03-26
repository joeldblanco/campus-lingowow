import { CartItem, Filters, Product } from '@/types/shop'
import { create } from 'zustand'

type ShopState = {
  cart: CartItem[]
  filters: Filters
  comparePlans: { product: Product | null }
  addToCart: (item: CartItem) => void
  removeFromCart: (productId: string, planId: string) => void
  toggleFilter: (type: keyof Filters, value: string) => void
  setComparePlans: (product: Product | null) => void
}

export const useShopStore = create<ShopState>((set) => ({
  cart: [],
  filters: {
    levels: [],
    languages: [],
    categories: [],
  },
  comparePlans: { product: null },

  addToCart: (item) =>
    set((state) => {
      const existingIndex = state.cart.findIndex(
        (cartItem) => cartItem.productId === item.productId && cartItem.planId === item.planId
      )

      if (existingIndex >= 0) {
        return { cart: state.cart.filter((_, index) => index !== existingIndex) }
      }
      return { cart: [...state.cart, item] }
    }),

  removeFromCart: (productId, planId) =>
    set((state) => ({
      cart: state.cart.filter((item) => !(item.productId === productId && item.planId === planId)),
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
}))
