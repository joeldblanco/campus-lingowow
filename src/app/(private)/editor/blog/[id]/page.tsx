import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { canAccessEditor } from '@/lib/utils/roles'
import { getBlogPostById } from '@/lib/actions/blog'
import { BlogPostForm } from '@/components/editor/BlogPostForm'
import { BlogContent } from '@/types/blog'

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()

  if (!session?.user) {
    redirect('/signin')
  }

  // Verificar permisos de editor
  const user = session.user
  if (!canAccessEditor(user.roles)) {
    redirect('/')
  }

  const { id } = await params
  const result = await getBlogPostById(id)

  if (!result.success || !result.blogPost) {
    redirect('/editor/blog')
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Editar Artículo</h1>
        <p className="text-muted-foreground mt-2">Modifica el contenido de tu artículo</p>
      </div>

      <BlogPostForm
        mode="edit"
        initialData={{
          ...result.blogPost,
          content: result.blogPost.content as unknown as BlogContent,
        }}
      />
    </div>
  )
}
