import jwt from 'jsonwebtoken'
import { db } from '@/lib/db'
import { UserRole } from '@prisma/client'
import crypto from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET!
const ACCESS_TOKEN_EXPIRY = '15m' // 15 minutos
const REFRESH_TOKEN_EXPIRY_DAYS = 30

export interface JWTPayload {
  sub: string // userId
  email: string
  roles: UserRole[]
  iat: number
  exp: number
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number // timestamp en segundos
}

export interface MobileUser {
  id: string
  email: string
  name: string
  lastName: string | null
  roles: UserRole[]
  timezone: string
  image: string | null
}

/**
 * Genera un access token JWT
 */
export function generateAccessToken(user: { id: string; email: string; roles: UserRole[] }): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      roles: user.roles,
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  )
}

/**
 * Genera un refresh token aleatorio
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex')
}

/**
 * Hash del refresh token para almacenar en DB
 */
export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Genera ambos tokens y guarda el refresh token en la DB
 */
export async function generateAuthTokens(
  user: { id: string; email: string; roles: UserRole[] },
  deviceId?: string
): Promise<AuthTokens> {
  const accessToken = generateAccessToken(user)
  const refreshToken = generateRefreshToken()
  const hashedRefreshToken = hashRefreshToken(refreshToken)

  // Calcular fecha de expiración
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS)

  // Guardar refresh token en DB
  await db.refreshToken.create({
    data: {
      userId: user.id,
      token: hashedRefreshToken,
      deviceId,
      expiresAt,
    },
  })

  // Calcular expiresAt del access token (15 minutos desde ahora)
  const accessTokenExpiresAt = Math.floor(Date.now() / 1000) + 15 * 60

  return {
    accessToken,
    refreshToken,
    expiresAt: accessTokenExpiresAt,
  }
}

/**
 * Verifica un access token y retorna el payload
 */
export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload
    return payload
  } catch {
    return null
  }
}

/**
 * Extrae el token del header Authorization
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.slice(7)
}

/**
 * Verifica el refresh token y genera nuevos tokens
 */
export async function refreshAuthTokens(
  refreshToken: string,
  deviceId?: string
): Promise<AuthTokens | null> {
  const hashedToken = hashRefreshToken(refreshToken)

  // Buscar el refresh token en la DB
  const storedToken = await db.refreshToken.findUnique({
    where: { token: hashedToken },
    include: { user: true },
  })

  if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
    return null
  }

  // Revocar el token actual (rotación de tokens)
  await db.refreshToken.update({
    where: { id: storedToken.id },
    data: { isRevoked: true },
  })

  // Generar nuevos tokens
  return generateAuthTokens(
    {
      id: storedToken.user.id,
      email: storedToken.user.email,
      roles: storedToken.user.roles,
    },
    deviceId
  )
}

/**
 * Revoca todos los refresh tokens de un usuario (logout de todos los dispositivos)
 */
export async function revokeAllUserTokens(userId: string): Promise<void> {
  await db.refreshToken.updateMany({
    where: { userId, isRevoked: false },
    data: { isRevoked: true },
  })
}

/**
 * Revoca un refresh token específico
 */
export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  const hashedToken = hashRefreshToken(refreshToken)
  await db.refreshToken.updateMany({
    where: { token: hashedToken },
    data: { isRevoked: true },
  })
}

/**
 * Middleware helper para obtener el usuario autenticado de una request
 */
export async function getMobileUser(request: Request): Promise<MobileUser | null> {
  const authHeader = request.headers.get('Authorization')
  const token = extractBearerToken(authHeader)

  if (!token) {
    return null
  }

  const payload = verifyAccessToken(token)
  if (!payload) {
    return null
  }

  const user = await db.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      name: true,
      lastName: true,
      roles: true,
      timezone: true,
      image: true,
    },
  })

  return user
}

/**
 * Helper para respuestas de error de autenticación
 */
export function unauthorizedResponse(message = 'No autorizado') {
  return Response.json({ error: message }, { status: 401 })
}

/**
 * Helper para verificar roles
 */
export function hasRole(user: MobileUser, role: UserRole): boolean {
  return user.roles.includes(role)
}

/**
 * Helper para verificar si es estudiante
 */
export function isStudent(user: MobileUser): boolean {
  return hasRole(user, 'STUDENT')
}

/**
 * Helper para verificar si es profesor
 */
export function isTeacher(user: MobileUser): boolean {
  return hasRole(user, 'TEACHER')
}

/**
 * Helper para verificar si es admin
 */
export function isAdmin(user: MobileUser): boolean {
  return hasRole(user, 'ADMIN')
}
