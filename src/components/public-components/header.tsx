'use client'

import { MobileFilterSheet } from '@/components/filters/mobile-filter-sheet'
import { CartDrawer } from '@/components/shop/cart/cart-drawer'
import { useShopStore } from '@/stores/useShopStore'
import { Menu, ShoppingCart } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { href: '/', label: 'Inicio' },
  { href: '/courses', label: 'Cursos' },
  { href: '/method', label: 'Método' },
  { href: '/shop', label: 'Precios' },
  { href: '/library', label: 'Biblioteca' },
  { href: '/contact', label: 'Contacto' },
] as const

const Header = () => {
  const { data: session } = useSession()
  const pathname = usePathname()
  const isShopRoute = pathname.startsWith('/shop')
  const { cart, isCartDrawerOpen, setCartDrawerOpen } = useShopStore()

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/65">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4 md:px-6">
        {/* Brand — left */}
        <div className="flex items-center gap-2">
          {isShopRoute && <MobileFilterSheet />}
          <Link
            href="/"
            className="flex items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Image
              src="/branding/logo.png"
              alt="Lingowow"
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg"
            />
            <span className="font-display text-xl font-bold lowercase tracking-tight">
              lingo<span className="text-teal">wow</span>
            </span>
          </Link>
        </div>

        {/* Links — centre */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? 'page' : undefined}
              className={cn(
                'rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive(link.href)
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Actions — right */}
        <div className="flex items-center gap-2 sm:gap-3">
          {!session ? (
            <>
              <Link href="/auth/signin" className="hidden sm:inline-flex">
                <Button variant="outline" size="sm" className="rounded-full">
                  Iniciar sesión
                </Button>
              </Link>
              <Link href="/demo">
                <Button size="sm" className="whitespace-nowrap rounded-full">
                  Prueba gratuita
                </Button>
              </Link>
            </>
          ) : (
            <Link href="/dashboard">
              <Button size="sm" className="rounded-full">
                Dashboard
              </Button>
            </Link>
          )}

          <Button
            variant="outline"
            size="icon"
            className="relative"
            aria-label="Carrito"
            onClick={() => setCartDrawerOpen(true)}
          >
            <ShoppingCart className="h-5 w-5" />
            {cart.length > 0 && (
              <Badge className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs">
                {cart.length}
              </Badge>
            )}
          </Button>
          <CartDrawer
            open={isCartDrawerOpen}
            onOpenChange={setCartDrawerOpen}
            suggestedProducts={[]}
          />

          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden" aria-label="Menú">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="font-lexend">Navegación</SheetTitle>
              </SheetHeader>
              <nav className="mt-2 flex flex-col px-2">
                {NAV_LINKS.map((link) => (
                  <SheetClose asChild key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={isActive(link.href) ? 'page' : undefined}
                      className={cn(
                        'rounded-md px-3 py-3 text-base font-medium transition-colors',
                        isActive(link.href)
                          ? 'bg-secondary text-foreground'
                          : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                      )}
                    >
                      {link.label}
                    </Link>
                  </SheetClose>
                ))}
                {!session && (
                  <SheetClose asChild>
                    <Link
                      href="/auth/signin"
                      className="mt-2 rounded-md px-3 py-3 text-base font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      Iniciar sesión
                    </Link>
                  </SheetClose>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

export default Header
