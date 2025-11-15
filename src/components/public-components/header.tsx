'use client'

import { MobileFilterSheet } from '@/components/filters/mobile-filter-sheet'
import { CartSheet } from '@/components/shop/cart/cart-sheet'
import { Button } from '@/components/ui/button'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const Header = () => {
  const { data: session } = useSession()
  const pathname = usePathname()
  const isShopRoute = pathname.startsWith('/shop')
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between py-4">
        <div className="flex items-center gap-2">
          {isShopRoute && <MobileFilterSheet />}
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/branding/logo.png"
              alt="Lingowow"
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg"
            />
            <span className="text-xl font-bold">Lingowow</span>
          </Link>
        </div>
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-sm font-medium hover:underline">
            Inicio
          </Link>
          <Link href="/courses" className="text-sm font-medium hover:underline">
            Cursos
          </Link>
          <Link href="/method" className="text-sm font-medium hover:underline">
            Método
          </Link>
          <Link href="/shop" className="text-sm font-medium hover:underline">
            Precios
          </Link>
          <Link href="/blog" className="text-sm font-medium hover:underline text-primary">
            Blog
          </Link>
          <Link href="/contact" className="text-sm font-medium hover:underline">
            Contacto
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          {!session ? (
            <>
              <Link href="/auth/signin" className="text-sm font-medium hover:underline">
                <Button variant="outline" size="sm">
                  Iniciar Sesión
                </Button>
              </Link>
              <Link href="/demo" className="text-sm font-medium hover:underline">
                <Button size="sm">Prueba Gratuita</Button>
              </Link>
            </>
          ) : (
            <Link href="/dashboard" className="text-sm font-medium hover:underline">
              <Button size="sm">Dashboard</Button>
            </Link>
          )}
          <CartSheet />
        </div>
      </div>
    </header>
  )
}

export default Header
