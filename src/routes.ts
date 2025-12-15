export const publicRoutes = [
  '/',
  '/auth/new-verification',
  '/shop',
  '/shop/*',
  '/blog',
  '/blog/*',
  '/demo',
  '/courses',
  '/method',
  '/contact',
  '/faq',
  '/pricing',
  '/resources',
  '/resources/*',
  '/terms',
  '/privacy',
  '/cookies',
  '/checkout',
  '/checkout/*',
  '/about',
]

export const authRoutes = [
  '/auth/signin',
  '/auth/signup',
  '/auth/error',
  '/auth/reset',
  '/auth/new-password',
  '/auth/verification',
]

export const adminPrefix = '/admin'

export const apiAuthPrefix = '/api/auth'

export const apiPublicRoutes = ['/api/contact', '/api/trial-class']

export const DEFAULT_LOGIN_REDIRECT = '/dashboard'
