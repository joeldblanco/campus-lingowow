'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Search, 
  Filter, 
  X, 
  Tag, 
  FileText, 
  Image as LucideImage, 
  Video, 
  Music,
  SlidersHorizontal,
  RotateCcw,
  Save,
  Clock
} from 'lucide-react'
import { FileCategory, FileResourceType } from '@prisma/client'

interface SearchFiltersProps {
  onFiltersChange: (filters: SearchFilters) => void
  onSearchChange: (query: string) => void
  currentQuery: string
}

interface SearchFilters {
  resourceTypes: FileResourceType[]
  categories: FileCategory[]
  tags: string[]
  uploadedBy: string
  dateRange: { from: string; to: string }
  sizeRange: [number, number]
  folder: string
  hasTags: boolean
  isPublic: boolean | null
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

interface SavedSearch {
  id: string
  name: string
  query: string
  filters: SearchFilters
  createdAt: Date
}

export const AdvancedSearchFilters: React.FC<SearchFiltersProps> = ({
  onFiltersChange,
  onSearchChange,
  currentQuery
}) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState(currentQuery)
  const [filters, setFilters] = useState({
    resourceTypes: [] as FileResourceType[],
    categories: [] as FileCategory[],
    tags: [] as string[],
    uploadedBy: '',
    dateRange: {
      from: '',
      to: ''
    },
    sizeRange: [0, 100] as [number, number],
    folder: '',
    hasTags: false,
    isPublic: null as boolean | null,
    sortBy: 'createdAt',
    sortOrder: 'desc' as 'asc' | 'desc'
  })
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [searchName, setSearchName] = useState('')

