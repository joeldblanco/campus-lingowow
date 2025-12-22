'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import {
  listFiles,
  getFileDetails,
  updateFileMetadata,
  batchDeleteFiles,
  moveFiles,
  listFolders,
  createFolder,
  getUsageStats,
  syncCloudinaryResources,
  type FileListOptions,
  type ServerFileAsset,
} from '@/lib/actions/file-manager'
import { type CloudinaryFolder } from '@/lib/cloudinary'
import { FileCategory, FileResourceType } from '@prisma/client'

// Main file management hook
export function useFileManager(initialOptions: FileListOptions = {}) {
  const [files, setFiles] = useState<ServerFileAsset[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(initialOptions.page || 1)
  const [limit, setLimit] = useState(initialOptions.limit || 20)
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [filters, setFilters] = useState<FileListOptions>(initialOptions)

  // Load files
  const loadFiles = useCallback(
    async (options: FileListOptions = {}) => {
      setLoading(true)
      setError(null)

      try {
        const result = await listFiles({ ...filters, ...options })

        if (result.success && result.data) {
          setFiles(result.data.files)
          setTotal(result.data.total)
          setCurrentPage(result.data.page)
          setLimit(result.data.limit)
        } else {
          setError(result.error || 'Failed to load files')
          toast.error(result.error || 'Failed to load files')
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred'
        setError(errorMessage)
        toast.error(errorMessage)
      } finally {
        setLoading(false)
      }
    },
    [filters]
  )

  // Initial load
  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<FileListOptions>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
  }, [])

  // Handle file selection
  const toggleFileSelection = useCallback((publicId: string) => {
    setSelectedFiles((prev) =>
      prev.includes(publicId) ? prev.filter((id) => id !== publicId) : [...prev, publicId]
    )
  }, [])

  const selectAllFiles = useCallback(() => {
    setSelectedFiles(files.map((file) => file.publicId))
  }, [files])

  const clearSelection = useCallback(() => {
    setSelectedFiles([])
  }, [])

  // Delete selected files
  const deleteSelectedFiles = useCallback(async () => {
    if (selectedFiles.length === 0) return

    setLoading(true)
    try {
      const result = await batchDeleteFiles(selectedFiles)

      if (result.success) {
        toast.success(`Deleted ${result.data?.deleted.length || 0} files`)
        setSelectedFiles([])
        await loadFiles()
      } else {
        toast.error(result.error || 'Failed to delete files')
      }
    } catch {
      toast.error('Failed to delete files')
    } finally {
      setLoading(false)
    }
  }, [selectedFiles, loadFiles])

  // Move selected files
  const moveSelectedFiles = useCallback(
    async (destinationFolder: string) => {
      if (selectedFiles.length === 0) return

      setLoading(true)
      try {
        const result = await moveFiles(selectedFiles, destinationFolder)

        if (result.success) {
          toast.success(`Moved ${result.data?.moved.length || 0} files`)
          setSelectedFiles([])
          await loadFiles()
        } else {
          toast.error(result.error || 'Failed to move files')
        }
      } catch {
        toast.error('Failed to move files')
      } finally {
        setLoading(false)
      }
    },
    [selectedFiles, loadFiles]
  )

  // Pagination
  const nextPage = useCallback(() => {
    if (currentPage * limit < total) {
      loadFiles({ page: currentPage + 1 })
    }
  }, [currentPage, limit, total, loadFiles])

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      loadFiles({ page: currentPage - 1 })
    }
  }, [currentPage, loadFiles])

  const goToPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= Math.ceil(total / limit)) {
        loadFiles({ page })
      }
    },
    [total, limit, loadFiles]
  )

  // Computed values
  const hasNextPage = currentPage * limit < total
  const hasPrevPage = currentPage > 1
  const totalPages = Math.ceil(total / limit)
  const isAllSelected = files.length > 0 && selectedFiles.length === files.length
  const isSomeSelected = selectedFiles.length > 0 && selectedFiles.length < files.length

  return {
    // State
    files,
    loading,
    error,
    total,
    currentPage,
    limit,
    selectedFiles,
    filters,
    hasNextPage,
    hasPrevPage,
    totalPages,
    isAllSelected,
    isSomeSelected,

    // Actions
    loadFiles,
    updateFilters,
    toggleFileSelection,
    selectAllFiles,
    clearSelection,
    deleteSelectedFiles,
    moveSelectedFiles,
    nextPage,
    prevPage,
    goToPage,

    // Refresh
    refresh: () => loadFiles(),
  }
}

