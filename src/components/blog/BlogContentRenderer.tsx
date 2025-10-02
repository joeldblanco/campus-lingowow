import React from 'react'
import {
  LegalSection,
  LegalParagraph,
  LegalHighlight,
} from '@/components/legal/LegalTextRenderer'
import type { BlogContent, BlogContentSection } from '@/types/blog'

interface BlogContentRendererProps {
  content: BlogContent
}

export function BlogContentRenderer({ content }: BlogContentRendererProps) {
  if (!content || !content.sections || content.sections.length === 0) {
    return (
      <LegalParagraph>
        Contenido no disponible.
      </LegalParagraph>
    )
  }

  return (
    <>
      {content.sections.map((section, index) => (
        <RenderSection key={index} section={section} />
      ))}
    </>
  )
}

function RenderSection({ section }: { section: BlogContentSection }) {
  switch (section.type) {
    case 'paragraph':
      return <LegalParagraph>{section.content}</LegalParagraph>

    case 'section':
      return (
        <LegalSection
          number={section.number}
          title={section.title || ''}
        >
          {section.children?.map((child, index) => (
            <RenderSection key={index} section={child} />
          ))}
        </LegalSection>
      )

    case 'highlight':
      return (
        <LegalHighlight variant={section.variant || 'info'}>
          {section.children?.map((child, index) => (
            <RenderSection key={index} section={child} />
          ))}
        </LegalHighlight>
      )

    case 'list':
      if (section.ordered) {
        return (
          <ol className="list-decimal list-inside space-y-2 mb-4">
            {section.items?.map((item, index) => (
              <li key={index} className="text-gray-700 dark:text-gray-300">
                {item}
              </li>
            ))}
          </ol>
        )
      } else {
        return (
          <ul className="list-disc list-inside space-y-2 mb-4">
            {section.items?.map((item, index) => (
              <li key={index} className="text-gray-700 dark:text-gray-300">
                {item}
              </li>
            ))}
          </ul>
        )
      }

    default:
      return null
  }
}
