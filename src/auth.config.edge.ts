import type { NextAuthConfig } from 'next-auth'

// Lightweight auth config for Edge Runtime (middleware)
// No heavy dependencies like bcryptjs or Prisma
export default {
  providers: [],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
} satisfies NextAuthConfig
