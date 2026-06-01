import { verifyTotpToken, consumeRecoveryCode } from './totp'

export interface TwoFactorGateUser {
  twoFactorEnabled: boolean
  twoFactorSecret: string | null
  twoFactorRecoveryCodes: string[]
}

export type TwoFactorGateResult =
  | { status: 'not_required' }
  | { status: 'missing_code' }
  | { status: 'invalid' }
  | { status: 'ok_totp' }
  | { status: 'ok_recovery'; remainingRecoveryCodes: string[] }

/**
 * Decides whether a sign-in attempt clears the 2FA gate.
 *
 * Pure decision logic (no DB writes) so every branch is unit-testable. The
 * caller is responsible for persisting `remainingRecoveryCodes` when a recovery
 * code is consumed.
 *
 * Trello card: auth.ts:120 "Add 2FA check".
 */
export async function evaluateTwoFactor(
  user: TwoFactorGateUser,
  code: string
): Promise<TwoFactorGateResult> {
  if (!user.twoFactorEnabled || !user.twoFactorSecret) {
    return { status: 'not_required' }
  }

  const normalized = (code ?? '').trim()
  if (!normalized) return { status: 'missing_code' }

  if (verifyTotpToken(normalized, user.twoFactorSecret)) {
    return { status: 'ok_totp' }
  }

  const { matched, remaining } = await consumeRecoveryCode(
    normalized,
    user.twoFactorRecoveryCodes ?? []
  )
  if (matched) {
    return { status: 'ok_recovery', remainingRecoveryCodes: remaining }
  }

  return { status: 'invalid' }
}
