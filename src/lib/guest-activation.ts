import { db } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'
import { sendAccountActivationEmail } from '@/lib/mail'

/**
 * Account-activation / set-password flow for guests created during checkout.
 *
 * A guest who pays without an account ends up as a `User` row with no
 * `password`. We mint a single-use, time-boxed token in the SHARED
 * `PasswordResetToken` table and email an "activa tu cuenta / crea tu
 * contraseña" link that points at the existing `/auth/new-password` form.
 *
 * Consumption reuses the existing `newPassword` server action (see
 * `src/lib/actions/auth.ts`): it hashes the chosen password and deletes the
 * token, so activation inherits the same security model as a password reset —
 * single-use, expiring, bcrypt. The only differences are a friendlier TTL
 * (24h, suited to a thank-you email) and the email copy.
 */
export const GUEST_ACTIVATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000 // 24h

/**
 * Creates a single-use activation token in the `PasswordResetToken` table.
 * Any prior token for the email is cleared first so only one activation link
 * is ever live per address.
 */
export const createGuestActivationToken = async (
  email: string,
  ttlMs: number = GUEST_ACTIVATION_TOKEN_TTL_MS
) => {
  const token = uuidv4()
  const expires = new Date(Date.now() + ttlMs)

  await db.passwordResetToken.deleteMany({ where: { email } })

  return db.passwordResetToken.create({
    data: { email, token, expires },
  })
}

/**
 * Mints an activation token and emails the set-password link. Returns
 * `{ success }` and never throws — a mail or token failure must not break the
 * payment-provisioning flow that calls it.
 */
export const sendGuestActivationEmail = async (params: {
  email: string
  name?: string | null
  ttlMs?: number
}): Promise<{ success: boolean; error?: string }> => {
  try {
    const record = await createGuestActivationToken(params.email, params.ttlMs)
    await sendAccountActivationEmail(params.email, record.token, params.name ?? undefined)
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[GUEST ACTIVATION] Failed to send activation email:', message)
    return { success: false, error: message }
  }
}
