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

// "Público" aquí significa que el middleware no aplica la sesión de navegador:
// cada ruta hace su propia autenticación. `/api/mcp` autentica por API key
// (`authenticateMcpRequest`), valida host, aplica rate limit y verifica scopes
// por tool; sin esta entrada el middleware la redirigía a /auth/signin con 307
// y ningún cliente MCP externo podía llegar a la ruta.
export const apiPublicRoutes = ['/api/contact', '/api/trial-class', '/api/plans', '/api/teachers/availability', '/api/library', '/api/library/*', '/api/livekit/webhook', '/api/livekit/egress-recorder', '/api/livekit/egress-recorder/*', '/api/bot', '/api/mcp', '/api/mobile/shop/products', '/api/mobile/shop/plans', '/api/academic-periods/current', '/api/cron', '/api/exams', '/api/exams/*', '/api/api-keys', '/api/api-keys/*', '/api/lessons', '/api/lessons/*']

export const DEFAULT_LOGIN_REDIRECT = '/dashboard'
