import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { canAccessEditor } from '@/lib/utils/roles'
import { BlogPostForm } from '@/components/editor/BlogPostForm'

export default async function NewBlogPostPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/signin')
  }

  // Verificar permisos de editor
  const user = session.user
  if (!canAccessEditor(user.roles)) {
    redirect('/')
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Nuevo Artículo</h1>
        <p className="text-muted-foreground mt-2">Crea un nuevo artículo para el blog</p>
      </div>

      <BlogPostForm mode="create" />
    </div>
  )
}
