import { authenticator } from 'otplib'
import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'

const ISSUER = 'Lingowow'
const RECOVERY_CODE_COUNT = 10

// Tolerate ±1 time-step (30s) of clock drift between the server and the
// user's authenticator device.
authenticator.options = { window: 1 }

/** Generates a fresh base32 TOTP secret to store against the user. */
export function generateTotpSecret(): string {
  return authenticator.generateSecret()
}

/**
 * Builds the otpauth:// URI that authenticator apps (Google/Microsoft
 * Authenticator, 1Password, …) encode into a QR code.
 */
export function buildTotpAuthUri(accountName: string, secret: string): string {
  return authenticator.keyuri(accountName, ISSUER, secret)
}

/** Verifies a 6-digit TOTP token against a secret. Never throws. */
export function verifyTotpToken(token: string, secret: string): boolean {
  const normalized = (token ?? '').replace(/\s+/g, '')
  if (!/^\d{6}$/.test(normalized)) return false
  try {
    return authenticator.verify({ token: normalized, secret })
  } catch {
    return false
  }
}

/**
 * Generates single-use recovery codes (plaintext, shown to the user once).
 * Format: `xxxxx-xxxxx` (lowercase hex).
 */
export function generateRecoveryCodes(count: number = RECOVERY_CODE_COUNT): string[] {
  return Array.from({ length: count }, () => {
    const hex = randomBytes(5).toString('hex') // 10 hex chars
    return `${hex.slice(0, 5)}-${hex.slice(5)}`
  })
}

/**
 * Normalizes a recovery code for storage/comparison: lowercased, stripped of
 * any non-alphanumeric chars so dashes/spaces/casing never cause a mismatch.
 */
export function normalizeRecoveryCode(code: string): string {
  return (code ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** Hashes recovery codes with bcrypt for storage (never store plaintext). */
export function hashRecoveryCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map((code) => bcrypt.hash(normalizeRecoveryCode(code), 10)))
}

/**
 * Checks a submitted recovery code against the stored hashes. On a match,
 * returns the remaining hashes with the consumed one removed (single-use).
 */
export async function consumeRecoveryCode(
  input: string,
  hashedCodes: string[]
): Promise<{ matched: boolean; remaining: string[] }> {
  const normalized = normalizeRecoveryCode(input)
  if (!normalized) return { matched: false, remaining: hashedCodes }
  for (let i = 0; i < hashedCodes.length; i++) {
    if (await bcrypt.compare(normalized, hashedCodes[i])) {
      return { matched: true, remaining: hashedCodes.filter((_, idx) => idx !== i) }
    }
  }
  return { matched: false, remaining: hashedCodes }
}
