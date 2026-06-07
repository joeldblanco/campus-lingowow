// Un hash bcrypt tiene el formato: `$2a$|$2b$|$2y$` + coste de 2 dígitos + 53
// caracteres (salt + hash en base64 propio de bcrypt) = 60 chars en total.
// Cualquier valor que no matchee se considera texto plano (sin hashear).
export const BCRYPT_HASH_RE = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/

/**
 * Indica si un valor ya está hasheado con bcrypt. Sirve para no re-hashear
 * (doble hash) contraseñas que ya están protegidas.
 */
export function isBcryptHash(value: string | null | undefined): boolean {
  if (!value) return false
  return BCRYPT_HASH_RE.test(value)
}
