import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'

import { getUserByEmail, getUserById } from '@/lib/actions/user'
import { SignInSchema } from '@/schemas/auth'
import { db } from '@/lib/db'
import { evaluateTwoFactor } from '@/lib/auth/two-factor-gate'
import bcrypt from 'bcryptjs'

export const runtime = 'nodejs'

export default {
  providers: [
    Credentials({
      async authorize(credentials) {
        // Manejar suplantación (inicio)
        if (credentials?.userId && credentials?.impersonationData) {
          const user = await getUserById(credentials.userId as string)
          if (user && !('error' in user)) {
            return {
              ...user,
              impersonationData: credentials.impersonationData as string,
            }
          }
          return null
        }

        // Manejar login directo por userId (para salir de suplantación)
        if (credentials?.userId && !credentials?.impersonationData) {
          const user = await getUserById(credentials.userId as string)
          if (user && !('error' in user)) {
            return user
          }
          return null
        }

        // Manejar login normal con email/password
        const validatedFields = SignInSchema.safeParse(credentials)

        if (validatedFields.success) {
          const { email, password } = validatedFields.data

          const user = await getUserByEmail(email)

          if (!user || 'error' in user || !user.password) return null

          const passwordMatch = await bcrypt.compare(password, user.password)

          if (!passwordMatch) return null

          // Two-factor gate: when 2FA is enabled the caller must also present a
          // valid TOTP token or a single-use recovery code. Fails closed.
          const code = typeof credentials?.code === 'string' ? credentials.code : ''
          const gate = await evaluateTwoFactor(user, code)

          if (gate.status === 'not_required' || gate.status === 'ok_totp') {
            return user
          }

          if (gate.status === 'ok_recovery') {
            await db.user.update({
              where: { id: user.id },
              data: { twoFactorRecoveryCodes: gate.remainingRecoveryCodes },
            })
            return user
          }

          // missing_code / invalid
          return null
        }

        return null
      },
    }),
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
} satisfies NextAuthConfig
