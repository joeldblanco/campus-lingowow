import { z } from 'zod'
import {
  LibraryResourceAccess,
  LibraryResourceStatus,
  LibraryResourceType,
  Prisma,
} from '@prisma/client'
import { db } from '@/lib/db'
import { getMcpContext } from '@/lib/mcp/context'
import { McpToolError } from '@/lib/mcp/errors'
import type { AnyToolModule } from '@/lib/mcp/types'

const libraryTypeEnum = z.nativeEnum(LibraryResourceType)
const libraryStatusEnum = z.nativeEnum(LibraryResourceStatus)
const libraryAccessEnum = z.nativeEnum(LibraryResourceAccess)

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

async function ensureUniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || `resource-${Date.now()}`
  let slug = root
  let counter = 1
  while (await db.libraryResource.findUnique({ where: { slug } })) {
    slug = `${root}-${counter}`
    counter += 1
  }
  return slug
}

export const libraryTools: AnyToolModule[] = [
  {
    name: 'lingowow_library_list',
    description:
      'Lista recursos de la biblioteca con filtros (type, status, accessLevel, language, level, categoryId, search, tag). Para admins muestra todos los estados (incluido DRAFT/ARCHIVED).',
    scopes: ['mcp:library:read'],
    inputShape: {
      type: libraryTypeEnum.optional(),
      status: libraryStatusEnum.optional(),
      accessLevel: libraryAccessEnum.optional(),
      language: z.string().optional(),
      level: z.string().optional(),
      categoryId: z.string().optional(),
      tag: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().int().min(1).max(200).optional().default(50),
      offset: z.number().int().min(0).optional().default(0),
    },
    handler: async (args) => {
      const where: Prisma.LibraryResourceWhereInput = {}
      if (args.type) where.type = args.type
      if (args.status) where.status = args.status
      if (args.accessLevel) where.accessLevel = args.accessLevel
      if (args.language) where.language = args.language
      if (args.level) where.level = args.level
      if (args.categoryId) where.categoryId = args.categoryId
      if (args.tag) where.tags = { has: args.tag }
      if (args.search) {
        where.OR = [
          { title: { contains: args.search, mode: 'insensitive' } },
          { description: { contains: args.search, mode: 'insensitive' } },
          { tags: { has: args.search } },
        ]
      }
      const [resources, total] = await Promise.all([
        db.libraryResource.findMany({
          where,
          include: {
            category: true,
            author: { select: { id: true, name: true, lastName: true, email: true } },
            _count: { select: { userLikes: true, userSaves: true } },
          },
          orderBy: { publishedAt: 'desc' },
          skip: args.offset,
          take: args.limit,
        }),
        db.libraryResource.count({ where }),
      ])
      return { total, limit: args.limit, offset: args.offset, resources }
    },
  },

  {
    name: 'lingowow_library_get',
    description: 'Obtiene un recurso por ID o por slug.',
    scopes: ['mcp:library:read'],
    inputShape: {
      id: z.string().optional(),
      slug: z.string().optional(),
    },
    handler: async ({ id, slug }) => {
      if (!id && !slug) throw new McpToolError('Indica id o slug', 'BAD_REQUEST')
      const where = id ? { id } : { slug: slug! }
      const resource = await db.libraryResource.findUnique({
        where,
        include: {
          category: true,
          author: { select: { id: true, name: true, lastName: true, email: true } },
          _count: { select: { userLikes: true, userSaves: true } },
        },
      })
      if (!resource) throw new McpToolError('Recurso no encontrado', 'NOT_FOUND')
      return resource
    },
  },

  {
    name: 'lingowow_library_categories_list',
    description: 'Lista las categorías de la biblioteca.',
    scopes: ['mcp:library:read'],
    handler: async () =>
      db.libraryCategory.findMany({
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
  },

  {
    name: 'lingowow_library_create',
    description:
      'Crea un recurso de biblioteca. authorId debe ser un usuario válido. Si status=PUBLISHED, se setea publishedAt automáticamente. El slug se deriva del título y se garantiza único.',
    scopes: ['mcp:library:write'],
    inputShape: {
      title: z.string().min(3).max(200),
      description: z.string().optional(),
      excerpt: z.string().optional(),
      type: libraryTypeEnum,
      status: libraryStatusEnum.default(LibraryResourceStatus.DRAFT),
      accessLevel: libraryAccessEnum.default(LibraryResourceAccess.PUBLIC),
      content: z.string().optional(),
      fileUrl: z.string().url().optional(),
      fileSize: z.number().int().min(0).optional(),
      fileFormat: z.string().optional(),
      thumbnailUrl: z.string().url().optional(),
      duration: z.number().int().min(0).optional(),
      language: z.string().default('es'),
      level: z.string().optional(),
      tags: z.array(z.string()).default([]),
      categoryId: z.string().optional(),
      authorId: z.string().min(1).optional().describe('Si se omite, usa el dueño de la API key'),
    },
    handler: async (args) => {
      const authorId = args.authorId ?? getMcpContext()?.userId
      if (!authorId) {
        throw new McpToolError('authorId requerido (o ejecuta con un usuario MCP)', 'BAD_REQUEST')
      }
      const slug = await ensureUniqueSlug(args.title)
      const resource = await db.libraryResource.create({
        data: {
          title: args.title,
          slug,
          description: args.description,
          excerpt: args.excerpt,
          type: args.type,
          status: args.status,
          accessLevel: args.accessLevel,
          content: args.content,
          fileUrl: args.fileUrl,
          fileSize: args.fileSize,
          fileFormat: args.fileFormat,
          thumbnailUrl: args.thumbnailUrl,
          duration: args.duration,
          language: args.language,
          level: args.level,
          tags: args.tags,
          categoryId: args.categoryId,
          authorId,
          publishedAt: args.status === LibraryResourceStatus.PUBLISHED ? new Date() : null,
        },
      })
      return resource
    },
  },

  {
    name: 'lingowow_library_update',
    description:
      'Actualiza un recurso existente. Si se cambia status a PUBLISHED y publishedAt era null, se setea ahora. El slug no se cambia automáticamente al editar el título.',
    scopes: ['mcp:library:write'],
    inputShape: {
      id: z.string().min(1),
      title: z.string().min(3).max(200).optional(),
      description: z.string().nullable().optional(),
      excerpt: z.string().nullable().optional(),
      type: libraryTypeEnum.optional(),
      status: libraryStatusEnum.optional(),
      accessLevel: libraryAccessEnum.optional(),
      content: z.string().nullable().optional(),
      fileUrl: z.string().url().nullable().optional(),
      fileSize: z.number().int().min(0).nullable().optional(),
      fileFormat: z.string().nullable().optional(),
      thumbnailUrl: z.string().url().nullable().optional(),
      duration: z.number().int().min(0).nullable().optional(),
      language: z.string().optional(),
      level: z.string().nullable().optional(),
      tags: z.array(z.string()).optional(),
      categoryId: z.string().nullable().optional(),
    },
    handler: async ({ id, ...rest }) => {
      const existing = await db.libraryResource.findUnique({ where: { id } })
      if (!existing) throw new McpToolError('Recurso no encontrado', 'NOT_FOUND')

      const updates: Prisma.LibraryResourceUpdateInput = {}
      if (rest.title !== undefined) updates.title = rest.title
      if (rest.description !== undefined) updates.description = rest.description
      if (rest.excerpt !== undefined) updates.excerpt = rest.excerpt
      if (rest.type !== undefined) updates.type = rest.type
      if (rest.status !== undefined) {
        updates.status = rest.status
        if (rest.status === LibraryResourceStatus.PUBLISHED && !existing.publishedAt) {
          updates.publishedAt = new Date()
        }
      }
      if (rest.accessLevel !== undefined) updates.accessLevel = rest.accessLevel
      if (rest.content !== undefined) updates.content = rest.content
      if (rest.fileUrl !== undefined) updates.fileUrl = rest.fileUrl
      if (rest.fileSize !== undefined) updates.fileSize = rest.fileSize
      if (rest.fileFormat !== undefined) updates.fileFormat = rest.fileFormat
      if (rest.thumbnailUrl !== undefined) updates.thumbnailUrl = rest.thumbnailUrl
      if (rest.duration !== undefined) updates.duration = rest.duration
      if (rest.language !== undefined) updates.language = rest.language
      if (rest.level !== undefined) updates.level = rest.level
      if (rest.tags !== undefined) updates.tags = rest.tags
      if (rest.categoryId !== undefined) {
        updates.category = rest.categoryId
          ? { connect: { id: rest.categoryId } }
          : { disconnect: true }
      }

      return db.libraryResource.update({ where: { id }, data: updates })
    },
  },

  {
    name: 'lingowow_library_delete',
    description: 'Elimina un recurso de biblioteca permanentemente.',
    scopes: ['mcp:library:write'],
    inputShape: { id: z.string().min(1) },
    handler: async ({ id }) => {
      await db.libraryResource.delete({ where: { id } })
      return { success: true }
    },
  },

  {
    name: 'lingowow_library_categories_create',
    description: 'Crea una categoría de biblioteca. slug se deriva del nombre si no se proporciona.',
    scopes: ['mcp:library:write'],
    inputShape: {
      name: z.string().min(1).max(100),
      slug: z.string().optional(),
      description: z.string().optional(),
      icon: z.string().optional(),
      color: z.string().optional(),
      sortOrder: z.number().int().default(0),
      isActive: z.boolean().default(true),
    },
    handler: async (args) => {
      let slug = args.slug ? slugify(args.slug) : slugify(args.name)
      let counter = 1
      while (await db.libraryCategory.findUnique({ where: { slug } })) {
        slug = `${slug}-${counter++}`
      }
      return db.libraryCategory.create({
        data: {
          name: args.name,
          slug,
          description: args.description,
          icon: args.icon,
          color: args.color,
          sortOrder: args.sortOrder,
          isActive: args.isActive,
        },
      })
    },
  },

  {
    name: 'lingowow_library_categories_update',
    description: 'Actualiza una categoría de biblioteca.',
    scopes: ['mcp:library:write'],
    inputShape: {
      id: z.string().min(1),
      name: z.string().min(1).max(100).optional(),
      description: z.string().nullable().optional(),
      icon: z.string().nullable().optional(),
      color: z.string().nullable().optional(),
      sortOrder: z.number().int().optional(),
      isActive: z.boolean().optional(),
    },
    handler: async ({ id, ...data }) =>
      db.libraryCategory.update({ where: { id }, data }),
  },

  {
    name: 'lingowow_library_categories_delete',
    description: 'Elimina una categoría de biblioteca. Falla si tiene recursos asociados.',
    scopes: ['mcp:library:write'],
    inputShape: { id: z.string().min(1) },
    handler: async ({ id }) => {
      const count = await db.libraryResource.count({ where: { categoryId: id } })
      if (count > 0) {
        throw new McpToolError(
          `No se puede eliminar: la categoría tiene ${count} recurso(s) asociado(s)`,
          'BAD_REQUEST'
        )
      }
      await db.libraryCategory.delete({ where: { id } })
      return { success: true }
    },
  },
]