  // Debounced search
  const debouncedSearch = useCallback((query: string) => {
    const timeoutId = setTimeout(() => {
      onSearchChange(query)
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [onSearchChange])

  useEffect(() => {
    const cleanup = debouncedSearch(searchQuery)
    return cleanup
  }, [searchQuery, debouncedSearch])

  useEffect(() => {
    onFiltersChange(filters)
  }, [filters, onFiltersChange])

  const handleResourceTypeToggle = (type: FileResourceType) => {
    setFilters(prev => ({
      ...prev,
      resourceTypes: prev.resourceTypes.includes(type)
        ? prev.resourceTypes.filter(t => t !== type)
        : [...prev.resourceTypes, type]
    }))
  }

  const handleCategoryToggle = (category: FileCategory) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }))
  }

  const handleTagToggle = (tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }))
  }

  const clearAllFilters = () => {
    setSearchQuery('')
    setFilters({
      resourceTypes: [],
      categories: [],
      tags: [],
      uploadedBy: '',
      dateRange: { from: '', to: '' },
      sizeRange: [0, 100],
      folder: '',
      hasTags: false,
      isPublic: null,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    })
  }

  const saveSearch = () => {
    if (!searchName.trim()) return

    const newSearch: SavedSearch = {
      id: Date.now().toString(),
      name: searchName,
      query: searchQuery,
      filters: { ...filters },
      createdAt: new Date()
    }

    setSavedSearches(prev => [...prev, newSearch])
    setShowSaveDialog(false)
    setSearchName('')
  }

  const loadSavedSearch = (savedSearch: SavedSearch) => {
    setSearchQuery(savedSearch.query)
    setFilters(savedSearch.filters)
  }

  const deleteSavedSearch = (id: string) => {
    setSavedSearches(prev => prev.filter(search => search.id !== id))
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (searchQuery) count++
    if (filters.resourceTypes.length > 0) count++
    if (filters.categories.length > 0) count++
    if (filters.tags.length > 0) count++
    if (filters.uploadedBy) count++
    if (filters.dateRange.from || filters.dateRange.to) count++
    if (filters.sizeRange[0] > 0 || filters.sizeRange[1] < 100) count++
    if (filters.folder) count++
    if (filters.hasTags) count++
    if (filters.isPublic !== null) count++
    return count
  }

  const commonTags = ['course', 'lesson', 'assignment', 'exam', 'material', 'resource', 'tutorial', 'demo']

  return (
    <div className="space-y-4">
      {/* Main Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search files by name, description, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    Filters
                    {getActiveFiltersCount() > 0 && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {getActiveFiltersCount()}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-80">
                  <DropdownMenuItem onClick={() => setShowAdvancedFilters(true)}>
                    <Filter className="h-4 w-4 mr-2" />
                    Advanced Filters
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={clearAllFilters}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Clear All Filters
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowSaveDialog(true)}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Search
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {savedSearches.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Clock className="h-4 w-4 mr-2" />
                      Saved
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64">
                    {savedSearches.map(search => (
                      <DropdownMenuItem
                        key={search.id}
                        onClick={() => loadSavedSearch(search)}
                        className="flex items-center justify-between"
                      >
                        <span className="truncate flex-1">{search.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteSavedSearch(search.id)
                          }}
                          className="h-4 w-4 p-0 text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Filters Display */}
      {getActiveFiltersCount() > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {searchQuery && (
                  <Badge variant="secondary" className="flex items-center space-x-1">
                    <span>Query: &quot;{searchQuery}&quot;</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSearchQuery('')}
                      className="h-4 w-4 p-0 ml-1"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                
                {filters.resourceTypes.map(type => (
                  <Badge key={type} variant="secondary" className="flex items-center space-x-1">
                    <span>{type}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResourceTypeToggle(type)}
                      className="h-4 w-4 p-0 ml-1"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
                
                {filters.categories.map(category => (
                  <Badge key={category} variant="secondary" className="flex items-center space-x-1">
                    <span>{category.replace('_', ' ')}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCategoryToggle(category)}
                      className="h-4 w-4 p-0 ml-1"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
                
                {filters.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="flex items-center space-x-1">
                    <Tag className="h-3 w-3 mr-1" />
                    <span>{tag}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTagToggle(tag)}
                      className="h-4 w-4 p-0 ml-1"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
              
              <Button variant="outline" size="sm" onClick={clearAllFilters}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advanced Filters Dialog */}
      <Dialog open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Advanced Search Filters</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="types" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="types">File Types</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
              <TabsTrigger value="sorting">Sorting</TabsTrigger>
            </TabsList>
            
            <TabsContent value="types" className="space-y-4">
              <div>
                <Label className="text-base font-medium">Resource Types</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {Object.values(FileResourceType).map(type => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={`type-${type}`}
                        checked={filters.resourceTypes.includes(type)}
                        onCheckedChange={() => handleResourceTypeToggle(type)}
                      />
                      <Label htmlFor={`type-${type}`} className="flex items-center space-x-2">
                        {type === FileResourceType.IMAGE && <LucideImage className="h-4 w-4" />}
                        {type === FileResourceType.VIDEO && <Video className="h-4 w-4" />}
                        {type === FileResourceType.AUDIO && <Music className="h-4 w-4" />}
                        {type === FileResourceType.RAW && <FileText className="h-4 w-4" />}
                        <span>{type}</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <Label className="text-base font-medium">File Size Range (MB)</Label>
                <div className="mt-2">
                  <Slider
                    value={filters.sizeRange}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, sizeRange: value as [number, number] }))}
                    max={100}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-600 mt-1">
                    <span>{filters.sizeRange[0]} MB</span>
                    <span>{filters.sizeRange[1]} MB</span>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="categories" className="space-y-4">
              <div>
                <Label className="text-base font-medium">File Categories</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {Object.values(FileCategory).map(category => (
                    <div key={category} className="flex items-center space-x-2">
                      <Checkbox
                        id={`category-${category}`}
                        checked={filters.categories.includes(category)}
                        onCheckedChange={() => handleCategoryToggle(category)}
                      />
                      <Label htmlFor={`category-${category}`}>
                        {category.replace('_', ' ')}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <Label className="text-base font-medium">Common Tags</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {commonTags.map(tag => (
                    <Badge
                      key={tag}
                      variant={filters.tags.includes(tag) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handleTagToggle(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="metadata" className="space-y-4">
              <div>
                <Label htmlFor="uploadedBy">Uploaded By</Label>
                <Input
                  id="uploadedBy"
                  value={filters.uploadedBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, uploadedBy: e.target.value }))}
                  placeholder="User email or name"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="folder">Folder Path</Label>
                <Input
                  id="folder"
                  value={filters.folder}
                  onChange={(e) => setFilters(prev => ({ ...prev, folder: e.target.value }))}
                  placeholder="e.g., images/courses"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label>Date Range</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Input
                    type="date"
                    value={filters.dateRange.from}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      dateRange: { ...prev.dateRange, from: e.target.value } 
                    }))}
                  />
                  <Input
                    type="date"
                    value={filters.dateRange.to}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      dateRange: { ...prev.dateRange, to: e.target.value } 
                    }))}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasTags"
                    checked={filters.hasTags}
                    onCheckedChange={(checked) => setFilters(prev => ({ ...prev, hasTags: !!checked }))}
                  />
                  <Label htmlFor="hasTags">Has tags</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isPublic"
                    checked={filters.isPublic === true}
                    onCheckedChange={(checked) => setFilters(prev => ({ 
                      ...prev, 
                      isPublic: checked === true ? true : (checked === false ? false : null) 
                    }))}
                  />
                  <Label htmlFor="isPublic">Is public</Label>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="sorting" className="space-y-4">
              <div>
                <Label htmlFor="sortBy">Sort By</Label>
                <select
                  id="sortBy"
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                  className="w-full mt-1 p-2 border rounded"
                >
                  <option value="createdAt">Created Date</option>
                  <option value="size">File Size</option>
                  <option value="fileName">File Name</option>
                  <option value="usageCount">Usage Count</option>
                </select>
              </div>
              
              <div>
                <Label>Sort Order</Label>
                <div className="flex space-x-4 mt-1">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="asc"
                      checked={filters.sortOrder === 'asc'}
                      onCheckedChange={() => setFilters(prev => ({ ...prev, sortOrder: 'asc' }))}
                    />
                    <Label htmlFor="asc">Ascending</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="desc"
                      checked={filters.sortOrder === 'desc'}
                      onCheckedChange={() => setFilters(prev => ({ ...prev, sortOrder: 'desc' }))}
                    />
                    <Label htmlFor="desc">Descending</Label>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={clearAllFilters}>
              Clear All
            </Button>
            <Button onClick={() => setShowAdvancedFilters(false)}>
              Apply Filters
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Search Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Search</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="searchName">Search Name</Label>
              <Input
                id="searchName"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="e.g., Course Images 2024"
                className="mt-1"
              />
            </div>
            
            <div className="bg-gray-50 p-3 rounded text-sm">
              <div className="font-medium mb-2">Current search includes:</div>
              <div>• Query: &quot;{searchQuery}&quot;</div>
              <div>• {filters.resourceTypes.length} file types</div>
              <div>• {filters.categories.length} categories</div>
              <div>• {filters.tags.length} tags</div>
              <div>• {filters.uploadedBy ? 'Uploader filter' : 'No uploader filter'}</div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveSearch} disabled={!searchName.trim()}>
              Save Search
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Search Results Summary Component
interface SearchResultsSummaryProps {
  totalResults: number
  currentQuery: string
  activeFilters: SearchFilters
  searchTime: number
}

export const SearchResultsSummary: React.FC<SearchResultsSummaryProps> = ({
  totalResults,
  currentQuery,
  activeFilters,
  searchTime
}) => {
  const getFilterSummary = () => {
    const filters = []
    if (currentQuery) filters.push(`"${currentQuery}"`)
    if (activeFilters.resourceTypes?.length > 0) {
      filters.push(`${activeFilters.resourceTypes.length} types`)
    }
    if (activeFilters.categories?.length > 0) {
      filters.push(`${activeFilters.categories.length} categories`)
    }
    if (activeFilters.tags?.length > 0) {
      filters.push(`${activeFilters.tags.length} tags`)
    }
    return filters.join(', ')
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">
              {totalResults.toLocaleString()} results found
            </h3>
            {getFilterSummary() && (
              <p className="text-sm text-gray-600">
                for {getFilterSummary()}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">
              Search time: {searchTime}ms
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
