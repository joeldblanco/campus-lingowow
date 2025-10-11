import Footer from '@/components/public-components/footer'
import Header from '@/components/public-components/header'
import BlogClient from '@/components/blog/blog-client'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import { getPublishedBlogPosts, getBlogCategories, getBlogTags } from '@/lib/actions/blog'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Blog | Lingowow - Recursos y Consejos para Aprender Idiomas',
  description: 'Descubre artículos, consejos y recursos para mejorar tu aprendizaje de idiomas. Tips de profesores expertos y técnicas probadas.',
}

export default async function BlogPage() {
  // Cargar datos desde la base de datos
  const [postsResult, categoriesResult, tagsResult] = await Promise.all([
    getPublishedBlogPosts({ limit: 20 }),
    getBlogCategories(),
    getBlogTags(),
  ])

  const allPosts = postsResult.success ? postsResult.blogPosts : []
  const categories = categoriesResult.success ? categoriesResult.categories : []
  const popularTags = tagsResult.success ? tagsResult.tags.slice(0, 10) : []

  // Separar posts destacados (los 2 más recientes)
  const featuredPosts = allPosts.slice(0, 2)

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1">
        <BlogClient
          featuredPosts={featuredPosts}
          allPosts={allPosts}
          categories={categories}
          popularTags={popularTags}
        />

        {/* Call to Action */}
        <section className="w-full py-12 md:py-20 bg-primary text-primary-foreground">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="md:w-2/3">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
                  ¿Listo para llevar tu aprendizaje al siguiente nivel?
                </h2>
                <p className="text-primary-foreground/80 max-w-[600px]">
                  Descubre nuestros cursos con profesores expertos y metodología probada. Primera
                  clase gratis.
                </p>
              </div>
              <div>
                <Button variant="secondary" size="lg" className="w-full md:w-auto">
                  Probar Gratis <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
