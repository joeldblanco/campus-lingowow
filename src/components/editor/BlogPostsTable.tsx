'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BlogStatus } from '@prisma/client'
import { deleteBlogPost } from '@/lib/actions/blog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface BlogPost {
  id: string
  title: string
  slug: string
  status: BlogStatus
  category: string | null
  views: number
  publishedAt: Date | null
  updatedAt: Date
  author: {
    id: string
    name: string
    lastName: string
    image: string | null
  }
}

interface BlogPostsTableProps {
  blogPosts: BlogPost[]
}

export function BlogPostsTable({ blogPosts }: BlogPostsTableProps) {
  const router = useRouter()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!selectedPost) return

    setIsDeleting(true)
    const result = await deleteBlogPost(selectedPost.id)

    if (result.success) {
      toast.success('Artículo eliminado exitosamente')
      setDeleteDialogOpen(false)
      router.refresh()
    } else {
      toast.error(result.error || 'Error al eliminar el artículo')
    }
    setIsDeleting(false)
  }

  const getStatusBadge = (status: BlogStatus) => {
    const variants = {
      [BlogStatus.DRAFT]: { variant: 'secondary' as const, label: 'Borrador' },
      [BlogStatus.PUBLISHED]: { variant: 'default' as const, label: 'Publicado' },
      [BlogStatus.ARCHIVED]: { variant: 'outline' as const, label: 'Archivado' },
    }

    const config = variants[status]
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  if (blogPosts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <h3 className="text-lg font-semibold mb-2">No hay artículos</h3>
        <p className="text-muted-foreground mb-4">
          Comienza creando tu primer artículo de blog
        </p>
        <Button asChild>
          <Link href="/editor/blog/new">Crear Artículo</Link>
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Vistas</TableHead>
              <TableHead>Autor</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {blogPosts.map((post) => (
              <TableRow key={post.id}>
                <TableCell className="font-medium">
                  <div className="max-w-md">
                    <div className="truncate">{post.title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      /{post.slug}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(post.status)}</TableCell>
                <TableCell>
                  {post.category ? (
                    <Badge variant="outline">{post.category}</Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">Sin categoría</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span>{post.views}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {post.author.name} {post.author.lastName}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {post.publishedAt
                      ? format(new Date(post.publishedAt), 'dd MMM yyyy', { locale: es })
                      : format(new Date(post.updatedAt), 'dd MMM yyyy', { locale: es })}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Abrir menú</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {post.status === BlogStatus.PUBLISHED && (
                        <DropdownMenuItem asChild>
                          <Link href={`/blog/${post.slug}`} target="_blank">
                            <Eye className="mr-2 h-4 w-4" />
                            Ver publicado
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild>
                        <Link href={`/editor/blog/${post.id}`}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          setSelectedPost(post)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El artículo &quot;{selectedPost?.title}&quot; será
              eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
