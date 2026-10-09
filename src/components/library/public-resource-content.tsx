'use client'

import { ArticleBlockRenderer } from '@/components/library/article-editor/ArticleBlockRenderer'
import { BlockPreview } from '@/components/admin/course-builder/lesson-builder/block-preview'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { resolvePublicLibraryContent } from '@/lib/public-library-content'
import { sanitizeHtml } from '@/lib/sanitize-html'

export function PublicResourceContent({ content }: { content: string | null }) {
  const resolved = resolvePublicLibraryContent(content)
  switch (resolved.kind) {
    case 'article':
      return <ArticleBlockRenderer content={resolved.content} />
    case 'course':
      return (
        <div className="article-reading flex flex-col gap-6">
          {resolved.blocks.map((block) =>
            block.type === 'text' && block.format === 'html' ? (
              <div
                key={block.id}
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.content) }}
              />
            ) : (
              <BlockPreview key={block.id} block={block} hideBlockHeader />
            )
          )}
        </div>
      )
    case 'html':
      return (
        <div
          className="article-reading prose max-w-none"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(resolved.html) }}
        />
      )
    case 'empty':
      return (
        <Alert>
          <AlertTitle>Este artículo aún no tiene contenido</AlertTitle>
          <AlertDescription>
            Mientras lo completamos, puedes explorar otros recursos de la biblioteca.
          </AlertDescription>
        </Alert>
      )
  }
}
