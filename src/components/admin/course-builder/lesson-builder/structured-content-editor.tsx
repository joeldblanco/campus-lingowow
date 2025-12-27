'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

import { Plus, Trash2, Table } from 'lucide-react'
import { StructuredContentBlock } from '@/types/course-builder'

interface StructuredContentEditorProps {
    block: StructuredContentBlock
    onUpdate: (updates: Partial<StructuredContentBlock>) => void
}

export function StructuredContentEditor({ block, onUpdate }: StructuredContentEditorProps) {
    const content = block.content || { headers: [], rows: [] }
    const headers = content.headers || []
    const rows = content.rows || []

    // Helper to safely update content
    const updateContent = (newContent: typeof content) => {
        onUpdate({ content: newContent })
    }

    // Header handlers
    const updateHeader = (index: number, value: string) => {
        const newHeaders = [...headers]
        newHeaders[index] = value
        updateContent({ ...content, headers: newHeaders })
    }

    const addColumn = () => {
        const newHeaders = [...headers, `New Column`]
        const newRows = rows.map((row) => [...row, ''])
        updateContent({ headers: newHeaders, rows: newRows })
    }

    const removeColumn = (index: number) => {
        const newHeaders = headers.filter((_, i) => i !== index)
        const newRows = rows.map((row) => row.filter((_, i) => i !== index))
        updateContent({ headers: newHeaders, rows: newRows })
    }

    // Row handlers
    const updateCell = (rowIndex: number, colIndex: number, value: string) => {
        const newRows = [...rows]
        newRows[rowIndex] = [...newRows[rowIndex]]
        newRows[rowIndex][colIndex] = value
        updateContent({ ...content, rows: newRows })
    }

    const addRow = () => {
        const emptyRow = new Array(headers.length).fill('')
        updateContent({ ...content, rows: [...rows, emptyRow] })
    }

    const removeRow = (index: number) => {
        const newRows = rows.filter((_, i) => i !== index)
        updateContent({ ...content, rows: newRows })
    }

    const config = block.config || { hasHeaderRow: true, hasStripedRows: false, hasBorders: true }
    const hasHeaderRow = config.hasHeaderRow !== false
    const hasBorders = config.hasBorders !== false
    const hasStripedRows = config.hasStripedRows === true

    return (
        <div className="space-y-6 p-4">
            {/* Block Header - Icon + Fixed Title */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <Table className="w-5 h-5 text-primary" />
                </div>
                <span className="text-lg font-semibold text-primary">
                    Tabla
                </span>
            </div>

            {/* Read-only Title/Subtitle (Edited in Properties Panel) */}
            {(block.title || block.subtitle) && (
                <div className="space-y-1">
                    {block.title && <h3 className="text-xl font-bold">{block.title}</h3>}
                    {block.subtitle && <p className="text-muted-foreground">{block.subtitle}</p>}
                </div>
            )}

            <div className={`rounded-md overflow-x-auto bg-card ${hasBorders ? 'border' : ''}`}>
                <table className={`w-full text-sm border-collapse`}>
                    <thead>
                        {/* System Control Row (Always Visible) */}
                        <tr className="bg-muted/50 border-b">
                            {headers.map((_, i) => (
                                <th key={`sys-col-${i}`} className={`p-2 w-[150px] min-w-[150px] text-center border-r last:border-r-0`}>
                                    <div className="flex items-center justify-between gap-2 px-2">
                                        <span className="text-[10px] uppercase text-muted-foreground font-medium tracking-wider">
                                            Col {i + 1}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => removeColumn(i)}
                                            title="Eliminar columna"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </th>
                            ))}
                            {/* Top-Right Corner (Add Column) */}
                            <th className="p-2 w-[50px] min-w-[50px] text-center bg-muted/80">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 hover:bg-primary/10 hover:text-primary"
                                    onClick={addColumn}
                                    title="Añadir columna"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </th>
                        </tr>

                        {/* Data Header Row */}
                        {hasHeaderRow && (
                            <tr>
                                {headers.map((header, i) => (
                                    <th key={`h-${i}`} className={`p-2 w-[150px] min-w-[150px] relative group align-top bg-card ${hasBorders ? 'border' : ''}`}>
                                        <Input
                                            value={header}
                                            onChange={(e) => updateHeader(i, e.target.value)}
                                            onPointerDown={(e) => e.stopPropagation()}
                                            onKeyDown={(e) => e.stopPropagation()}
                                            className="h-8 text-xs font-semibold text-center bg-transparent border-transparent hover:border-input focus:border-ring"
                                            placeholder={`Encabezado ${i + 1}`}
                                        />
                                    </th>
                                ))}
                                {/* Spacer for Row Controls Column */}
                                <th className={`p-2 w-[50px] min-w-[50px] bg-muted/20 ${hasBorders ? 'border-l' : ''}`}></th>
                            </tr>
                        )}
                    </thead>
                    <tbody>
                        {rows.map((row, rowIndex) => (
                            <tr key={`r-${rowIndex}`} className={`group ${hasStripedRows && rowIndex % 2 === 1 ? 'bg-muted/20' : ''}`}>
                                {row.map((cell, colIndex) => (
                                    <td key={`c-${rowIndex}-${colIndex}`} className={`p-2 w-[150px] min-w-[150px] ${hasBorders ? 'border' : 'border-b border-transparent'}`}>
                                        <Textarea
                                            value={cell}
                                            onChange={(e) => {
                                                updateCell(rowIndex, colIndex, e.target.value)
                                            }}
                                            onPointerDown={(e) => e.stopPropagation()}
                                            onKeyDown={(e) => e.stopPropagation()}
                                            className="min-h-[40px] w-full min-w-[150px] text-sm border-transparent hover:border-input focus:border-ring bg-transparent px-2 resize-none overflow-hidden"
                                            placeholder="..."
                                            rows={1}
                                            onInput={(e) => {
                                                const target = e.target as HTMLTextAreaElement;
                                                target.style.height = 'auto';
                                                target.style.height = `${target.scrollHeight}px`;
                                            }}
                                        />
                                    </td>
                                ))}
                                {/* Row Control Gutter (Right Side) */}
                                <td className={`p-2 w-[50px] min-w-[50px] text-center bg-muted/20 ${hasBorders ? 'border-l' : ''}`}>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => removeRow(rowIndex)}
                                        title="Eliminar fila"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Button variant="outline" size="sm" onClick={addRow} className="w-full border-dashed">
                <Plus className="h-4 w-4 mr-2" /> Añadir Fila
            </Button>
        </div>
    )
}
