'use server'

import { auth } from '@/auth'
import { db as prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { BlogStatus, UserRole } from '@prisma/client'
import type { Prisma } from '@prisma/client'
import { getCurrentDate } from '@/lib/utils/date'

// Verificar si el usuario tiene permisos de editor
async function checkEditorPermission() {
  const session = await auth()
  if (!session?.user) {
    throw new Error('No autenticado')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { roles: true },
  })

  if (!user || (!user.roles.includes(UserRole.EDITOR) && !user.roles.includes(UserRole.ADMIN))) {
    throw new Error('No tienes permisos para gestionar blog posts')
  }

  return session.user.id
}

// Generar slug único desde el título
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/[^a-z0-9\s-]/g, '') // Eliminar caracteres especiales
    .trim()
    .replace(/\s+/g, '-') // Reemplazar espacios con guiones
    .replace(/-+/g, '-') // Eliminar guiones múltiples
}

// Crear blog post
export async function createBlogPost(data: {
  title: string
  excerpt?: string
  content: Prisma.JsonValue // JSON estructurado
  coverImage?: string
  category?: string
  tags?: string[]
  status?: BlogStatus
  metaTitle?: string
  metaDescription?: string
}) {
  try {
    const authorId = await checkEditorPermission()

    // Generar slug único
    let slug = generateSlug(data.title)
    let slugExists = await prisma.blogPost.findUnique({ where: { slug } })
    let counter = 1

    while (slugExists) {
      slug = `${generateSlug(data.title)}-${counter}`
      slugExists = await prisma.blogPost.findUnique({ where: { slug } })
      counter++
    }

    // Calcular tiempo de lectura estimado (palabras por minuto)
    const wordCount = JSON.stringify(data.content).split(/\s+/).length
    const readTime = Math.ceil(wordCount / 200) // 200 palabras por minuto

    const blogPost = await prisma.blogPost.create({
      data: {
        title: data.title,
        slug,
        excerpt: data.excerpt,
        content: data.content as Prisma.InputJsonValue,
        coverImage: data.coverImage,
        category: data.category,
        tags: data.tags || [],
        status: data.status || BlogStatus.DRAFT,
        author: {
          connect: {
            id: authorId,
          },
        },
        readTime,
        metaTitle: data.metaTitle || data.title,
        metaDescription: data.metaDescription || data.excerpt,
        publishedAt: data.status === BlogStatus.PUBLISHED ? getCurrentDate() : null,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            lastName: true,
            image: true,
            bio: true,
          },
        },
      },
    })

    revalidatePath('/blog')
    revalidatePath('/editor/blog')

    return { success: true, blogPost }
  } catch (error) {
    console.error('Error creating blog post:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear el blog post',
    }
  }
}

// Actualizar blog post
export async function updateBlogPost(
  id: string,
  data: {
    title?: string
    excerpt?: string
    content?: Prisma.JsonValue
    coverImage?: string
    category?: string
    tags?: string[]
    status?: BlogStatus
    metaTitle?: string
    metaDescription?: string
  }
) {
  try {
    await checkEditorPermission()

    const existingPost = await prisma.blogPost.findUnique({ where: { id } })
    if (!existingPost) {
      throw new Error('Blog post no encontrado')
    }

    // Si cambia el título, regenerar slug
    let slug = existingPost.slug
    if (data.title && data.title !== existingPost.title) {
      slug = generateSlug(data.title)
      let slugExists = await prisma.blogPost.findFirst({
        where: { slug, id: { not: id } },
      })
      let counter = 1

      while (slugExists) {
        slug = `${generateSlug(data.title)}-${counter}`
        slugExists = await prisma.blogPost.findFirst({
          where: { slug, id: { not: id } },
        })
        counter++
      }
    }

    // Recalcular tiempo de lectura si cambia el contenido
    let readTime = existingPost.readTime
    if (data.content) {
      const wordCount = JSON.stringify(data.content).split(/\s+/).length
      readTime = Math.ceil(wordCount / 200)
    }

    // Si se publica por primera vez, establecer publishedAt
    let publishedAt = existingPost.publishedAt
    if (
      data.status === BlogStatus.PUBLISHED &&
      existingPost.status !== BlogStatus.PUBLISHED &&
      !publishedAt
    ) {
      publishedAt = getCurrentDate()
    }

    const updateData: Prisma.BlogPostUpdateInput = {
      title: data.title,
      excerpt: data.excerpt,
      coverImage: data.coverImage,
      category: data.category,
      tags: data.tags,
      status: data.status,
      metaTitle: data.metaTitle,
      metaDescription: data.metaDescription,
      slug,
      readTime,
      publishedAt,
    }

    if (data.content) {
      updateData.content = data.content as Prisma.InputJsonValue
    }

    const blogPost = await prisma.blogPost.update({
      where: { id },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            lastName: true,
            image: true,
            bio: true,
          },
        },
      },
    })

    revalidatePath('/blog')
    revalidatePath(`/blog/${blogPost.slug}`)
    revalidatePath('/editor/blog')

    return { success: true, blogPost }
  } catch (error) {
    console.error('Error updating blog post:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar el blog post',
    }
  }
}

