import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { canAccessEditor } from '@/lib/utils/roles'
import { getAllBlogPosts } from '@/lib/actions/blog'
import { BlogPostsTable } from '@/components/editor/BlogPostsTable'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default async function EditorBlogPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/signin')
  }

  // Verificar permisos de editor
  const user = session.user
  if (!canAccessEditor(user.roles)) {
    redirect('/')
  }

  // Obtener todos los blog posts
  const result = await getAllBlogPosts()

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Blog</h1>
          <p className="text-muted-foreground mt-2">Crea, edita y publica artículos para el blog</p>
        </div>
        <Button asChild>
          <Link href="/editor/blog/new">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Artículo
          </Link>
        </Button>
      </div>

      {result.success ? (
        <BlogPostsTable blogPosts={result.blogPosts} />
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">Error al cargar los artículos</p>
        </div>
      )}
    </div>
  )
}
