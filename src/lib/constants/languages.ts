// Idiomas soportados para precios de planes
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'Inglés', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
] as const

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code']
