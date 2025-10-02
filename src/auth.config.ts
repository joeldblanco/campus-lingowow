import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'

import { getUserByEmail, getUserById } from '@/lib/actions/user'
import { SignInSchema } from '@/schemas/auth'
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

          if (passwordMatch) return user
        }

        return null
      },
    }),
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
} satisfies NextAuthConfig
