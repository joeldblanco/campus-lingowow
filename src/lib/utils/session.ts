import { auth } from '@/auth'

export async function getCurrentUser() {
  try {
    const session = await auth()
    return session?.user || null
  } catch (error) {
    console.error('Error obteniendo el usuario:', error)
    return null
  }
}