// File details hook
export function useFileDetails(publicId: string) {
  const [file, setFile] = useState<ServerFileAsset | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadFileDetails = useCallback(async () => {
    if (!publicId) return

    setLoading(true)
    setError(null)

    try {
      const result = await getFileDetails(publicId)

      if (result.success && result.data) {
        setFile(result.data)
      } else {
        setError(result.error || 'Failed to load file details')
        toast.error(result.error || 'Failed to load file details')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [publicId])

  const updateMetadata = useCallback(
    async (metadata: {
      fileName?: string
      description?: string
      tags?: string[]
      category?: FileCategory
      isPublic?: boolean
    }) => {
      if (!publicId) return

      setLoading(true)
      try {
        const result = await updateFileMetadata(publicId, metadata)

        if (result.success && result.data) {
          setFile(result.data)
          toast.success('File metadata updated successfully')
        } else {
          toast.error(result.error || 'Failed to update file metadata')
        }
      } catch {
        toast.error('Failed to update file metadata')
      } finally {
        setLoading(false)
      }
    },
    [publicId]
  )

  useEffect(() => {
    loadFileDetails()
  }, [loadFileDetails])

  return {
    file,
    loading,
    error,
    updateMetadata,
    refresh: loadFileDetails,
  }
}

// Folder management hook
export function useFolderManager() {
  const [folders, setFolders] = useState<CloudinaryFolder[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadFolders = useCallback(async (prefix?: string) => {
    setLoading(true)
    setError(null)

    try {
      const result = await listFolders(prefix)

      if (result.success && result.data) {
        setFolders(result.data)
      } else {
        setError(result.error || 'Failed to load folders')
        toast.error(result.error || 'Failed to load folders')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const createNewFolder = useCallback(
    async (path: string) => {
      setLoading(true)
      try {
        const result = await createFolder(path)

        if (result.success) {
          toast.success('Folder created successfully')
          await loadFolders()
          return result.data
        } else {
          toast.error(result.error || 'Failed to create folder')
          return null
        }
      } catch {
        toast.error('Failed to create folder')
        return null
      } finally {
        setLoading(false)
      }
    },
    [loadFolders]
  )

  useEffect(() => {
    loadFolders()
  }, [loadFolders])

  return {
    folders,
    loading,
    error,
    loadFolders,
    createNewFolder,
    refresh: () => loadFolders(),
  }
}

// Usage statistics hook
export function useUsageStats() {
  const [stats, setStats] = useState<{
    totalFiles: number
    totalSize: number
    recentUploads: number
    byType: Record<string, { count: number; size: number }>
    byCategory: Record<string, { count: number; size: number }>
    cloudinaryUsage?: {
      plan: string
      objects: number
      bandwidth: number
      storage?: number
      transformed_images: number
      transformed_videos: number
      rate_limit_remaining: number
      last_updated: string
    }
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadStats = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await getUsageStats()

      if (result.success && result.data) {
        setStats({
          ...result.data,
          cloudinaryUsage: result.data.cloudinaryUsage as
            | {
                plan: string
                objects: number
                bandwidth: number
                transformed_images: number
                transformed_videos: number
                rate_limit_remaining: number
                last_updated: string
              }
            | undefined,
        })
      } else {
        setError(result.error || 'Failed to load usage stats')
        toast.error(result.error || 'Failed to load usage stats')
      }
    } catch {
      const errorMessage = 'An error occurred'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  return {
    stats,
    loading,
    error,
    refresh: loadStats,
  }
}

// Sync hook for Cloudinary synchronization
export function useCloudinarySync() {
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  const sync = useCallback(async () => {
    setSyncing(true)
    try {
      const result = await syncCloudinaryResources()

      if (result.success) {
        toast.success(result.message || 'Sync completed successfully')
        setLastSync(new Date())
      } else {
        toast.error(result.error || 'Sync failed')
      }
    } catch {
      toast.error('Sync failed')
    } finally {
      setSyncing(false)
    }
  }, [])

  return {
    syncing,
    lastSync,
    sync,
  }
}

// File search hook with debouncing
export function useFileSearch(initialQuery: string = '') {
  const [query, setQuery] = useState(initialQuery)
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery)
  const [searching, setSearching] = useState(false)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
      setSearching(query.length > 0)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const search = useCallback((newQuery: string) => {
    setQuery(newQuery)
  }, [])

  const clearSearch = useCallback(() => {
    setQuery('')
  }, [])

  return {
    query,
    debouncedQuery,
    searching,
    search,
    clearSearch,
  }
}

// File type filter hook
export function useFileTypeFilter() {
  const [selectedTypes, setSelectedTypes] = useState<FileResourceType[]>([])

  const toggleType = useCallback((type: FileResourceType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }, [])

  const setTypes = useCallback((types: FileResourceType[]) => {
    setSelectedTypes(types)
  }, [])

  const clearTypes = useCallback(() => {
    setSelectedTypes([])
  }, [])

  const activeFilters = useMemo(() => {
    return selectedTypes.length > 0 ? selectedTypes : undefined
  }, [selectedTypes])

  return {
    selectedTypes,
    activeFilters,
    toggleType,
    setTypes,
    clearTypes,
  }
}

// File category filter hook
export function useFileCategoryFilter() {
  const [selectedCategories, setSelectedCategories] = useState<FileCategory[]>([])

  const toggleCategory = useCallback((category: FileCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    )
  }, [])

  const setCategories = useCallback((categories: FileCategory[]) => {
    setSelectedCategories(categories)
  }, [])

  const clearCategories = useCallback(() => {
    setSelectedCategories([])
  }, [])

  const activeFilters = useMemo(() => {
    return selectedCategories.length > 0 ? selectedCategories : undefined
  }, [selectedCategories])

  return {
    selectedCategories,
    activeFilters,
    toggleCategory,
    setCategories,
    clearCategories,
  }
}

// File operations hook for individual file actions
export function useFileOperations() {
  const [operationLoading, setOperationLoading] = useState<string | null>(null)

  const updateFile = useCallback(
    async (
      publicId: string,
      metadata: {
        fileName?: string
        description?: string
        tags?: string[]
        category?: FileCategory
        isPublic?: boolean
      }
    ) => {
      setOperationLoading(publicId)
      try {
        const result = await updateFileMetadata(publicId, metadata)

        if (result.success) {
          toast.success('File updated successfully')
          return result.data
        } else {
          toast.error(result.error || 'Failed to update file')
          return null
        }
      } catch {
        toast.error('Failed to update file')
        return null
      } finally {
        setOperationLoading(null)
      }
    },
    []
  )

  const deleteFile = useCallback(async (publicId: string) => {
    setOperationLoading(publicId)
    try {
      const result = await batchDeleteFiles([publicId])

      if (result.success) {
        toast.success('File deleted successfully')
        return true
      } else {
        toast.error(result.error || 'Failed to delete file')
        return false
      }
    } catch {
      toast.error('Failed to delete file')
      return false
    } finally {
      setOperationLoading(null)
    }
  }, [])

  return {
    operationLoading,
    updateFile,
    deleteFile,
  }
}

// Combined file management hook for complex operations
export function useAdvancedFileManager(initialOptions: FileListOptions = {}) {
  const fileManager = useFileManager(initialOptions)
  const fileSearch = useFileSearch(initialOptions.search)
  const fileTypeFilter = useFileTypeFilter()
  const fileCategoryFilter = useFileCategoryFilter()
  const folderManager = useFolderManager()
  const usageStats = useUsageStats()
  const cloudinarySync = useCloudinarySync()
  const fileOperations = useFileOperations()

  // Update filters when search or filters change
  useEffect(() => {
    fileManager.updateFilters({
      search: fileSearch.debouncedQuery,
      resourceType: fileTypeFilter.activeFilters?.[0],
      category: fileCategoryFilter.activeFilters?.[0],
    })
  }, [
    fileSearch.debouncedQuery,
    fileTypeFilter.activeFilters,
    fileCategoryFilter.activeFilters,
    fileManager,
    fileManager.updateFilters,
  ])

  return {
    // Core file management
    ...fileManager,

    // Search and filters
    search: fileSearch,
    typeFilter: fileTypeFilter,
    categoryFilter: fileCategoryFilter,

    // Additional features
    folders: folderManager,
    stats: usageStats,
    sync: cloudinarySync,
    operations: fileOperations,
  }
}
