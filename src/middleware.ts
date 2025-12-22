import authConfig from '@/auth.config.edge'
import { ROLES } from '@/lib/constants'
import {
  adminPrefix,
  apiAuthPrefix,
  apiPublicRoutes,
  authRoutes,
  DEFAULT_LOGIN_REDIRECT,
  publicRoutes,
} from '@/routes'
import NextAuth from 'next-auth'
import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'

// Helper function to get primary role from array
function getPrimaryRoleFromArray(roles: string[]): string {
  if (!roles || roles.length === 0) return ROLES.GUEST

  // Priority order: ADMIN > TEACHER > STUDENT > GUEST
  if (roles.includes(ROLES.ADMIN)) return ROLES.ADMIN
  if (roles.includes(ROLES.TEACHER)) return ROLES.TEACHER
  if (roles.includes(ROLES.STUDENT)) return ROLES.STUDENT
  return ROLES.GUEST
}

const { auth } = NextAuth(authConfig)
const secret = process.env.JWT_SECRET

export default auth(async (req) => {
  const { nextUrl } = req

  const token = await getToken({
    req,
    secret,
    secureCookie: process.env.NODE_ENV === 'production' ? true : false,
  })

  const isLoggedIn = !!token
  const userRoles = (token?.roles as string[]) || []
  const isAdmin = userRoles.includes(ROLES.ADMIN)
  const primaryRole = getPrimaryRoleFromArray(userRoles)

  const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix)
  const isApiPayPalRoute = nextUrl.pathname.startsWith('/api/paypal')
  const isApiNiubizRoute = nextUrl.pathname.startsWith('/api/niubiz')
  const isAdminAuthRoute = nextUrl.pathname.startsWith(adminPrefix)
  const isPublicRoute = matchesPathPattern(nextUrl.pathname, publicRoutes)
  const isAuthRoute = authRoutes.includes(nextUrl.pathname)

  // Permitir rutas de API de autenticación
  if (isApiAuthRoute) {
    return NextResponse.next()
  }

  // Permitir rutas de API de PayPal (requieren autenticación interna)
  if (isApiPayPalRoute) {
    return NextResponse.next()
  }

  // Permitir rutas de API de Niubiz (Checkout funciona como Guest)
  if (isApiNiubizRoute) {
    return NextResponse.next()
  }

  // Permitir rutas de API públicas (formularios de contacto)
  if (apiPublicRoutes.includes(nextUrl.pathname)) {
    return NextResponse.next()
  }

  if (isAuthRoute) {
    if (isLoggedIn) {
      // Redirigir según el rol del usuario después del login
      const redirectUrl = getRoleBasedRedirect(primaryRole, nextUrl.searchParams.get('callbackUrl'))
      return NextResponse.redirect(new URL(redirectUrl, nextUrl))
    }
    return NextResponse.next()
  }

  if (!isLoggedIn && !isPublicRoute) {
    // Preservar la URL original para redirección después del login
    const signInUrl = new URL('/auth/signin', nextUrl)
    if (nextUrl.pathname !== '/' && nextUrl.pathname !== '/dashboard') {
      signInUrl.searchParams.set('callbackUrl', nextUrl.pathname + nextUrl.search)
    }
    return NextResponse.redirect(signInUrl)
  }

  if (isAdminAuthRoute) {
    if (!isAdmin) {
      return NextResponse.redirect(new URL('/not-authorized', nextUrl))
    }
  }

  return NextResponse.next()
})

// Función para determinar redirección basada en rol
function getRoleBasedRedirect(primaryRole: string, callbackUrl: string | null): string {
  // Si hay una URL de callback específica, úsala (pero validarla)
  if (callbackUrl) {
    // Validar que la callback URL sea segura
    if (callbackUrl.startsWith('/admin') && primaryRole === ROLES.ADMIN) {
      return callbackUrl
    }
    if (
      callbackUrl.startsWith('/classroom') &&
      (primaryRole === ROLES.TEACHER || primaryRole === ROLES.ADMIN)
    ) {
      return callbackUrl
    }
    if (!callbackUrl.startsWith('/admin') && !callbackUrl.startsWith('/api')) {
      return callbackUrl
    }
  }

  // Redirección por defecto basada en rol
  switch (primaryRole) {
    case ROLES.ADMIN:
      return '/admin'
    case ROLES.TEACHER:
      return '/classroom'
    case ROLES.STUDENT:
    default:
      return DEFAULT_LOGIN_REDIRECT
  }
}

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trcp)(.*)'],
}

const matchesPathPattern = (path: string, patterns: string[]) => {
  return patterns.some((pattern) => {
    // Caso exacto
    if (!pattern.includes('*')) return pattern === path

    // Caso con comodín
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1)
      return path.startsWith(prefix)
    }

    return false
  })
}
