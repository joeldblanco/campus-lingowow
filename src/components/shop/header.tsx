'use client'

import { MobileFilterSheet } from '@/components/filters/mobile-filter-sheet'
import { CartSheet } from '@/components/shop/cart/cart-sheet'

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <MobileFilterSheet />
          <span className="font-semibold">Language Courses</span>
        </div>
        <CartSheet />
      </div>
    </header>
  )
}
