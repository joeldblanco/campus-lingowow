export const publicRoutes = [
  '/',
  '/auth/new-verification',
  '/shop',
  '/shop/*',
  '/library',
  '/library/*',
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
  '/record',
  '/record/*',
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

export const apiPublicRoutes = ['/api/contact', '/api/trial-class', '/api/plans', '/api/teachers/availability', '/api/library', '/api/library/*', '/api/livekit/recording-token']

export const DEFAULT_LOGIN_REDIRECT = '/dashboard'
