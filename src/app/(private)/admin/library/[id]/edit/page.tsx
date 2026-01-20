'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'
import { ResourceBuilder } from '@/components/admin/resource-builder'
import type { LibraryResource } from '@/lib/types/library'
import { Block } from '@/types/course-builder'

export default function EditResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [initialData, setInitialData] = useState<{
    title: string
    description: string
    excerpt: string
    type: LibraryResource['type']
    status: LibraryResource['status']
    accessLevel: LibraryResource['accessLevel']
    language: string
    level: string
    categoryId: string | null
    tags: string[]
    thumbnailUrl: string | null
    blocks: Block[]
  } | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/library/${id}`)

        if (response.ok) {
          const data = await response.json()
          const resource: LibraryResource = data.resource
          
          let blocks: Block[] = []
          if (resource.content) {
            try {
              const parsed = JSON.parse(resource.content)
              if (parsed.blocks && Array.isArray(parsed.blocks)) {
                blocks = parsed.blocks
              }
            } catch {
              blocks = []
            }
          }
          
          setInitialData({
            title: resource.title,
            description: resource.description || '',
            excerpt: resource.excerpt || '',
            type: resource.type,
            status: resource.status,
            accessLevel: resource.accessLevel,
            language: resource.language,
            level: resource.level || '',
            categoryId: resource.categoryId,
            tags: resource.tags,
            thumbnailUrl: resource.thumbnailUrl,
            blocks,
          })
        } else {
          router.push('/admin/library')
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        router.push('/admin/library')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id, router])

  if (loading || !initialData) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)]">
      <ResourceBuilder
        resourceId={id}
        initialData={initialData}
      />
    </div>
  )
}