// Eliminar blog post
export async function deleteBlogPost(id: string) {
  try {
    await checkEditorPermission()

    const blogPost = await prisma.blogPost.findUnique({ where: { id } })
    if (!blogPost) {
      throw new Error('Blog post no encontrado')
    }

    await prisma.blogPost.delete({ where: { id } })

    revalidatePath('/blog')
    revalidatePath('/editor/blog')

    return { success: true }
  } catch (error) {
    console.error('Error deleting blog post:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar el blog post',
    }
  }
}

// Obtener blog post por slug (público)
export async function getBlogPostBySlug(slug: string) {
  try {
    const blogPost = await prisma.blogPost.findUnique({
      where: { slug, status: BlogStatus.PUBLISHED },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            lastName: true,
            image: true,
            bio: true,
          },
        },
      },
    })

    if (!blogPost) {
      return { success: false, error: 'Blog post no encontrado' }
    }

    // Incrementar contador de vistas
    await prisma.blogPost.update({
      where: { id: blogPost.id },
      data: { views: { increment: 1 } },
    })

    return { success: true, blogPost }
  } catch (error) {
    console.error('Error fetching blog post:', error)
    return {
      success: false,
      error: 'Error al cargar el blog post',
    }
  }
}

// Obtener blog post por ID (para editor)
export async function getBlogPostById(id: string) {
  try {
    await checkEditorPermission()

    const blogPost = await prisma.blogPost.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            lastName: true,
            image: true,
            bio: true,
          },
        },
      },
    })

    if (!blogPost) {
      return { success: false, error: 'Blog post no encontrado' }
    }

    return { success: true, blogPost }
  } catch (error) {
    console.error('Error fetching blog post:', error)
    return {
      success: false,
      error: 'Error al cargar el blog post',
    }
  }
}

// Listar blog posts (público)
export async function getPublishedBlogPosts(params?: {
  category?: string
  tag?: string
  limit?: number
  offset?: number
}) {
  try {
    const where: Prisma.BlogPostWhereInput = { status: BlogStatus.PUBLISHED }

    if (params?.category) {
      where.category = params.category
    }

    if (params?.tag) {
      where.tags = { has: params.tag }
    }

    const [blogPosts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              lastName: true,
              image: true,
            },
          },
        },
        orderBy: { publishedAt: 'desc' },
        take: params?.limit || 10,
        skip: params?.offset || 0,
      }),
      prisma.blogPost.count({ where }),
    ])

    return { success: true, blogPosts, total }
  } catch (error) {
    console.error('Error fetching blog posts:', error)
    return {
      success: false,
      error: 'Error al cargar los blog posts',
      blogPosts: [],
      total: 0,
    }
  }
}

// Listar todos los blog posts (para editor)
export async function getAllBlogPosts(params?: {
  status?: BlogStatus
  limit?: number
  offset?: number
}) {
  try {
    await checkEditorPermission()

    const where: Prisma.BlogPostWhereInput = {}

    if (params?.status) {
      where.status = params.status
    }

    const [blogPosts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              lastName: true,
              image: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: params?.limit || 20,
        skip: params?.offset || 0,
      }),
      prisma.blogPost.count({ where }),
    ])

    return { success: true, blogPosts, total }
  } catch (error) {
    console.error('Error fetching all blog posts:', error)
    return {
      success: false,
      error: 'Error al cargar los blog posts',
      blogPosts: [],
      total: 0,
    }
  }
}

// Obtener posts relacionados
export async function getRelatedBlogPosts(slug: string, limit: number = 3) {
  try {
    const currentPost = await prisma.blogPost.findUnique({
      where: { slug },
      select: { id: true, category: true, tags: true },
    })

    if (!currentPost) {
      return { success: false, blogPosts: [] }
    }

    const relatedPosts = await prisma.blogPost.findMany({
      where: {
        id: { not: currentPost.id },
        status: BlogStatus.PUBLISHED,
        OR: [
          { category: currentPost.category },
          { tags: { hasSome: currentPost.tags } },
        ],
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            lastName: true,
            image: true,
          },
        },
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
    })

    return { success: true, blogPosts: relatedPosts }
  } catch (error) {
    console.error('Error fetching related posts:', error)
    return { success: false, blogPosts: [] }
  }
}

// Obtener categorías únicas
export async function getBlogCategories() {
  try {
    const categories = await prisma.blogPost.findMany({
      where: {
        status: BlogStatus.PUBLISHED,
        category: { not: null },
      },
      select: { category: true },
      distinct: ['category'],
    })

    return {
      success: true,
      categories: categories.map((c: { category: string | null }) => c.category).filter(Boolean) as string[],
    }
  } catch (error) {
    console.error('Error fetching categories:', error)
    return { success: false, categories: [] }
  }
}

// Obtener tags únicos
export async function getBlogTags() {
  try {
    const posts = await prisma.blogPost.findMany({
      where: { status: BlogStatus.PUBLISHED },
      select: { tags: true },
    })

    const allTags = posts.flatMap((p: { tags: string[] }) => p.tags)
    const uniqueTags = [...new Set(allTags)]

    return { success: true, tags: uniqueTags }
  } catch (error) {
    console.error('Error fetching tags:', error)
    return { success: false, tags: [] }
  }
}
