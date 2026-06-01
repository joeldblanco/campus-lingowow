'use server'

import QRCode from 'qrcode'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import {
  generateTotpSecret,
  buildTotpAuthUri,
  verifyTotpToken,
  generateRecoveryCodes,
  hashRecoveryCodes,
} from '@/lib/auth/totp'

/**
 * Two-factor authentication (TOTP) — enrollment backend.
 *
 * Opt-in per user. Enforcement at sign-in time is wired separately so that
 * shipping this slice cannot lock anyone out (nothing reads twoFactorEnabled
 * during login until that wiring lands).
 *
 * Trello card: auth.ts:120 "Add 2FA check".
 */

export async function getTwoFactorStatus() {
  const session = await auth()
  if (!session?.user?.id) return { success: false, message: 'No autenticado' }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { twoFactorEnabled: true, twoFactorRecoveryCodes: true },
  })
  if (!user) return { success: false, message: 'Usuario no encontrado' }

  return {
    success: true,
    message: 'OK',
    data: {
      enabled: user.twoFactorEnabled,
      remainingRecoveryCodes: user.twoFactorRecoveryCodes.length,
    },
  }
}

/**
 * Begins enrollment: returns a fresh secret + QR for the user to scan.
 * Does NOT persist anything — 2FA only turns on once enableTwoFactor confirms
 * the user can produce a valid token.
 */
export async function startTwoFactorSetup() {
  const session = await auth()
  if (!session?.user?.id || !session.user.email) {
    return { success: false, message: 'No autenticado' }
  }

  const secret = generateTotpSecret()
  const otpauthUri = buildTotpAuthUri(session.user.email, secret)
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri)

  return {
    success: true,
    message: 'OK',
    data: { secret, otpauthUri, qrCodeDataUrl },
  }
}

/**
 * Confirms enrollment: verifies the first token against the pending secret and,
 * on success, enables 2FA and returns one-time recovery codes (shown once).
 */
export async function enableTwoFactor(secret: string, token: string) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, message: 'No autenticado' }

  if (!verifyTotpToken(token, secret)) {
    return { success: false, message: 'Código inválido. Revisa tu app de autenticación.' }
  }

  const recoveryCodes = generateRecoveryCodes()
  const hashedRecoveryCodes = await hashRecoveryCodes(recoveryCodes)

  await db.user.update({
    where: { id: session.user.id },
    data: {
      twoFactorEnabled: true,
      twoFactorSecret: secret,
      twoFactorRecoveryCodes: hashedRecoveryCodes,
    },
  })

  return {
    success: true,
    message: 'Autenticación de dos factores activada.',
    data: { recoveryCodes },
  }
}

/**
 * Disables 2FA after re-confirming possession of the authenticator with a
 * current token (works for both credential and OAuth users — no password
 * dependency).
 */
export async function disableTwoFactor(token: string) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, message: 'No autenticado' }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { twoFactorEnabled: true, twoFactorSecret: true },
  })

  if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
    return { success: false, message: 'La autenticación de dos factores no está activada.' }
  }

  if (!verifyTotpToken(token, user.twoFactorSecret)) {
    return { success: false, message: 'Código inválido.' }
  }

  await db.user.update({
    where: { id: session.user.id },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorRecoveryCodes: [],
    },
  })

  return { success: true, message: 'Autenticación de dos factores desactivada.' }
}
