'use client'

import React, { useRef, useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  Pencil,
  Eraser,
  Type,
  Square,
  Circle,
  Minus,
  Undo2,
  Redo2,
  Trash2,
  Save,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { saveWhiteboardData, getWhiteboardData } from '@/lib/actions/classroom-whiteboard'
import { toast } from 'sonner'

type Tool = 'pencil' | 'eraser' | 'text' | 'rectangle' | 'circle' | 'line'

interface Point {
  x: number
  y: number
}

interface DrawAction {
  id: string
  tool: Tool
  color: string
  lineWidth: number
  points: Point[]
  text?: string
}

const COLORS = [
  '#000000',
  '#EF4444',
  '#3B82F6',
  '#22C55E',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#FFFFFF',
]

interface WhiteboardProps {
  bookingId?: string
}

export function Whiteboard({ bookingId }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const textInputRef = useRef<HTMLInputElement>(null)

  const [isDrawing, setIsDrawing] = useState(false)
  const [tool, setTool] = useState<Tool>('pencil')
  const [color, setColor] = useState('#000000')
  const [lineWidth, setLineWidth] = useState(3)
  const [actions, setActions] = useState<DrawAction[]>([])
  const [currentAction, setCurrentAction] = useState<DrawAction | null>(null)
  const [undoneActions, setUndoneActions] = useState<DrawAction[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [textInput, setTextInput] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  })
  const [textValue, setTextValue] = useState('')

  // Load saved whiteboard data
  useEffect(() => {
    const loadData = async () => {
      if (!bookingId) {
        setIsLoading(false)
        return
      }
      try {
        const data = await getWhiteboardData(bookingId)
        if (data && data.length > 0) {
          setActions(data.map((a, i) => ({ ...a, id: `loaded-${i}` })) as DrawAction[])
        }
      } catch (error) {
        console.error('Error loading whiteboard:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [bookingId])

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
      redrawCanvas()
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [])

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    actions.forEach((action) => drawAction(ctx, action))
    if (currentAction) drawAction(ctx, currentAction)
  }, [actions, currentAction])

  useEffect(() => {
    redrawCanvas()
  }, [redrawCanvas])

  const drawAction = (ctx: CanvasRenderingContext2D, action: DrawAction) => {
    ctx.strokeStyle = action.tool === 'eraser' ? '#FFFFFF' : action.color
    ctx.fillStyle = action.color
    ctx.lineWidth = action.tool === 'eraser' ? 20 : action.lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (action.tool === 'pencil' || action.tool === 'eraser') {
      if (action.points.length < 2) return
      ctx.beginPath()
      ctx.moveTo(action.points[0].x, action.points[0].y)
      action.points.forEach((point, i) => {
        if (i > 0) ctx.lineTo(point.x, point.y)
      })
      ctx.stroke()
    } else if (action.tool === 'line' && action.points.length >= 2) {
      ctx.beginPath()
      ctx.moveTo(action.points[0].x, action.points[0].y)
      ctx.lineTo(
        action.points[action.points.length - 1].x,
        action.points[action.points.length - 1].y
      )
      ctx.stroke()
    } else if (action.tool === 'rectangle' && action.points.length >= 2) {
      const start = action.points[0]
      const end = action.points[action.points.length - 1]
      ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y)
    } else if (action.tool === 'circle' && action.points.length >= 2) {
      const start = action.points[0]
      const end = action.points[action.points.length - 1]
      const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2))
      ctx.beginPath()
      ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI)
      ctx.stroke()
    } else if (action.tool === 'text' && action.text && action.points.length > 0) {
      ctx.font = `${Math.max(16, action.lineWidth * 5)}px Arial, sans-serif`
      ctx.fillText(action.text, action.points[0].x, action.points[0].y)
    }
  }

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(e)

    if (tool === 'text') {
      setTextInput({ x: point.x, y: point.y, visible: true })
      setTextValue('')
      setTimeout(() => textInputRef.current?.focus(), 0)
      return
    }

    setIsDrawing(true)
    setCurrentAction({
      id: `action-${Date.now()}`,
      tool,
      color,
      lineWidth,
      points: [point],
    })
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentAction) return
    const point = getCanvasPoint(e)

    setCurrentAction((prev) => {
      if (!prev) return null
      return { ...prev, points: [...prev.points, point] }
    })
  }

  const handleMouseUp = () => {
    if (currentAction && currentAction.points.length > 1) {
      setActions((prev) => [...prev, currentAction])
      setUndoneActions([])
    }
    setIsDrawing(false)
    setCurrentAction(null)
  }

  const handleTextSubmit = () => {
    if (textValue.trim() && textInput.visible) {
      const newAction: DrawAction = {
        id: `action-${Date.now()}`,
        tool: 'text',
        color,
        lineWidth,
        points: [{ x: textInput.x, y: textInput.y }],
        text: textValue,
      }
      setActions((prev) => [...prev, newAction])
      setUndoneActions([])
    }
    setTextInput({ x: 0, y: 0, visible: false })
    setTextValue('')
  }

  const handleUndo = () => {
    if (actions.length === 0) return
    const lastAction = actions[actions.length - 1]
    setActions((prev) => prev.slice(0, -1))
    setUndoneActions((prev) => [...prev, lastAction])
  }

  const handleRedo = () => {
    if (undoneActions.length === 0) return
    const lastUndone = undoneActions[undoneActions.length - 1]
    setUndoneActions((prev) => prev.slice(0, -1))
    setActions((prev) => [...prev, lastUndone])
  }

  const handleClear = () => {
    setActions([])
    setUndoneActions([])
  }

  const handleSave = async () => {
    if (!bookingId) {
      toast.error('No se puede guardar sin ID de clase')
      return
    }
    setIsSaving(true)
    try {
      const result = await saveWhiteboardData(bookingId, actions)
      if (result.success) {
        toast.success('Pizarra guardada')
      } else {
        toast.error(result.error || 'Error al guardar')
      }
    } catch (error) {
      console.error(error)
      toast.error('Error al guardar pizarra')
    } finally {
      setIsSaving(false)
    }
  }

  const tools: { id: Tool; icon: React.ReactNode; label: string }[] = [
    { id: 'pencil', icon: <Pencil className="w-4 h-4" />, label: 'Lápiz' },
    { id: 'eraser', icon: <Eraser className="w-4 h-4" />, label: 'Borrador' },
    { id: 'line', icon: <Minus className="w-4 h-4" />, label: 'Línea' },
    { id: 'rectangle', icon: <Square className="w-4 h-4" />, label: 'Rectángulo' },
    { id: 'circle', icon: <Circle className="w-4 h-4" />, label: 'Círculo' },
    { id: 'text', icon: <Type className="w-4 h-4" />, label: 'Texto' },
  ]

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-white rounded-xl">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white rounded-xl overflow-hidden border">
      {/* Toolbar */}
      <div className="flex-none border-b bg-gray-50 p-2 flex items-center gap-2 flex-wrap">
        {/* Tools */}
        <div className="flex items-center gap-1 border-r pr-2">
          {tools.map((t) => (
            <Button
              key={t.id}
              variant={tool === t.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTool(t.id)}
              title={t.label}
              className="h-8 w-8 p-0"
            >
              {t.icon}
            </Button>
          ))}
        </div>

        {/* Colors */}
        <div className="flex items-center gap-1 border-r pr-2">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={cn(
                'w-6 h-6 rounded-full border-2 transition-transform',
                color === c ? 'border-blue-500 scale-110 ring-2 ring-blue-300' : 'border-gray-300',
                c === '#FFFFFF' && 'border-gray-400'
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        {/* Line Width */}
        <div className="flex items-center gap-2 border-r pr-2 min-w-[100px]">
          <span className="text-xs text-gray-500">Grosor:</span>
          <Slider
            value={[lineWidth]}
            onValueChange={([v]) => setLineWidth(v)}
            min={1}
            max={20}
            step={1}
            className="w-16"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={actions.length === 0}
            title="Deshacer"
            className="h-8 w-8 p-0"
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRedo}
            disabled={undoneActions.length === 0}
            title="Rehacer"
            className="h-8 w-8 p-0"
          >
            <Redo2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            title="Limpiar"
            className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Save */}
        {bookingId && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="ml-auto gap-1"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar
          </Button>
        )}
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 overflow-hidden cursor-crosshair relative">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="w-full h-full"
        />

        {/* Text Input Overlay */}
        {textInput.visible && (
          <input
            ref={textInputRef}
            type="text"
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onBlur={handleTextSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
            className="absolute bg-transparent border-b-2 border-blue-500 outline-none text-lg px-1"
            style={{ left: textInput.x, top: textInput.y - 20, color, minWidth: '100px' }}
            placeholder="Escribe aquí..."
          />
        )}
      </div>
    </div>
  )
}
