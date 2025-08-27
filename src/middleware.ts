import authConfig from '@/auth.config'
import { ROLES } from '@/lib/constants'
import {
  adminPrefix,
  apiAuthPrefix,
  authRoutes,
  DEFAULT_LOGIN_REDIRECT,
  publicRoutes,
} from '@/routes'
import NextAuth from 'next-auth'
import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'

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
  const isAdmin = token?.role === ROLES.ADMIN

  const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix)
  const isAdminAuthRoute = nextUrl.pathname.startsWith(adminPrefix)
  const isPublicRoute = matchesPathPattern(nextUrl.pathname, publicRoutes)
  const isAuthRoute = authRoutes.includes(nextUrl.pathname)

  if (isApiAuthRoute) {
    return NextResponse.next()
  }

  if (isAuthRoute) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL(DEFAULT_LOGIN_REDIRECT, nextUrl))
    }
    return NextResponse.next()
  }

  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL('/auth/signin', nextUrl))
  }

  if (isAdminAuthRoute) {
    if (!isAdmin) {
      return NextResponse.redirect(new URL('/not-authorized', nextUrl))
    }
  }

  return NextResponse.next()
})

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
