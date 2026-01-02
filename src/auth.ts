import NextAuth, { type DefaultSession } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'

import { db } from '@/lib/db'
import authConfig from '@/auth.config'
import { getUserById } from '@/lib/actions/user'
import { UserRole } from '@prisma/client'

declare module 'next-auth' {
  /**
   * Returned by `auth`, `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      /** The user's roles. */
      roles: UserRole[]

      /** The user's last name. */
      lastName: string | null

      /** Datos de suplantación */
      isImpersonating?: boolean
      originalUserId?: string
      impersonationData?: string
      /**
       * By default, TypeScript merges new interface properties and overwrites existing ones.
       * In this case, the default session user properties will be overwritten,
       * with the new ones defined above. To keep the default session user properties,
       * you need to add them back into the newly declared interface.
       */
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  /** Returned by the `jwt` callback and `auth`, when using JWT sessions */
  interface JWT {
    /** OpenID ID Token */
    roles: UserRole[]
    lastName?: string

    /** Datos de suplantación */
    isImpersonating?: boolean
    originalUserId?: string
    impersonationData?: string
  }
}

export const {
  handlers: { GET, POST },
  signIn,
  signOut,
  auth,
} = NextAuth({
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  events: {
    async linkAccount({ user }) {
      await db.user.update({
        where: {
          id: user.id,
        },
        data: {
          emailVerified: new Date(),
        },
      })
    },
  },
  callbacks: {
    async signIn({ user, account }) {
      // Allow OAuth without email verification
      if (account?.provider === 'credentials') {
        if (!user.id) return false

        const existingUser = await getUserById(user.id)

        if (!existingUser || 'error' in existingUser || !existingUser.emailVerified) return false
      }

      // TODO: Add 2FA check

      return true
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.sub) session.user.id = token.sub

        if (token.roles) session.user.roles = token.roles

        session.user.lastName = token.lastName as string | null

        // Pasar datos de suplantación a la sesión
        if (token.isImpersonating) {
          session.user.isImpersonating = token.isImpersonating
          session.user.originalUserId = token.originalUserId
          session.user.impersonationData = token.impersonationData
        }
      }

      return session
    },
    async jwt({ token, user }) {
      if (!token.sub) return token

      // Manejar datos de suplantación desde el objeto user (cuando se hace signIn)
      if (user && 'impersonationData' in user && user.impersonationData) {
        token.impersonationData = user.impersonationData as string
        const impersonationData = JSON.parse(user.impersonationData as string)
        token.isImpersonating = true
        token.originalUserId = impersonationData.originalUserId
      }

      // Obtener datos del usuario actual
      const userId = token.sub
      const existingUser = await getUserById(userId)

      if (!existingUser || 'error' in existingUser) return token

      // Actualizar token con datos del usuario
      token.roles = existingUser.roles
      token.lastName = existingUser.lastName ?? undefined

      return token
    },
  },
  adapter: PrismaAdapter(db),
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === 'production'
          ? '__Secure-authjs.session-token'
          : 'authjs.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  secret: process.env.JWT_SECRET,
  ...authConfig,
})
