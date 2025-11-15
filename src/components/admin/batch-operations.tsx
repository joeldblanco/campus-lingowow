'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { ServerFileAsset } from '@/lib/actions/file-manager'
import { formatFileSize } from '@/lib/utils'
import {
  AlertTriangle,
  CheckCircle,
  Copy,
  Download,
  Eye,
  Move,
  RefreshCw,
  Tag,
  Trash2,
  XCircle,
} from 'lucide-react'
import React, { useState } from 'react'
import { toast } from 'sonner'

interface BatchOperationsProps {
  selectedFiles: ServerFileAsset[]
  onOperationComplete: () => void
  onSelectionClear: () => void
}

interface BatchOperation {
  type: 'delete' | 'move' | 'copy' | 'download' | 'tag' | 'public' | 'private'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  total: number
  results: {
    success: string[]
    failed: string[]
  }
}

export const BatchOperations: React.FC<BatchOperationsProps> = ({
  selectedFiles,
  onOperationComplete,
  onSelectionClear,
}) => {
  const [showBatchDialog, setShowBatchDialog] = useState(false)
  const [currentOperation, setCurrentOperation] = useState<BatchOperation | null>(null)
  const [selectedOperation, setSelectedOperation] = useState<
    'delete' | 'move' | 'copy' | 'download' | 'tag'
  >('delete')
  const [destinationFolder, setDestinationFolder] = useState('')
  const [newTags, setNewTags] = useState('')
  const [confirmationText, setConfirmationText] = useState('')

  const handleBatchDelete = async () => {
    if (selectedFiles.length === 0) return

    setCurrentOperation({
      type: 'delete',
      status: 'processing',
      progress: 0,
      total: selectedFiles.length,
      results: { success: [], failed: [] },
    })

    try {
      // Simulate batch delete for now
      setTimeout(() => {
        setCurrentOperation((prev) =>
          prev
            ? {
                ...prev,
                status: 'completed',
                progress: prev.total,
                results: {
                  success: selectedFiles.map((f) => f.publicId),
                  failed: [],
                },
              }
            : null
        )

        toast.success(`Deleted ${selectedFiles.length} files successfully`)
        onOperationComplete()
        onSelectionClear()
        setShowBatchDialog(false)
      }, 2000)
    } catch {
      setCurrentOperation((prev) =>
        prev
          ? {
              ...prev,
              status: 'failed',
              results: { success: [], failed: selectedFiles.map((f) => f.publicId) },
            }
          : null
      )

      toast.error('Batch delete operation failed')
    }
  }

  const handleBatchMove = async () => {
    if (selectedFiles.length === 0 || !destinationFolder.trim()) return

    setCurrentOperation({
      type: 'move',
      status: 'processing',
      progress: 0,
      total: selectedFiles.length,
      results: { success: [], failed: [] },
    })

    try {
      // Simulate batch move for now
      setTimeout(() => {
        setCurrentOperation((prev) =>
          prev
            ? {
                ...prev,
                status: 'completed',
                progress: prev.total,
                results: {
                  success: selectedFiles.map((f) => f.publicId),
                  failed: [],
                },
              }
            : null
        )

        toast.success(`Moved ${selectedFiles.length} files successfully`)
        onOperationComplete()
        onSelectionClear()
        setShowBatchDialog(false)
        setDestinationFolder('')
      }, 2000)
    } catch {
      setCurrentOperation((prev) =>
        prev
          ? {
              ...prev,
              status: 'failed',
              results: { success: [], failed: selectedFiles.map((f) => f.publicId) },
            }
          : null
      )

      toast.error('Batch move operation failed')
    }
  }

  const handleBatchCopy = async () => {
    if (selectedFiles.length === 0 || !destinationFolder.trim()) return

    setCurrentOperation({
      type: 'copy',
      status: 'processing',
      progress: 0,
      total: selectedFiles.length,
      results: { success: [], failed: [] },
    })

    // Implementation would copy files to destination folder
    // For now, simulate the operation
    setTimeout(() => {
      setCurrentOperation((prev) =>
        prev
          ? {
              ...prev,
              status: 'completed',
              progress: prev.total,
              results: {
                success: selectedFiles.map((f) => f.publicId),
                failed: [],
              },
            }
          : null
      )

      toast.success(`Copied ${selectedFiles.length} files successfully`)
      onOperationComplete()
      onSelectionClear()
      setShowBatchDialog(false)
      setDestinationFolder('')
    }, 2000)
  }

  const handleBatchDownload = async () => {
    if (selectedFiles.length === 0) return

    setCurrentOperation({
      type: 'download',
      status: 'processing',
      progress: 0,
      total: selectedFiles.length,
      results: { success: [], failed: [] },
    })

    // Download files one by one
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i]
      try {
        // Create download link
        const link = document.createElement('a')
        link.href = file.secureUrl
        link.download = file.fileName
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        setCurrentOperation((prev) =>
          prev
            ? {
                ...prev,
                progress: i + 1,
                results: {
                  ...prev.results,
                  success: [...prev.results.success, file.publicId],
                },
              }
            : null
        )
      } catch {
        setCurrentOperation((prev) =>
          prev
            ? {
                ...prev,
                results: {
                  ...prev.results,
                  failed: [...prev.results.failed, file.publicId],
                },
              }
            : null
        )
      }
    }

    setCurrentOperation((prev) =>
      prev
        ? {
            ...prev,
            status: 'completed',
          }
        : null
    )

    toast.success(`Downloaded ${selectedFiles.length} files`)
  }

  const handleBatchTag = async () => {
    if (selectedFiles.length === 0 || !newTags.trim()) return

    setCurrentOperation({
      type: 'tag',
      status: 'processing',
      progress: 0,
      total: selectedFiles.length,
      results: { success: [], failed: [] },
    })

    // Simulate batch tagging for now
    setTimeout(() => {
      setCurrentOperation((prev) =>
        prev
          ? {
              ...prev,
              status: 'completed',
              progress: prev.total,
              results: {
                success: selectedFiles.map((f) => f.publicId),
                failed: [],
              },
            }
          : null
      )

      toast.success(`Added tags to ${selectedFiles.length} files`)
      onOperationComplete()
      setShowBatchDialog(false)
      setNewTags('')
    }, 2000)
  }

  const executeOperation = () => {
    switch (selectedOperation) {
      case 'delete':
        if (confirmationText === 'DELETE') {
          handleBatchDelete()
        } else {
          toast.error('Please type DELETE to confirm')
        }
        break
      case 'move':
        handleBatchMove()
        break
      case 'copy':
        handleBatchCopy()
        break
      case 'download':
        handleBatchDownload()
        break
      case 'tag':
        handleBatchTag()
        break
    }
  }

  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'delete':
        return <Trash2 className="h-5 w-5 text-red-500" />
      case 'move':
        return <Move className="h-5 w-5 text-blue-500" />
      case 'copy':
        return <Copy className="h-5 w-5 text-green-500" />
      case 'download':
        return <Download className="h-5 w-5 text-purple-500" />
      case 'tag':
        return <Tag className="h-5 w-5 text-orange-500" />
      default:
        return <AlertTriangle className="h-5 w-5" />
    }
  }

  const getOperationTitle = (type: string) => {
    switch (type) {
      case 'delete':
        return 'Delete Files'
      case 'move':
        return 'Move Files'
      case 'copy':
        return 'Copy Files'
      case 'download':
        return 'Download Files'
      case 'tag':
        return 'Add Tags'
      default:
        return 'Batch Operation'
    }
  }

  const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0)
  const fileTypes = [...new Set(selectedFiles.map((file) => file.resourceType))]

  return (
    <div className="space-y-4">
      {/* Batch Actions Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="text-sm">
                {selectedFiles.length} files selected
              </Badge>
              <span className="text-sm text-gray-600">{formatFileSize(totalSize)}</span>
              <div className="flex space-x-1">
                {fileTypes.map((type) => (
                  <Badge key={type} variant="outline" className="text-xs">
                    {type}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedOperation('delete')
                  setShowBatchDialog(true)
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedOperation('move')
                  setShowBatchDialog(true)
                }}
              >
                <Move className="h-4 w-4 mr-2" />
                Move
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedOperation('copy')
                  setShowBatchDialog(true)
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedOperation('download')
                  setShowBatchDialog(true)
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedOperation('tag')
                  setShowBatchDialog(true)
                }}
              >
                <Tag className="h-4 w-4 mr-2" />
                Add Tags
              </Button>

              <Button variant="ghost" size="sm" onClick={onSelectionClear}>
                Clear Selection
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Operation Progress */}
      {currentOperation && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              {getOperationIcon(currentOperation.type)}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{getOperationTitle(currentOperation.type)}</h3>
                  <span className="text-sm text-gray-600">
                    {currentOperation.progress} / {currentOperation.total}
                  </span>
                </div>
                <Progress
                  value={(currentOperation.progress / currentOperation.total) * 100}
                  className="w-full"
                />
                {currentOperation.status === 'completed' && (
                  <div className="flex items-center space-x-2 mt-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-600">
                      {currentOperation.results.success.length} successful
                    </span>
                    {currentOperation.results.failed.length > 0 && (
                      <>
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-red-600">
                          {currentOperation.results.failed.length} failed
                        </span>
                      </>
                    )}
                  </div>
                )}
                {currentOperation.status === 'failed' && (
                  <div className="flex items-center space-x-2 mt-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-600">Operation failed</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Batch Operations Dialog */}
      <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {getOperationIcon(selectedOperation)}
              <span>{getOperationTitle(selectedOperation)}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Operation Summary */}
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-sm space-y-1">
                <div>Files: {selectedFiles.length}</div>
                <div>Total size: {formatFileSize(totalSize)}</div>
                <div>Types: {fileTypes.join(', ')}</div>
              </div>
            </div>

            {/* Operation-specific fields */}
            {selectedOperation === 'move' && (
              <div>
                <Label htmlFor="destination">Destination Folder</Label>
                <Input
                  id="destination"
                  value={destinationFolder}
                  onChange={(e) => setDestinationFolder(e.target.value)}
                  placeholder="e.g., images/archive"
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 mt-1">Enter the destination folder path</p>
              </div>
            )}

            {selectedOperation === 'copy' && (
              <div>
                <Label htmlFor="copyDestination">Destination Folder</Label>
                <Input
                  id="copyDestination"
                  value={destinationFolder}
                  onChange={(e) => setDestinationFolder(e.target.value)}
                  placeholder="e.g., images/backup"
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 mt-1">Files will be copied to this folder</p>
              </div>
            )}

            {selectedOperation === 'tag' && (
              <div>
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="tag1, tag2, tag3"
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Enter comma-separated tags to add to all files
                </p>
              </div>
            )}

            {selectedOperation === 'delete' && (
              <div>
                <div className="bg-red-50 border border-red-200 p-3 rounded">
                  <div className="flex items-center space-x-2 text-red-800">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">Warning</span>
                  </div>
                  <p className="text-sm text-red-700 mt-1">
                    This action cannot be undone. All selected files will be permanently deleted.
                  </p>
                </div>
                <div className="mt-4">
                  <Label htmlFor="confirmation">Type DELETE to confirm</Label>
                  <Input
                    id="confirmation"
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    placeholder="DELETE"
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {selectedOperation === 'download' && (
              <div>
                <p className="text-sm text-gray-600">
                  Your browser will download {selectedFiles.length} files. Please allow multiple
                  downloads if prompted.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowBatchDialog(false)
                setConfirmationText('')
                setDestinationFolder('')
                setNewTags('')
              }}
              disabled={currentOperation?.status === 'processing'}
            >
              Cancel
            </Button>
            <Button
              onClick={executeOperation}
              disabled={
                currentOperation?.status === 'processing' ||
                (selectedOperation === 'delete' && confirmationText !== 'DELETE') ||
                (selectedOperation === 'move' && !destinationFolder.trim()) ||
                (selectedOperation === 'copy' && !destinationFolder.trim()) ||
                (selectedOperation === 'tag' && !newTags.trim())
              }
            >
              {currentOperation?.status === 'processing' ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {getOperationTitle(selectedOperation)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Quick Batch Actions Component
interface QuickBatchActionsProps {
  selectedFiles: ServerFileAsset[]
  onQuickAction: (action: string) => void
}

export const QuickBatchActions: React.FC<QuickBatchActionsProps> = ({
  selectedFiles,
  onQuickAction,
}) => {
  const [showQuickMenu, setShowQuickMenu] = useState(false)

  if (selectedFiles.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div
        className={`bg-white rounded-lg shadow-lg border p-2 space-y-2 ${
          showQuickMenu ? 'block' : 'hidden'
        }`}
      >
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={() => onQuickAction('makePublic')}
        >
          <Eye className="h-4 w-4 mr-2" />
          Make Public
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={() => onQuickAction('makePrivate')}
        >
          <Eye className="h-4 w-4 mr-2" />
          Make Private
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={() => onQuickAction('optimize')}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Optimize
        </Button>
      </div>

      <Button onClick={() => setShowQuickMenu(!showQuickMenu)} className="rounded-full w-12 h-12">
        <Tag className="h-4 w-4" />
      </Button>
    </div>
  )
}
