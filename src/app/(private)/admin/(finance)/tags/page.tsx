'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, X, Tag as TagIcon } from 'lucide-react'
import { getAllProductTags, getProducts, updateProduct } from '@/lib/actions/commercial'
import { toast } from 'sonner'

export default function TagsPage() {
  const [tags, setTags] = useState<string[]>([])
  const [products, setProducts] = useState<Array<{ id: string; name: string; tags?: string[]; price?: number }>>([])
  const [loading, setLoading] = useState(true)
  const [newTag, setNewTag] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [tagsData, productsData] = await Promise.all([
        getAllProductTags(),
        getProducts(),
      ])
      setTags(tagsData)
      setProducts(productsData)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const getProductsWithTag = (tag: string) => {
    return products.filter((p) => p.tags?.includes(tag))
  }

  const handleRenameTag = async (oldTag: string, newTag: string) => {
    if (!newTag || oldTag === newTag) return

    const productsWithTag = getProductsWithTag(oldTag)
    
    try {
      for (const product of productsWithTag) {
        const updatedTags = product.tags?.map((t: string) => t === oldTag ? newTag : t) || []
        await updateProduct(product.id, { tags: updatedTags })
      }
      
      toast.success(`Tag "${oldTag}" renombrado a "${newTag}"`)
      loadData()
      setSelectedTag(null)
    } catch (error) {
      console.error('Error renaming tag:', error)
      toast.error('Error al renombrar tag')
    }
  }

  const handleDeleteTag = async (tag: string) => {
    if (!confirm(`¿Eliminar el tag "${tag}" de todos los productos?`)) return

    const productsWithTag = getProductsWithTag(tag)
    
    try {
      for (const product of productsWithTag) {
        const updatedTags = product.tags?.filter((t: string) => t !== tag) || []
        await updateProduct(product.id, { tags: updatedTags })
      }
      
      toast.success(`Tag "${tag}" eliminado`)
      loadData()
    } catch (error) {
      console.error('Error deleting tag:', error)
      toast.error('Error al eliminar tag')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Etiquetas (Tags)</h1>
          <p className="text-muted-foreground">Gestiona las etiquetas de los productos</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Tags Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Etiquetas Existentes</CardTitle>
            <CardDescription>
              {tags.length} etiquetas en uso
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Cargando...</div>
            ) : tags.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay etiquetas creadas
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {tags.map((tag) => {
                  const productCount = getProductsWithTag(tag).length
                  return (
                    <div
                      key={tag}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <TagIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{tag}</span>
                        <Badge variant="secondary">{productCount}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedTag(tag)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTag(tag)}
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tag Editor */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedTag ? `Editar: ${selectedTag}` : 'Agregar Nueva Etiqueta'}
            </CardTitle>
            <CardDescription>
              {selectedTag
                ? 'Renombra esta etiqueta en todos los productos'
                : 'Crea una nueva etiqueta para usar en productos'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Input
                  placeholder={selectedTag ? 'Nuevo nombre' : 'Nombre de la etiqueta'}
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (selectedTag) {
                        handleRenameTag(selectedTag, newTag)
                      }
                      setNewTag('')
                    }
                  }}
                />
              </div>

              {selectedTag && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Esta etiqueta está en {getProductsWithTag(selectedTag).length} productos:
                  </p>
                  <div className="max-h-[200px] overflow-y-auto space-y-1">
                    {getProductsWithTag(selectedTag).map((product) => (
                      <div key={product.id} className="text-sm p-2 bg-muted rounded">
                        {product.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                {selectedTag ? (
                  <>
                    <Button
                      onClick={() => {
                        handleRenameTag(selectedTag, newTag)
                        setNewTag('')
                      }}
                      disabled={!newTag}
                      className="flex-1"
                    >
                      Renombrar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedTag(null)
                        setNewTag('')
                      }}
                    >
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => {
                      if (newTag && !tags.includes(newTag)) {
                        toast.info('Agrega esta etiqueta a productos desde la página de edición de productos')
                        setNewTag('')
                      }
                    }}
                    disabled={!newTag}
                    className="flex-1"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Etiqueta
                  </Button>
                )}
              </div>

              {!selectedTag && newTag && (
                <p className="text-sm text-muted-foreground">
                  💡 Tip: Las etiquetas se crean automáticamente al agregarlas a productos
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products by Tag */}
      {selectedTag && (
        <Card>
          <CardHeader>
            <CardTitle>Productos con &quot;{selectedTag}&quot;</CardTitle>
            <CardDescription>
              {getProductsWithTag(selectedTag).length} productos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {getProductsWithTag(selectedTag).map((product) => (
                <div key={product.id} className="p-4 border rounded-lg">
                  <h3 className="font-medium">{product.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    ${product.price}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {product.tags?.map((tag: string) => (
                      <Badge
                        key={tag}
                        variant={tag === selectedTag ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
