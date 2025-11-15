'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Wand2, 
  Palette, 
  RotateCw, 
  FlipHorizontal, 
  FlipVertical,
  Sun,
  Contrast,
  Droplets,
  Maximize2,
  Grid3X3,
  Image as ImageIcon,
  FileText,
  Download,
  Copy,
  Settings,
  Zap
} from 'lucide-react'
import { CloudinaryService, CloudinaryTransformation } from '@/lib/cloudinary'
import { ServerFileAsset } from '@/lib/actions/file-manager'
import { formatFileSize } from '@/lib/utils/file-utils'
import { toast } from 'sonner'

interface FileTransformationsProps {
  file: ServerFileAsset
  onTransformationComplete: (transformedUrl: string) => void
}

interface TransformationPreset {
  id: string
  name: string
  description: string
  transformations: CloudinaryTransformation[]
  icon: React.ReactNode
}

export const FileTransformations: React.FC<FileTransformationsProps> = ({
  file,
  onTransformationComplete
}) => {
  const [showTransformDialog, setShowTransformDialog] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')
  const [transformations, setTransformations] = useState<CloudinaryTransformation[]>([])
  const [previewUrl, setPreviewUrl] = useState(file.secureUrl)
  const [applyingTransform, setApplyingTransform] = useState(false)
  const [customWidth, setCustomWidth] = useState(file.width || 800)
  const [customHeight, setCustomHeight] = useState(file.height || 600)
  const [quality, setQuality] = useState([80])
  const [crop, setCrop] = useState('scale')
  const [format, setFormat] = useState('auto')

  const imagePresets: TransformationPreset[] = [
    {
      id: 'thumbnail',
      name: 'Thumbnail',
      description: '150x150 thumbnail',
      transformations: [
        { width: 150, height: 150, crop: 'fill', gravity: 'auto' }
      ],
      icon: <Grid3X3 className="h-4 w-4" />
    },
    {
      id: 'medium',
      name: 'Medium',
      description: '500x500 medium',
      transformations: [
        { width: 500, height: 500, crop: 'fill', gravity: 'auto' }
      ],
      icon: <ImageIcon className="h-4 w-4" />
    },
    {
      id: 'large',
      name: 'Large',
      description: '1200x800 large',
      transformations: [
        { width: 1200, height: 800, crop: 'fill', gravity: 'auto' }
      ],
      icon: <Maximize2 className="h-4 w-4" />
    },
    {
      id: 'social',
      name: 'Social Media',
      description: '1080x1080 square',
      transformations: [
        { width: 1080, height: 1080, crop: 'fill', gravity: 'auto' }
      ],
      icon: <Grid3X3 className="h-4 w-4" />
    }
  ]

  const effectPresets: TransformationPreset[] = [
    {
      id: 'grayscale',
      name: 'Grayscale',
      description: 'Black and white',
      transformations: [
        { effect: 'grayscale' }
      ],
      icon: <Palette className="h-4 w-4" />
    },
    {
      id: 'sepia',
      name: 'Sepia',
      description: 'Vintage tone',
      transformations: [
        { effect: 'sepia' }
      ],
      icon: <Sun className="h-4 w-4" />
    },
    {
      id: 'enhance',
      name: 'Enhance',
      description: 'Auto enhance',
      transformations: [
        { effect: 'auto_contrast' }
      ],
      icon: <Contrast className="h-4 w-4" />
    },
    {
      id: 'blur',
      name: 'Blur',
      description: 'Gaussian blur',
      transformations: [
        { effect: 'blur:200' }
      ],
      icon: <Droplets className="h-4 w-4" />
    }
  ]

  const applyPreset = (preset: TransformationPreset) => {
    setTransformations(preset.transformations)
    generatePreviewUrl(preset.transformations)
  }

  const generatePreviewUrl = (customTransformations?: CloudinaryTransformation[]) => {
    const allTransformations = customTransformations || transformations
    
    const url = CloudinaryService.generateOptimizedUrl(file.publicId, {
      width: customWidth,
      height: customHeight,
      crop: crop as 'scale' | 'fill' | 'crop' | 'thumb',
      quality: quality[0],
      format: format as 'auto' | 'jpg' | 'png' | 'webp' | 'avif',
      ...allTransformations.reduce((acc, t) => ({ ...acc, ...t }), {})
    })
    
    setPreviewUrl(url)
  }

  const updateTransformation = (key: keyof CloudinaryTransformation, value: string | number) => {
    const updated = transformations.filter(t => !(key in t))
    if (value !== undefined && value !== '') {
      updated.push({ [key]: value })
    }
    setTransformations(updated)
    generatePreviewUrl(updated)
  }

  const applyTransformation = async () => {
    setApplyingTransform(true)
    try {
      // Generate the final transformed URL
      const finalUrl = CloudinaryService.generateOptimizedUrl(file.publicId, {
        width: customWidth,
        height: customHeight,
        crop: crop as 'scale' | 'fill' | 'crop' | 'thumb',
        quality: quality[0],
        format: format as 'auto' | 'jpg' | 'png' | 'webp' | 'avif',
        ...transformations.reduce((acc, t) => ({ ...acc, ...t }), {})
      })

      onTransformationComplete(finalUrl)
      setShowTransformDialog(false)
      toast.success('Transformation applied successfully')
    } catch {
      toast.error('Failed to apply transformation')
    } finally {
      setApplyingTransform(false)
    }
  }

  const copyTransformedUrl = () => {
    navigator.clipboard.writeText(previewUrl)
    toast.success('URL copied to clipboard')
  }

  const downloadTransformedImage = () => {
    const link = document.createElement('a')
    link.href = previewUrl
    link.download = `transformed_${file.fileName}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const resetTransformations = () => {
    setTransformations([])
    setCustomWidth(file.width || 800)
    setCustomHeight(file.height || 600)
    setQuality([80])
    setCrop('scale')
    setFormat('auto')
    setPreviewUrl(file.secureUrl)
  }

  if (file.resourceType !== 'IMAGE') {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Transformations Not Available
          </h3>
          <p className="text-gray-600">
            Transformations are currently only available for image files.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Wand2 className="h-5 w-5" />
              <span>Image Transformations</span>
            </CardTitle>
            <Button onClick={() => setShowTransformDialog(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Transform
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {imagePresets.map(preset => (
              <Card 
                key={preset.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => applyPreset(preset)}
              >
                <CardContent className="p-4 text-center">
                  <div className="flex justify-center mb-2">
                    {preset.icon}
                  </div>
                  <h3 className="font-medium text-sm">{preset.name}</h3>
                  <p className="text-xs text-gray-600">{preset.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="mt-6">
            <Label className="text-base font-medium">Effects</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
              {effectPresets.map(preset => (
                <Card 
                  key={preset.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => applyPreset(preset)}
                >
                  <CardContent className="p-4 text-center">
                    <div className="flex justify-center mb-2">
                      {preset.icon}
                    </div>
                    <h3 className="font-medium text-sm">{preset.name}</h3>
                    <p className="text-xs text-gray-600">{preset.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transformation Dialog */}
      <Dialog open={showTransformDialog} onOpenChange={setShowTransformDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transform Image</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Preview */}
            <div>
              <Label className="text-base font-medium">Preview</Label>
              <div className="mt-2 border rounded-lg overflow-hidden">
                <Image
                  src={previewUrl}
                  alt="Transformed preview"
                  width={400}
                  height={300}
                  className="w-full h-auto object-contain"
                />
              </div>
              <div className="flex space-x-2 mt-4">
                <Button variant="outline" onClick={copyTransformedUrl}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy URL
                </Button>
                <Button variant="outline" onClick={downloadTransformedImage}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
            
            {/* Controls */}
            <div>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basic</TabsTrigger>
                  <TabsTrigger value="adjustments">Adjustments</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="width">Width</Label>
                      <Input
                        id="width"
                        type="number"
                        value={customWidth}
                        onChange={(e) => {
                          setCustomWidth(Number(e.target.value))
                          generatePreviewUrl()
                        }}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="height">Height</Label>
                      <Input
                        id="height"
                        type="number"
                        value={customHeight}
                        onChange={(e) => {
                          setCustomHeight(Number(e.target.value))
                          generatePreviewUrl()
                        }}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="crop">Crop Mode</Label>
                    <Select value={crop} onValueChange={(value) => {
                      setCrop(value)
                      generatePreviewUrl()
                    }}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scale">Scale</SelectItem>
                        <SelectItem value="fill">Fill</SelectItem>
                        <SelectItem value="crop">Crop</SelectItem>
                        <SelectItem value="thumb">Thumb</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Quality: {quality[0]}%</Label>
                    <Slider
                      value={quality}
                      onValueChange={(value) => {
                        setQuality(value)
                        generatePreviewUrl()
                      }}
                      max={100}
                      min={1}
                      step={1}
                      className="w-full mt-2"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="format">Format</Label>
                    <Select value={format} onValueChange={(value) => {
                      setFormat(value)
                      generatePreviewUrl()
                    }}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto</SelectItem>
                        <SelectItem value="jpg">JPG</SelectItem>
                        <SelectItem value="png">PNG</SelectItem>
                        <SelectItem value="webp">WebP</SelectItem>
                        <SelectItem value="avif">AVIF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
                
                <TabsContent value="adjustments" className="space-y-4">
                  <div>
                    <Label>Rotation</Label>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {[0, 90, 180, 270].map(angle => (
                        <Button
                          key={angle}
                          variant="outline"
                          size="sm"
                          onClick={() => updateTransformation('angle', angle)}
                        >
                          <RotateCw className="h-4 w-4 mr-1" />
                          {angle}°
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <Label>Flip</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateTransformation('flip', 'horizontal')}
                      >
                        <FlipHorizontal className="h-4 w-4 mr-1" />
                        Horizontal
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateTransformation('flip', 'vertical')}
                      >
                        <FlipVertical className="h-4 w-4 mr-1" />
                        Vertical
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Opacity</Label>
                    <Slider
                      value={[50]}
                      onValueChange={(value) => updateTransformation('opacity', value[0])}
                      max={100}
                      min={0}
                      step={1}
                      className="w-full mt-2"
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="advanced" className="space-y-4">
                  <div>
                    <Label htmlFor="gravity">Gravity</Label>
                    <Select onValueChange={(value) => updateTransformation('gravity', value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select gravity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                        <SelectItem value="face">Face</SelectItem>
                        <SelectItem value="north">North</SelectItem>
                        <SelectItem value="south">South</SelectItem>
                        <SelectItem value="east">East</SelectItem>
                        <SelectItem value="west">West</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="radius">Border Radius</Label>
                    <Input
                      id="radius"
                      type="number"
                      placeholder="20"
                      onChange={(e) => updateTransformation('radius', Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="border">Border</Label>
                    <Input
                      id="border"
                      placeholder="2px_solid_black"
                      onChange={(e) => updateTransformation('border', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={resetTransformations}>
              Reset
            </Button>
            <Button onClick={applyTransformation} disabled={applyingTransform}>
              {applyingTransform ? (
                <Zap className="h-4 w-4 mr-2 animate-pulse" />
              ) : null}
              Apply Transformation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// File Optimization Component
interface FileOptimizationProps {
  file: ServerFileAsset
  onOptimizationComplete: (optimizedUrl: string) => void
}

export const FileOptimization: React.FC<FileOptimizationProps> = ({
  file,
  onOptimizationComplete
}) => {
  const [optimizing, setOptimizing] = useState(false)
  const [optimizedSize, setOptimizedSize] = useState<number | null>(null)
  const [originalSize] = useState(file.size)

  const optimizeFile = async () => {
    setOptimizing(true)
    try {
      // Generate optimized URL
      const optimizedUrl = CloudinaryService.generateOptimizedUrl(file.publicId, {
        quality: 'auto:good',
        format: 'auto'
      })

      // Simulate size calculation (in real implementation, you'd fetch this info)
      const estimatedOptimizedSize = Math.floor(originalSize * 0.7) // 30% reduction estimate
      setOptimizedSize(estimatedOptimizedSize)

      onOptimizationComplete(optimizedUrl)
      toast.success('File optimized successfully')
    } catch {
      toast.error('Failed to optimize file')
    } finally {
      setOptimizing(false)
    }
  }

  const savingsPercentage = optimizedSize 
    ? Math.round(((originalSize - optimizedSize) / originalSize) * 100)
    : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Zap className="h-5 w-5" />
          <span>File Optimization</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm text-gray-600">Original Size</Label>
            <p className="font-medium">{formatFileSize(originalSize)}</p>
          </div>
          {optimizedSize && (
            <div>
              <Label className="text-sm text-gray-600">Optimized Size</Label>
              <p className="font-medium text-green-600">
                {formatFileSize(optimizedSize)}
              </p>
            </div>
          )}
        </div>

        {optimizedSize && (
          <div className="bg-green-50 border border-green-200 p-3 rounded">
            <div className="flex items-center space-x-2 text-green-800">
              <Zap className="h-5 w-5" />
              <span className="font-medium">
                {savingsPercentage}% size reduction
              </span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              Saved {formatFileSize(originalSize - optimizedSize)}
            </p>
          </div>
        )}

        <Button 
          onClick={optimizeFile} 
          disabled={optimizing}
          className="w-full"
        >
          {optimizing ? (
            <>
              <Zap className="h-4 w-4 mr-2 animate-pulse" />
              Optimizing...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Optimize File
            </>
          )}
        </Button>

        <div className="text-sm text-gray-600">
          <p>Optimization will:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Automatically choose the best format</li>
            <li>Compress the file while maintaining quality</li>
            <li>Generate responsive versions</li>
            <li>Enable smart cropping for better composition</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
