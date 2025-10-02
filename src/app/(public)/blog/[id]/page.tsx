import Footer from '@/components/public-components/footer'
import Header from '@/components/public-components/header'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Bookmark, Calendar, Clock, Facebook, Linkedin, Mail, Twitter } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { getBlogPostBySlug, getRelatedBlogPosts } from '@/lib/actions/blog'
import { notFound } from 'next/navigation'
import { BlogContentRenderer } from '@/components/blog/BlogContentRenderer'
import type { BlogContent } from '@/types/blog'

export default async function BlogPostDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id: slug } = await params
  
  // Cargar blog post desde la base de datos
  const result = await getBlogPostBySlug(slug)
  
  if (!result.success || !result.blogPost) {
    notFound()
  }

  const blogPost = result.blogPost
  
  // Cargar posts relacionados
  const relatedResult = await getRelatedBlogPosts(slug, 3)
  const relatedPosts = relatedResult.success ? relatedResult.blogPosts : []

  // Parsear contenido JSON
  const content = blogPost.content as unknown as BlogContent
  
  const post = {
    id: blogPost.id,
    title: blogPost.title,
    excerpt: blogPost.excerpt || '',
    content: <BlogContentRenderer content={content} />,
    category: blogPost.category || 'Sin categoría',
    author: `${blogPost.author.name} ${blogPost.author.lastName}`,
    authorRole: 'Editor',
    authorBio: blogPost.author.bio || 'Editor de contenido en Lingowow',
    authorImage: blogPost.author.image || '/api/placeholder/80/80',
    date: blogPost.publishedAt
      ? new Date(blogPost.publishedAt).toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : new Date(blogPost.createdAt).toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
    readTime: `${blogPost.readTime || 5} min`,
    image: blogPost.coverImage || '/api/placeholder/1200/600',
    tags: blogPost.tags,
    relatedPosts: relatedPosts.map((rp) => ({
      id: rp.slug,
      title: rp.title,
      excerpt: rp.excerpt || '',
      image: rp.coverImage || '/api/placeholder/400/200',
    })),
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navegación */}
      <Header />

      <main className="flex-1">
        {/* Post Header */}
        <section className="w-full py-12 md:py-20 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center text-center space-y-4 max-w-3xl mx-auto">
              <Button variant="ghost" size="sm" className="mb-4" asChild>
                <Link href="/blog">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver al blog
                </Link>
              </Button>

              <Badge className="mb-2">{post.category}</Badge>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
                {post.title}
              </h1>
              <p className="text-muted-foreground text-lg">{post.excerpt}</p>

              <div className="flex items-center gap-6 mt-6">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{post.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Lectura: {post.readTime}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Image */}
        <div className="container px-4 md:px-6 -mt-16">
          <div className="max-w-4xl mx-auto">
            <div className="rounded-lg overflow-hidden shadow-lg">
              <Image
                src={post.image}
                width={1200}
                height={600}
                alt={post.title}
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>

        {/* Post Content */}
        <div className="container px-4 md:px-6 py-12">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Social Sharing Sidebar */}
            <div className="lg:w-16 order-2 lg:order-1">
              <div className="lg:sticky lg:top-24 flex lg:flex-col items-center gap-4 mb-6 lg:mb-0">
                <Button variant="outline" size="icon" aria-label="Compartir en Facebook">
                  <Facebook className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" aria-label="Compartir en Twitter">
                  <Twitter className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" aria-label="Compartir en LinkedIn">
                  <Linkedin className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" aria-label="Compartir por email">
                  <Mail className="h-4 w-4" />
                </Button>
                <Separator className="hidden lg:flex lg:w-full" />
                <Button variant="outline" size="icon" aria-label="Guardar artículo">
                  <Bookmark className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:w-3/4 xl:w-2/3 mx-auto order-1 lg:order-2">
              <article className="prose prose-gray max-w-none dark:prose-invert prose-headings:font-bold prose-h2:mb-4 prose-h2:mt-8 prose-h2:text-2xl prose-h3:mb-3 prose-h3:mt-6 prose-h3:text-xl prose-p:mb-4 prose-p:leading-relaxed prose-p:text-gray-700 dark:prose-p:text-gray-300">
                {post.content}
              </article>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mt-8">
                <span className="text-sm font-medium">Tags:</span>
                {post.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="cursor-pointer">
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Author Bio */}
              <div className="mt-12 p-6 rounded-lg bg-slate-50">
                <div className="flex flex-col md:flex-row gap-6">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={post.authorImage} alt={post.author} />
                    <AvatarFallback>{post.author.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold">{post.author}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{post.authorRole}</p>
                    <p>{post.authorBio}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Related Posts */}
        <section className="w-full py-12 bg-slate-50">
          <div className="container px-4 md:px-6">
            <h2 className="text-2xl font-bold tracking-tight mb-8">Artículos Relacionados</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {post.relatedPosts.map((relatedPost) => (
                <Card key={relatedPost.id} className="overflow-hidden">
                  <div className="aspect-video relative">
                    <Image
                      src={relatedPost.image}
                      alt={relatedPost.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <CardHeader>
                    <h3 className="text-lg font-bold hover:text-primary leading-tight">
                      <Link href={`/blog/${relatedPost.id}`}>{relatedPost.title}</Link>
                    </h3>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{relatedPost.excerpt}</p>
                    <Button variant="ghost" size="sm" className="mt-4 p-0" asChild>
                      <Link href={`/blog/${relatedPost.id}`}>Leer más</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="w-full py-12 md:py-20 bg-primary text-primary-foreground">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center text-center space-y-4 max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                ¿Quieres aprender idiomas como un experto?
              </h2>
              <p className="text-primary-foreground/80 text-lg">
                Aplica las técnicas de este artículo con la guía de nuestros profesores expertos.
                Primera clase gratis sin compromiso.
              </p>
              <Button variant="secondary" size="lg" className="mt-4">
                Reservar Clase Gratuita
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
